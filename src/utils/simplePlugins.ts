import crypto from "node:crypto";
import net from "node:net";
import { RequestObject, ResponseObject, SimpleJsServer } from "../typings/general";
import { SimpleJSRateLimitType } from "../typings/simpletypes";
import { throwHttpError } from "./helpers";
import { SetCORS, SetHelmet, SetRateLimiter } from "./simpleMiddleware";

// ─── IP normalization ─────────────────────────────────────────────────────────
// Converts IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1) to plain IPv4.
function normalizeIP(raw: string): string {
  const stripped = raw.replace(/^::ffff:/i, "");
  return net.isIPv4(stripped) ? stripped : raw;
}

// ─── Security Plugin ──────────────────────────────────────────────────────────
export function SimpleJsSecurityPlugin(app: SimpleJsServer, opts: {
  cors?: Parameters<typeof SetCORS>[0];
  helmet?: true | Parameters<typeof SetHelmet>[0];
  rateLimit?: SimpleJSRateLimitType;
}) {
  if (opts.cors) app.use(SetCORS(opts.cors));
  if (opts.helmet) app.use(SetHelmet(opts.helmet === true ? undefined : opts.helmet));
  if (opts.rateLimit) app.use(SetRateLimiter(opts.rateLimit));
}

// ─── IP Whitelist / Blacklist Plugin ──────────────────────────────────────────
/**
 * Restricts access based on client IP.
 * mode "allow" = only listed IPs can access (whitelist).
 * mode "deny"  = listed IPs are blocked (blacklist).
 */
export function SimpleJsIPWhitelistPlugin(app: SimpleJsServer, opts: {
  ips: string[];
  mode?: "allow" | "deny";
  trustProxy?: boolean;
}) {
  const mode = opts.mode || "allow";
  const ipSet = new Set(opts.ips);

  app.use(async (req: RequestObject, _res: ResponseObject, next: any) => {
    const raw = opts.trustProxy
      ? (Array.isArray(req.headers["x-forwarded-for"])
        ? req.headers["x-forwarded-for"][0]
        : String(req.headers["x-forwarded-for"] || "").split(",")[0].trim()) || req.socket.remoteAddress || ""
      : req.socket.remoteAddress || "";

    const ip = normalizeIP(raw);

    const inList = ipSet.has(ip);
    if (mode === "allow" && !inList) throwHttpError(403, "Access denied");
    if (mode === "deny" && inList) throwHttpError(403, "Access denied");

    await next();
  });
}

// ─── Cookie Plugin ────────────────────────────────────────────────────────────
function parseCookieHeader(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      result[key] = decodeURIComponent(val);
    } catch {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Creates a signed cookie value. Use this when setting a cookie in a response.
 * The client sends it back as-is; SimpleJsCookiePlugin will verify and strip the signature.
 */
export function SignCookie(value: string, secret: string): string {
  const sig = crypto.createHmac("sha256", secret).update(value).digest("base64url");
  return `s:${value}.${sig}`;
}

/**
 * Parses the Cookie header on every request.
 * Cookies are available at `this._custom_data[dataKey]` inside controllers.
 * If a secret is provided, signed cookies (prefixed "s:") are verified and unsigned.
 * Cookies with invalid signatures are silently dropped.
 */
export function SimpleJsCookiePlugin(app: SimpleJsServer, opts?: {
  secret?: string;
  /** Key used to attach cookies on _custom_data. Default: "cookies" */
  dataKey?: string;
}) {
  const dataKey = opts?.dataKey || "cookies";

  app.use(async (req: RequestObject, _res: ResponseObject, next: any) => {
    const raw = parseCookieHeader(req.headers.cookie || "");

    if (opts?.secret) {
      const verified: Record<string, string> = {};
      for (const [k, v] of Object.entries(raw)) {
        if (v.startsWith("s:")) {
          const inner = v.slice(2);
          const dotIdx = inner.lastIndexOf(".");
          if (dotIdx < 0) continue; // malformed signed cookie — drop

          const val = inner.slice(0, dotIdx);
          const sig = inner.slice(dotIdx + 1);
          const expected = crypto.createHmac("sha256", opts.secret).update(val).digest("base64url");

          const sigBuf = Buffer.from(sig, "base64url");
          const expectedBuf = Buffer.from(expected, "base64url");

          if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
            verified[k] = val; // valid — attach unsigned value
          }
          // invalid signature — silently dropped
        } else {
          verified[k] = v; // unsigned cookie — pass through
        }
      }
      req._custom_data = { ...(req._custom_data || {}), [dataKey]: verified };
    } else {
      req._custom_data = { ...(req._custom_data || {}), [dataKey]: raw };
    }

    await next();
  });
}

