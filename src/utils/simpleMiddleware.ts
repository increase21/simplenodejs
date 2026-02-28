import { HttpMethod, RequestObject, ResponseObject } from "../typings/general";
import { SimpleJSBodyParseType, SimpleJSRateLimitType } from "../typings/simpletypes";
import { throwHttpError } from "./helpers";

// ─── CORS ────────────────────────────────────────────────────────────────────
export function SetCORS(opts?: {
  origin?: string;
  methods?: string;
  headers?: string;
  credentials?: boolean;
}) {
  return async (req: RequestObject, res: ResponseObject, next: any) => {
    if (opts?.credentials) {
      const reqOrigin = req.headers.origin;
      if (!reqOrigin) throwHttpError(403, "CORS Error: Origin header is required when credentials are enabled");
      if (opts.origin && reqOrigin !== opts.origin) throwHttpError(403, "CORS Error: Origin not allowed");
      res.setHeader("Access-Control-Allow-Origin", reqOrigin!);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      res.setHeader("Access-Control-Allow-Origin", opts?.origin || "*");
    }
    res.setHeader("Access-Control-Allow-Headers", opts?.headers || "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.setHeader("Access-Control-Allow-Methods", opts?.methods || "GET, POST, DELETE, PUT, PATCH");

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    await next();
  };
}

// ─── HSTS ─────────────────────────────────────────────────────────────────────
// Only meaningful on HTTPS. Browsers ignore this header over plain HTTP.
export function SetHSTS(opts?: { maxAge?: number; includeSubDomains?: boolean; preload?: boolean }) {
  let value = `max-age=${opts?.maxAge ?? 31536000}`;
  if (opts?.includeSubDomains !== false) value += "; includeSubDomains";
  if (opts?.preload) value += "; preload";
  return async (_req: RequestObject, res: ResponseObject, next: any) => {
    res.setHeader("Strict-Transport-Security", value);
    await next();
  };
}

// ─── Content Security Policy ──────────────────────────────────────────────────
export function SetCSP(policy = "default-src 'none'") {
  return async (_req: RequestObject, res: ResponseObject, next: any) => {
    res.setHeader("Content-Security-Policy", policy);
    await next();
  };
}

// ─── X-Frame-Options (clickjacking) ──────────────────────────────────────────
export function SetFrameGuard(action: "DENY" | "SAMEORIGIN" = "DENY") {
  return async (_req: RequestObject, res: ResponseObject, next: any) => {
    res.setHeader("X-Frame-Options", action);
    await next();
  };
}

// ─── X-Content-Type-Options (MIME sniffing) ───────────────────────────────────
export function SetNoSniff() {
  return async (_req: RequestObject, res: ResponseObject, next: any) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    await next();
  };
}

// ─── Referrer-Policy ──────────────────────────────────────────────────────────
export function SetReferrerPolicy(policy = "no-referrer") {
  return async (_req: RequestObject, res: ResponseObject, next: any) => {
    res.setHeader("Referrer-Policy", policy);
    await next();
  };
}

// ─── Permissions-Policy (browser feature control) ────────────────────────────
export function SetPermissionsPolicy(policy = "camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()") {
  return async (_req: RequestObject, res: ResponseObject, next: any) => {
    res.setHeader("Permissions-Policy", policy);
    await next();
  };
}

// ─── Cross-Origin-Embedder-Policy ────────────────────────────────────────────
export function SetCOEP(value = "require-corp") {
  return async (_req: RequestObject, res: ResponseObject, next: any) => {
    res.setHeader("Cross-Origin-Embedder-Policy", value);
    await next();
  };
}

// ─── Cross-Origin-Opener-Policy ──────────────────────────────────────────────
export function SetCOOP(value = "same-origin") {
  return async (_req: RequestObject, res: ResponseObject, next: any) => {
    res.setHeader("Cross-Origin-Opener-Policy", value);
    await next();
  };
}

