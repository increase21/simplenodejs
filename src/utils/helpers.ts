import { RequestObject, ResponseObject } from "../typings/context";
import qs from "node:querystring"
import { ErrorMiddleware, Middleware, SimpleJsServer } from "../typings/general";
// core/cors.ts
export function SetRequestCORS(opts: { name: string, value: string }[]) {
  return async (req: RequestObject, res: ResponseObject, next: any) => {
    const defaults = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization",
      "Access-Control-Allow-Methods": "GET, POST"
    };

    let merged: Record<string, string> = { ...defaults };

    for (const { name, value } of opts) {
      merged[name] = value; // overrides defaults if same key
    }
    //allow credentials only when origin specified
    if (merged["Access-Control-Allow-Credentials"] === "true") {
      merged["Access-Control-Allow-Origin"] = req.headers.origin || "null";
    }

    for (const [key, value] of Object.entries(merged)) {
      res.setHeader(key, value);
    }

    if (req.method === "OPTIONS") {
      res.status(204).text()
      return
    }

    await next();
  };
}

// core/rateLimit.ts
export function SetRateLimiter(opts: { windowMs: number; max: number; keyGenerator?: (req: any) => string }) {
  const store = new Map<string, { count: number; ts: number }>();

  return async (req: RequestObject, res: ResponseObject, next: () => Promise<any> | void) => {
    const key = opts.keyGenerator?.(req) || req.socket.remoteAddress || "global";
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const now = Date.now();

    const entry = store.get(key) || { count: 0, ts: now };
    if (now - entry.ts > opts.windowMs) {
      entry.count = 0;
      entry.ts = now;
    }

    entry.count++;
    store.set(key, entry);

    if (entry.count > opts.max) {
      res.status(429).json({ error: "Too Many Requests" });
      return
    }

    setInterval(() => {
      const now = Date.now();
      for (const [k, v] of store) {
        if (now - v.ts > opts.windowMs * 2) store.delete(k);
      }
    }, opts.windowMs);

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

export function SetBodyParser(opts: { limit?: string | number; json?: boolean }) {
  const maxSize = SetBodyLimit(opts.limit);

  return async (req: RequestObject, res: ResponseObject, next: () => Promise<any> | void) => {
    return new Promise<void>(resolve => {
      let size = 0;
      let body = "";
      req.on("data", chunk => {
        size += chunk.length;
        if (maxSize && size > maxSize) {
          if (!res.writableEnded) {
            res.status(413).json({ error: "Payload too large" });
          }
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
          if (body && !["application/text", "application/media"].includes(req.headers.accept as string)) {
            req.body = JSON.parse(body)
            //parse query
            if (req.query) {
              req.query = JSON.parse(JSON.stringify(qs.parse(req.query)))
            }
          } else {
            req.body = body;
          }
          resolve(next());
        } catch (e) {
          res.status(400).json({ error: "Invalid request body" })
          return resolve();
        }
      });

      req.on("error", () => {
        if (!res.writableEnded) {
          res.status(400).json({ error: "Request stream error" });
        }
        resolve();
      });

    })
  };
}

export function composeWithError(
  middlewares: Middleware[],
  errorMiddlewares: ErrorMiddleware[]
) {
  return async function (req: RequestObject, res: ResponseObject) {
    let idx = -1;

    async function dispatch(i: number): Promise<void> {
      if (i <= idx) throw new Error("next() called twice");
      idx = i;
      const fn = middlewares[i];
      if (!fn) return;

      try {
        await fn(req, res, () => dispatch(i + 1));
      } catch (err) {
        await dispatchError(err, 0);
      }
    }

    async function dispatchError(err: any, i: number): Promise<void> {
      const fn = errorMiddlewares[i];
      if (!fn) {
        if (!res.writableEnded) {
          res.status(500).json({ error: "Unhandled error", detail: String(err) });
        }
        return;
      }

      await fn(err, req, res, () => dispatchError(err, i + 1));
    }

    await dispatch(0);
  };
}

export function SecurityPlugin(app: SimpleJsServer, opts: any) {
  app.use(SetRequestCORS(opts.cors || []));
  app.use(SetRateLimiter(opts.rateLimit || { windowMs: 1000, max: 100 }));
  app.use(SetBodyParser(opts.body || { limit: "1mb" }));
}