// ─── Request Logger Plugin ────────────────────────────────────────────────────
/**
 * Logs every request after it completes, including method, URL, status code, and duration.
 */
export function SimpleJsRequestLoggerPlugin(app: SimpleJsServer, opts?: {
  /** Custom log function. Defaults to console.log. */
  logger?: (message: string) => void;
  format?: "simple" | "json";
}) {
  const log = opts?.logger || console.log;
  const format = opts?.format || "simple";

  app.use(async (req: RequestObject, res: ResponseObject, next: any) => {
    const start = Date.now();
    const method = req.method || "?";
    const url = req.url || "/";
    const path = url.split("?")[0]; // omit query string to avoid logging sensitive params

    res.on("finish", () => {
      const ms = Date.now() - start;
      const status = res.statusCode;

      if (format === "json") {
        log(JSON.stringify({ time: new Date().toISOString(), method, path, status, ms, id: req.id }));
      } else {
        log(`[${new Date().toISOString()}] ${method} ${path} ${status} ${ms}ms`);
      }
    });

    await next();
  });
}

// ─── Request Timeout Plugin ───────────────────────────────────────────────────
/**
 * Automatically closes requests that exceed the configured time limit.
 */
export function SimpleJsTimeoutPlugin(app: SimpleJsServer, opts: {
  /** Timeout in milliseconds */
  ms: number;
  message?: string;
}) {
  app.use(async (req: RequestObject, res: ResponseObject, next: any) => {
    const timer = setTimeout(() => {
      if (!res.writableEnded) {
        res.statusCode = 408;
        res.end(opts.message || "Request timeout");
        req.socket.destroy();
      }
    }, opts.ms);

    res.on("finish", () => clearTimeout(timer));
    res.on("close", () => clearTimeout(timer));

    await next();
  });
}

// ─── Cache Control Plugin ─────────────────────────────────────────────────────
/**
 * Sets Cache-Control response headers on every request.
 */
export function SimpleJsCachePlugin(app: SimpleJsServer, opts: {
  /** Max age in seconds for public caching */
  maxAge?: number;
  /** Mark response as private (user-specific, not shared caches) */
  private?: boolean;
  /** Disable all caching entirely */
  noStore?: boolean;
}) {
  let directive: string;

  if (opts.noStore) {
    directive = "no-store";
  } else if (opts.private) {
    directive = `private, max-age=${opts.maxAge ?? 0}`;
  } else {
    directive = `public, max-age=${opts.maxAge ?? 0}`;
  }

  app.use(async (_req: RequestObject, res: ResponseObject, next: any) => {
    res.setHeader("Cache-Control", directive);
    await next();
  });
}

// ─── Maintenance Mode Plugin ──────────────────────────────────────────────────
/**
 * Returns 503 for all requests when maintenance mode is enabled.
 * Optionally allow specific IPs to bypass (e.g. for internal testing).
 */
export function SimpleJsMaintenanceModePlugin(app: SimpleJsServer, opts: {
  enabled: boolean;
  message?: string;
  /** IPs that bypass maintenance mode (e.g. your office/server IP) */
  allowIPs?: string[];
  trustProxy?: boolean;
}) {
  app.use(async (req: RequestObject, res: ResponseObject, next: any) => {
    if (!opts.enabled) return next();

    const raw = opts.trustProxy
      ? (Array.isArray(req.headers["x-forwarded-for"])
        ? req.headers["x-forwarded-for"][0]
        : String(req.headers["x-forwarded-for"] || "").split(",")[0].trim()) || req.socket.remoteAddress || ""
      : req.socket.remoteAddress || "";

    const ip = normalizeIP(raw);

    if (opts.allowIPs?.includes(ip)) return next();

    res.setHeader("Retry-After", "3600");
    throwHttpError(503, opts.message || "Service is under maintenance. Please try again later.");
  });
}
