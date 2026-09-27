import { SimpleJsRequestObject, SimpleJsResponseObject } from "../typings/general";
import { SimpleJSRateLimitType } from "../typings/simpletypes";
import net from "node:net";
import { clientIp, throwHttpError } from "./helpers";

// ─── CORS ────────────────────────────────────────────────────────────────────
export type SimpleJsCorsOrigin = string | string[] | ((origin: string) => boolean);

export function SimpleJsSetCORS(opts?: {
  /** Allowed origin(s): "*", an exact origin, a list, or a predicate. Required with `credentials`. */
  origin?: SimpleJsCorsOrigin;
  methods?: string;
  headers?: string;
  credentials?: boolean;
}) {
  const origin = opts?.origin;
  if (opts?.credentials && (!origin || origin === "*" || (Array.isArray(origin) && origin.includes("*")))) {
    throw new Error("SimpleJsSetCORS: `credentials: true` requires an explicit `origin` allowlist (not \"*\")");
  }
  const wildcard = !origin || origin === "*";
  const allowed = (o: string): boolean =>
    typeof origin === "function" ? !!origin(o) : Array.isArray(origin) ? origin.includes(o) : o === origin;

  return async (req: SimpleJsRequestObject, res: SimpleJsResponseObject, next: any) => {
    const reqOrigin = req.headers.origin;

    if (wildcard) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    } else {
      // The response depends on Origin, so shared caches must key on it
      res.setHeader("Vary", "Origin");
      // No Origin header: same-origin or non-browser request, CORS does not apply
      if (!reqOrigin) return next();
      if (!allowed(reqOrigin)) throwHttpError(403, "CORS Error: Origin not allowed");
      res.setHeader("Access-Control-Allow-Origin", reqOrigin);
      if (opts?.credentials) res.setHeader("Access-Control-Allow-Credentials", "true");
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
export function SimpleJsSetHSTS(opts?: { maxAge?: number; includeSubDomains?: boolean; preload?: boolean }) {
  let value = `max-age=${opts?.maxAge ?? 31536000}`;
  if (opts?.includeSubDomains !== false) value += "; includeSubDomains";
  if (opts?.preload) value += "; preload";
  return async (_req: SimpleJsRequestObject, res: SimpleJsResponseObject, next: any) => {
    res.setHeader("Strict-Transport-Security", value);
    await next();
  };
}

// ─── Content Security Policy ──────────────────────────────────────────────────
export function SimpleJsSetCSP(policy = "default-src 'none'") {
  const safePolicy = policy.replace(/[\r\n]/g, "");
  return async (_req: SimpleJsRequestObject, res: SimpleJsResponseObject, next: any) => {
    res.setHeader("Content-Security-Policy", safePolicy);
    await next();
  };
}

// ─── X-Frame-Options (clickjacking) ──────────────────────────────────────────
export function SimpleJsSetFrameGuard(action: "DENY" | "SAMEORIGIN" = "DENY") {
  return async (_req: SimpleJsRequestObject, res: SimpleJsResponseObject, next: any) => {
    res.setHeader("X-Frame-Options", action);
    await next();
  };
}

// ─── X-Content-Type-Options (MIME sniffing) ───────────────────────────────────
export function SimpleJsSetNoSniff() {
  return async (_req: SimpleJsRequestObject, res: SimpleJsResponseObject, next: any) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    await next();
  };
}

// ─── Referrer-Policy ──────────────────────────────────────────────────────────
export function SimpleJsSetReferrerPolicy(policy = "no-referrer") {
  const safePolicy = policy.replace(/[\r\n]/g, "");
  return async (_req: SimpleJsRequestObject, res: SimpleJsResponseObject, next: any) => {
    res.setHeader("Referrer-Policy", safePolicy);
    await next();
  };
}

// ─── Permissions-Policy (browser feature control) ────────────────────────────
export function SimpleJsSetPermissionsPolicy(policy = "camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()") {
  const safePolicy = policy.replace(/[\r\n]/g, "");
  return async (_req: SimpleJsRequestObject, res: SimpleJsResponseObject, next: any) => {
    res.setHeader("Permissions-Policy", safePolicy);
    await next();
  };
}

// ─── Cross-Origin-Embedder-Policy ────────────────────────────────────────────
export function SimpleJsSetCOEP(value = "require-corp") {
  const safeValue = value.replace(/[\r\n]/g, "");
  return async (_req: SimpleJsRequestObject, res: SimpleJsResponseObject, next: any) => {
    res.setHeader("Cross-Origin-Embedder-Policy", safeValue);
    await next();
  };
}

// ─── Cross-Origin-Opener-Policy ──────────────────────────────────────────────
export function SimpleJsSetCOOP(value = "same-origin") {
  const safeValue = value.replace(/[\r\n]/g, "");
  return async (_req: SimpleJsRequestObject, res: SimpleJsResponseObject, next: any) => {
    res.setHeader("Cross-Origin-Opener-Policy", safeValue);
    await next();
  };
}

// ─── Helmet (security headers bundle, excludes CORS) ─────────────────────────
export function SimpleJsSetHelmet(opts?: {
  hsts?: false | { maxAge?: number; includeSubDomains?: boolean; preload?: boolean };
  csp?: false | string;
  frameGuard?: false | "DENY" | "SAMEORIGIN";
  noSniff?: false;
  referrerPolicy?: false | string;
  permissionsPolicy?: false | string;
  coep?: false | string;
  coop?: false | string;
}) {
  return async (_req: SimpleJsRequestObject, res: SimpleJsResponseObject, next: any) => {
    if (opts?.noSniff !== false)
      res.setHeader("X-Content-Type-Options", "nosniff");

    if (opts?.frameGuard !== false)
      res.setHeader("X-Frame-Options", typeof opts?.frameGuard === "string" ? opts.frameGuard.replace(/[\r\n]/g, "") : "DENY");

    if (opts?.referrerPolicy !== false)
      res.setHeader("Referrer-Policy", typeof opts?.referrerPolicy === "string" ? opts.referrerPolicy.replace(/[\r\n]/g, "") : "no-referrer");

    if (opts?.csp !== false)
      res.setHeader("Content-Security-Policy", typeof opts?.csp === "string" ? opts.csp.replace(/[\r\n]/g, "") : "default-src 'none'");

    if (opts?.hsts !== false) {
      const hsts = (opts?.hsts && typeof opts.hsts === "object") ? opts.hsts : {};
      let hstsValue = `max-age=${hsts.maxAge ?? 31536000}`;
      if (hsts.includeSubDomains !== false) hstsValue += "; includeSubDomains";
      if (hsts.preload) hstsValue += "; preload";
      res.setHeader("Strict-Transport-Security", hstsValue);
    }

    if (opts?.permissionsPolicy !== false)
      res.setHeader("Permissions-Policy", typeof opts?.permissionsPolicy === "string" ? opts.permissionsPolicy.replace(/[\r\n]/g, "") : "camera=(), microphone=(), geolocation=(), payment=(), usb=(), display-capture=()");

    if (opts?.coep !== false)
      res.setHeader("Cross-Origin-Embedder-Policy", typeof opts?.coep === "string" ? opts.coep.replace(/[\r\n]/g, "") : "require-corp");

    if (opts?.coop !== false)
      res.setHeader("Cross-Origin-Opener-Policy", typeof opts?.coop === "string" ? opts.coop.replace(/[\r\n]/g, "") : "same-origin");

    await next();
  };
}

// ─── Rate Limiter ─────────────────────────────────────────────────────────────
const RATE_LIMIT_MAX_STORE = 100_000;

// IPv6 clients usually control a whole /64, so they are limited per /64 instead of per address
function rateLimitIpKey(ip: string): string {
  if (!net.isIPv6(ip)) return ip;
  const addr = ip.split("%")[0];
  const [h, t] = addr.includes("::") ? addr.split("::") : [addr, undefined];
  const head = h ? h.split(":") : [];
  const tail = t ? t.split(":") : [];
  const groups = t === undefined ? head : [...head, ...Array(Math.max(0, 8 - head.length - tail.length)).fill("0"), ...tail];
  return groups.slice(0, 4).map(g => parseInt(g || "0", 16).toString(16)).join(":") + "::/64";
}

export function SimpleJsSetRateLimiter(opts: SimpleJSRateLimitType) {
  // Sliding window: the previous window's count is weighted by how much of it still overlaps,
  // so a client cannot send 2x max by bursting at a window boundary.
  const store = new Map<string, { start: number; count: number; prev: number }>();
  const prefixes = opts.urlMatch?.map(u => "/" + u.toLowerCase().replace(/^\/+|\/+$/g, ""));

  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store) {
      if (now - v.start >= 2 * opts.windowMs) store.delete(k);
    }
  }, opts.windowMs)?.unref();

  return async (req: SimpleJsRequestObject, res: SimpleJsResponseObject, next: () => Promise<any> | void) => {
    // Match on the normalized path the router uses, so case or slash tricks cannot skip the limiter
    const path = req.path || "/";
    const urlMatch = prefixes ? prefixes.find(u => path === u || path.startsWith(u === "/" ? u : u + "/")) : "";
    if (prefixes && urlMatch === undefined) return next();

    const finalIp = String(opts.keyGenerator?.(req) || rateLimitIpKey(clientIp(req, opts.trustProxy)) || "unknown");
    const key = `${finalIp}:${urlMatch}`;
    const now = Date.now();

    let entry = store.get(key);
    if (!entry) {
      if (store.size >= RATE_LIMIT_MAX_STORE) store.delete(store.keys().next().value!); // evict oldest entry
      entry = { start: now, count: 0, prev: 0 };
      store.set(key, entry);
    } else if (now - entry.start >= opts.windowMs) {
      const elapsedWindows = Math.floor((now - entry.start) / opts.windowMs);
      entry.prev = elapsedWindows === 1 ? entry.count : 0;
      entry.count = 0;
      entry.start += elapsedWindows * opts.windowMs;
    }

    const overlap = 1 - (now - entry.start) / opts.windowMs;
    if (entry.prev * overlap + entry.count >= opts.max) {
      res.setHeader("Retry-After", Math.max(1, Math.ceil((entry.start + opts.windowMs - now) / 1000)));
      throwHttpError(429, "Too Many Requests. Please try again later.");
    }

    entry.count++;
    await next();
  };
}

// ─── Body Parser ──────────────────────────────────────────────────────────────
export function SetBodyLimit(limit: string | number = "1mb") {
  if (typeof limit === "number") return limit;
  const match = /^(\d+)(kb|mb)?$/i.exec(limit);
  if (!match) return 1024 * 1024;
  const n = parseInt(match[1], 10);
  const unit = match[2]?.toLowerCase();
  if (unit === "kb") return n * 1024;
  if (unit === "mb") return n * 1024 * 1024;
  return n;
}