// ─── Helmet (security headers bundle, excludes CORS) ─────────────────────────
export function SetHelmet(opts?: {
  hsts?: false | { maxAge?: number; includeSubDomains?: boolean; preload?: boolean };
  csp?: false | string;
  frameGuard?: false | "DENY" | "SAMEORIGIN";
  noSniff?: false;
  referrerPolicy?: false | string;
  permissionsPolicy?: false | string;
  coep?: false | string;
  coop?: false | string;
}) {
  return async (_req: RequestObject, res: ResponseObject, next: any) => {
    if (opts?.noSniff !== false)
      res.setHeader("X-Content-Type-Options", "nosniff");

    if (opts?.frameGuard !== false)
      res.setHeader("X-Frame-Options", typeof opts?.frameGuard === "string" ? opts.frameGuard : "DENY");

    if (opts?.referrerPolicy !== false)
      res.setHeader("Referrer-Policy", typeof opts?.referrerPolicy === "string" ? opts.referrerPolicy : "no-referrer");

    if (opts?.csp !== false)
      res.setHeader("Content-Security-Policy", typeof opts?.csp === "string" ? opts.csp : "default-src 'none'");

    if (opts?.hsts !== false) {
      const hsts = (opts?.hsts && typeof opts.hsts === "object") ? opts.hsts : {};
      let hstsValue = `max-age=${hsts.maxAge ?? 31536000}`;
      if (hsts.includeSubDomains !== false) hstsValue += "; includeSubDomains";
      if (hsts.preload) hstsValue += "; preload";
      res.setHeader("Strict-Transport-Security", hstsValue);
    }

    if (opts?.permissionsPolicy !== false)
      res.setHeader("Permissions-Policy", typeof opts?.permissionsPolicy === "string" ? opts.permissionsPolicy : "camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()");

    if (opts?.coep !== false)
      res.setHeader("Cross-Origin-Embedder-Policy", typeof opts?.coep === "string" ? opts.coep : "require-corp");

    if (opts?.coop !== false)
      res.setHeader("Cross-Origin-Opener-Policy", typeof opts?.coop === "string" ? opts.coop : "same-origin");

    await next();
  };
}

// ─── Rate Limiter ─────────────────────────────────────────────────────────────
const RATE_LIMIT_MAX_STORE = 100_000;

export function SetRateLimiter(opts: SimpleJSRateLimitType) {
  const store = new Map<string, { count: number; ts: number }>();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store) {
      if (now - v.ts > opts.windowMs) store.delete(k);
    }
  }, opts.windowMs);

  timer.unref();

  return async (req: RequestObject, res: ResponseObject, next: () => Promise<any> | void) => {
    const ip = opts.trustProxy
      ? (Array.isArray(req.headers["x-forwarded-for"])
        ? req.headers["x-forwarded-for"][0]
        : String(req.headers["x-forwarded-for"] || "").split(",")[0].trim()) || req.socket.remoteAddress || "unknown"
      : req.socket.remoteAddress || "unknown";

    const key = String(opts.keyGenerator?.(req) || ip || "unknown");
    const now = Date.now();

    const entry = store.get(key as string) || { count: 0, ts: now };
    if (now - entry.ts > opts.windowMs) {
      entry.count = 0;
      entry.ts = now;
    }

    entry.count++;
    if (!store.has(key) && store.size >= RATE_LIMIT_MAX_STORE) {
      store.delete(store.keys().next().value!); // evict oldest entry
    }
    store.set(key as string, entry);

    if (entry.count > opts.max) {
      res.setHeader("Retry-After", Math.ceil(opts.windowMs / 1000));
      if (!res.writableEnded) throwHttpError(429, "Too Many Requests");
      return;
    }

    await next();
  };
}

// ─── Body Parser ──────────────────────────────────────────────────────────────
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

export function SetBodyParser(opts: SimpleJSBodyParseType) {
  const maxSize = SetBodyLimit(opts.limit);

  return (req: RequestObject, res: ResponseObject, next: () => Promise<any> | void) => new Promise<void>((resolve, reject) => {
    const contentType = req.headers["content-type"] || "";

    const shouldIgnoreStream = (() => {
      if (!opts.ignoreStream) return false;
      if (typeof opts.ignoreStream === "function") return opts.ignoreStream(req);
      const url = req.url || "";
      const method = ((req.method || "").toLowerCase() as HttpMethod);
      return opts.ignoreStream.some(p => (url === p.url || url.startsWith(p.url)) && method === p.method);
    })();

    // For simplicity, we only parse JSON and plain text. Multipart/form-data and other types are ignored.
    if (shouldIgnoreStream) return resolve(next());

    let size = 0;
    let body = "";

    req.on("data", chunk => {
      size += chunk.length;
      if (maxSize && size > maxSize) {
        reject({ code: 413, error: "Payload Too Large" });
        if (!res.writableEnded) res.status(413).end("Payload Too Large");
        req.destroy();
        req.socket.destroy();
        return;
      }
      body += chunk;
    });

    req.on("end", () => {
      if (res.writableEnded) return resolve();
      try {
        if (body && contentType.includes("application/json")) {
          req.body = JSON.parse(body);
        } else {
          req.body = body;
        }
        resolve(next());
      } catch (e) {
        reject({ code: 400, error: "Invalid Payload" });
        if (!res.writableEnded) res.status(400).end("Invalid Payload");
      }
    });

    req.on("error", () => {
      reject({ code: 400, error: "Request stream ended" });
      if (!res.writableEnded) res.status(400).end("Request stream ended");
    });
  });
}
