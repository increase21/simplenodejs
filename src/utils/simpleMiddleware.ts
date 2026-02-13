import { RequestObject, ResponseObject } from "../typings/general";
import qs from "node:querystring"
import { SimpleJSBodyParseType, SimpleJSRateLimitType } from "../typings/simpletypes";
import { throwHttpError } from "./helpers";

// core/cors.ts
export function SetRequestCORS(opts: { name: string, value: string }[]) {
  return async (req: RequestObject, res: ResponseObject, next: any) => {
    const defaults = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, PUT, PATCH",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'none'",
    };

    let merged: Record<string, string> = { ...defaults };

    for (const { name, value } of opts) {
      merged[name] = value; // overrides defaults if same key
    }

    //allow credentials only when origin specified
    if (merged["Access-Control-Allow-Credentials"] === "true") {
      const origin = req.headers.origin;
      if (!origin) {
        throwHttpError(403, "CORS Error: Origin header is required when Access-Control-Allow-Credentials is true");
        return
      }
      merged["Access-Control-Allow-Origin"] = origin;
    }

    for (const [key, value] of Object.entries(merged)) {
      res.setHeader(key, value);
    }

    if (req.method === "OPTIONS") {
      res.status(204).end()
      return
    }

    await next();
  };
}

// core/rateLimit.ts
export function SetRateLimiter(opts: SimpleJSRateLimitType) {
  const store = new Map<string, { count: number; ts: number }>();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store) {
      if (now - v.ts > opts.windowMs * 2) store.delete(k);
    }
  }, opts.windowMs);

  timer.unref();

  return async (req: RequestObject, res: ResponseObject, next: () => Promise<any> | void) => {
    const rawIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
    const ip = Array.isArray(rawIp) ? rawIp[0] : String(rawIp).split(",")[0].trim();
    const key = String(opts.keyGenerator?.(req) || ip || "unknown");
    const now = Date.now();

    const entry = store.get(key as string) || { count: 0, ts: now };
    if (now - entry.ts > opts.windowMs) {
      entry.count = 0;
      entry.ts = now;
    }

    entry.count++;
    store.set(key as string, entry);

    if (entry.count > opts.max) {
      res.setHeader("Retry-After", Math.ceil(opts.windowMs / 1000));
      if (!res.writableEnded) throwHttpError(429, "Too Many Requests");
      return
    }

    await next();
  };
}

// core/body.ts
function SetBodyLimit(limit: string | number = "1mb") {
  if (typeof limit === "number") return limit;
  const match = /^(\d+)(kb|mb)?$/i.exec(limit);
  if (!match) return 1024 * 1024;
  const n = parseInt(match[1], 10);
  const unit = match[2]?.toLowerCase();
  if (unit === "kb") return n * 1024;
  if (unit === "mb") return n * 1024 * 1024;
  return n;
}

//For 
export function SetBodyParser(opts: SimpleJSBodyParseType) {
  const maxSize = SetBodyLimit(opts.limit);

  return (req: RequestObject, res: ResponseObject, next: () => Promise<any> | void) => new Promise<void>((resolve, reject) => {
    //get the content type of the request
    const contentType = req.headers["content-type"] || "";

    // Skip multipart/form-data (file uploads)
    if (contentType.includes("multipart/form-data")) return resolve(next());

    let size = 0;
    let body = "";
    req.on("data", chunk => {
      size += chunk.length;
      if (maxSize && size > maxSize) {
        reject({ code: 413, error: "Payload Too Large" });
        if (!res.writableEnded) res.status(413).end("Payload Too Large");
        req.destroy()
        req.socket.destroy();
        return;
      }
      //add the body
      body += chunk;
    });

    req.on("end", () => {
      if (res.writableEnded) return resolve();
      try {
        if (body && contentType.includes("application/json")) {
          req.body = JSON.parse(body)
        } else {
          req.body = body;
        }
        //parse query
        if (req.query) {
          req.query = JSON.parse(JSON.stringify(qs.parse(req.query)))
        }
        resolve(next());
      } catch (e) {
        if (!res.writableEnded) reject({ code: 400, error: "Invalid request body" });
      }
    });

    req.on("error", () => {
      if (!res.writableEnded) reject({ code: 400, error: "Request stream error" });
    });

  })
};
