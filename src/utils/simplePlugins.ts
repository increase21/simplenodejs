import crypto from "node:crypto";
import { SimpleJsRequestObject, SimpleJsResponseObject } from "../typings/general";
import { SimpleJSRateLimitType, SimpleJsServer } from "../typings/simpletypes";
import { clientIp, httpError, throwHttpError } from "./helpers";
import { SimpleJsSetCORS, SimpleJsSetHelmet, SimpleJsSetRateLimiter } from "./simpleMiddleware";

// ─── Security Plugin ──────────────────────────────────────────────────────────
export function SimpleJsSecurityPlugin(app: SimpleJsServer, opts: {
  cors?: Parameters<typeof SimpleJsSetCORS>[0];
  helmet?: true | Parameters<typeof SimpleJsSetHelmet>[0];
  rateLimit?: SimpleJSRateLimitType;
}) {
  if (opts.cors) app.use(SimpleJsSetCORS(opts.cors));
  if (opts.helmet) app.use(SimpleJsSetHelmet(opts.helmet === true ? undefined : opts.helmet));
  if (opts.rateLimit) app.use(SimpleJsSetRateLimiter(opts.rateLimit));
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
  /** true = one trusted proxy in front of the app; a number = that many trusted proxies. */
  trustProxy?: boolean | number;
}) {
  const mode = opts.mode || "allow";
  const ipSet = new Set(opts.ips);

  app.use(async (req: SimpleJsRequestObject, _res: SimpleJsResponseObject, next: any) => {
    const ip = clientIp(req, opts.trustProxy);
    const inList = ipSet.has(ip);
    if (mode === "allow" && !inList) throwHttpError(403, "Access denied");
    if (mode === "deny" && inList) throwHttpError(403, "Access denied");

    await next();
  });
}

// ─── Cookie Plugin ────────────────────────────────────────────────────────────
function parseCookieHeader(header: string): Record<string, string> {
  const result = Object.create(null) as Record<string, string>;
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

const cookieSignature = (name: string, value: string, secret: string): string =>
  crypto.createHmac("sha256", secret).update(`${name}=${value}`).digest("base64url");

/**
 * Creates a signed cookie value. Use this when setting a cookie in a response.
 * The signature covers the cookie name, so the value is only valid under that name.
 * The client sends it back as-is; SimpleJsCookiePlugin will verify and strip the signature.
 */
export function SimpleJsSignCookie(name: string, value: string, secret: string): string {
  return `s:${value}.${cookieSignature(name, value, secret)}`;
}

/**
 * Parses the Cookie header on every request.
 * Plain cookies are available at `_custom_data[dataKey]` (default "cookies").
 * If a secret is provided, signed cookies (prefixed "s:") are verified and placed only in
 * `_custom_data[signedDataKey]` (default "signedCookies"), so a plain cookie can never stand in
 * for a signed one. Cookies with invalid signatures are silently dropped.
 */
export function SimpleJsCookiePlugin(app: SimpleJsServer, opts?: {
  secret?: string;
  /** Key used to attach plain cookies on _custom_data. Default: "cookies" */
  dataKey?: string;
  /** Key used to attach verified signed cookies on _custom_data. Default: "signedCookies" */
  signedDataKey?: string;
}) {
  const dataKey = opts?.dataKey || "cookies";
  const signedDataKey = opts?.signedDataKey || "signedCookies";

  app.use(async (req: SimpleJsRequestObject, _res: SimpleJsResponseObject, next: any) => {
    const raw = parseCookieHeader(req.headers.cookie || "");

    if (opts?.secret) {
      const plain = Object.create(null) as Record<string, string>;
      const signed = Object.create(null) as Record<string, string>;
      for (const [k, v] of Object.entries(raw)) {
        if (!v.startsWith("s:")) {
          plain[k] = v;
          continue;
        }
        const inner = v.slice(2);
        const dotIdx = inner.lastIndexOf(".");
        if (dotIdx < 0) continue; // malformed signed cookie — drop

        const val = inner.slice(0, dotIdx);
        const sigBuf = Buffer.from(inner.slice(dotIdx + 1), "base64url");
        const expectedBuf = Buffer.from(cookieSignature(k, val, opts.secret), "base64url");

        if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
          signed[k] = val; // valid — attach unsigned value
        }
        // invalid signature — silently dropped
      }
      req._custom_data = { ...(req._custom_data || {}), [dataKey]: plain, [signedDataKey]: signed };
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

  app.use(async (req: SimpleJsRequestObject, res: SimpleJsResponseObject, next: any) => {
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
  app.use(async (req: SimpleJsRequestObject, res: SimpleJsResponseObject, next: any) => {
    const timer = setTimeout(() => {
      if (!res.writableEnded) {
        // signal the handler (req.abortSignal) so it can stop its work
        (req as any)._abort?.abort(httpError(408, opts.message || "Request timeout"));
        res.statusCode = 408;
        if (!res.headersSent) res.setHeader("Connection", "close");
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

  app.use(async (_req: SimpleJsRequestObject, res: SimpleJsResponseObject, next: any) => {
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
  /** true = one trusted proxy in front of the app; a number = that many trusted proxies. */
  trustProxy?: boolean | number;
}) {
  app.use(async (req: SimpleJsRequestObject, res: SimpleJsResponseObject, next: any) => {
    if (!opts.enabled) return next();

    const ip = clientIp(req, opts.trustProxy);
    if (opts.allowIPs?.includes(ip)) return next();

    res.setHeader("Retry-After", "3600");
    throwHttpError(503, opts.message || "Service is under maintenance. Please try again later.");
  });
}
