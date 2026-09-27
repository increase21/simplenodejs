import path from "node:path";
import fs from "node:fs";
import net from "node:net";
import { SimpleJsRequestObject, SimpleJsResponseObject } from "../typings/general";
import { SimpleJsErrorMiddleware, SimpleJsMiddleware, SimpleJsControllerMeta } from "../typings/simpletypes";

export function composeMiddleware(middlewares: SimpleJsMiddleware[]) {
  return async function (req: SimpleJsRequestObject, res: SimpleJsResponseObject) {
    let idx = -1;

    async function dispatch(i: number): Promise<void> {
      if (i <= idx) throw new Error("next() called twice");
      idx = i;

      if (res.writableEnded) return;

      const fn = middlewares[i];
      if (!fn) return;

      let called = false;

      const next = async () => {
        if (called) throw new Error("next() called multiple times in the same middleware");
        called = true;
        return dispatch(i + 1);
      };

      return await fn(req, res, next);
    }
    return await dispatch(0);
  };
}

export async function runErrorMiddlewares(
  err: unknown,
  errorMiddlewares: SimpleJsErrorMiddleware[],
  req: SimpleJsRequestObject,
  res: SimpleJsResponseObject
): Promise<void> {
  let idx = 0;
  async function next(): Promise<void> {
    const mw = errorMiddlewares[idx++];
    if (!mw || res.writableEnded) return;
    await mw(err, req, res, next);
  }
  await next();
}

// Marks errors created by the framework (or SimpleJsHttpError) as safe to send to the client
const HTTP_ERROR = Symbol.for("simplejs.httpError");

export function httpError(code: number, message: string): Error & { code: number } {
  const error = new Error(message) as Error & { code: number };
  error.code = code;
  (error as any)[HTTP_ERROR] = true;
  return error;
}

const isHttpStatus = (code: unknown): code is number =>
  Number.isInteger(code) && (code as number) >= 400 && (code as number) <= 599;

/**
 * Returns the status and message to send for an error, or null when the error is not an HTTP error.
 * Only errors made by httpError/SimpleJsHttpError, or plain `{ code, error }` objects, qualify, so
 * library errors that carry their own `code` (DB, fs, HTTP clients) never leak their message.
 */
export function resolveHttpError(err: any): { status: number; message: string } | null {
  if (!err || typeof err !== "object" || !isHttpStatus(err.code)) return null;
  if (err[HTTP_ERROR]) return { status: err.code, message: String(err.message ?? "") };
  if (!(err instanceof Error) && typeof err.error === "string") return { status: err.code, message: err.error };
  return null;
}

export function throwHttpError(code: number, message: string): never {
  throw httpError(code, message);
}


export function loadControllers(root = "controllers"): Map<string, SimpleJsControllerMeta> {
  const base = path.resolve(process.cwd(), root);
  const realBase = fs.realpathSync(base);  // resolve the base itself (may be a symlink)
  const map = new Map<string, SimpleJsControllerMeta>();

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);

      let realFull: string;
      try {
        realFull = fs.realpathSync(full);  // resolve actual disk path, following all symlinks
      } catch {
        continue;  // skip broken symlinks
      }

      // Block anything whose real path is outside the controllers directory
      if (!realFull.startsWith(realBase + path.sep)) continue;

      const isDir = entry.isDirectory() || (entry.isSymbolicLink() && fs.statSync(realFull).isDirectory());
      if (isDir) walk(full);
      else if (entry.name.endsWith(".js") || entry.name.endsWith(".ts")) {
        const Controller = require(realFull)?.default;  // use realFull to prevent TOCTOU
        if (typeof Controller !== "function") continue;
        const key = full.slice(base.length).replace(/\\/g, "/").replace(/\.(ts|js)$/, "");
        map.set(key.toLowerCase(), { name: Controller.name, Controller });
      }
    }
  }

  walk(base);
  return map;
}

// Converts IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1) to plain IPv4.
export function normalizeIP(raw: string): string {
  const stripped = raw.trim().replace(/^::ffff:/i, "");
  return net.isIPv4(stripped) ? stripped : raw.trim();
}

/**
 * Resolves the client IP.
 * - trustProxy false/undefined: the socket address.
 * - trustProxy true: one trusted proxy in front of the app, so the client is the last
 *   X-Forwarded-For entry (the one that proxy appended). Entries to its left are client-controlled.
 * - trustProxy n: n trusted proxies; the client is the n-th entry from the right.
 */
export function clientIp(req: SimpleJsRequestObject, trustProxy?: boolean | number): string {
  const socketIp = req.socket?.remoteAddress || "";
  const hops = trustProxy === true ? 1 : typeof trustProxy === "number" ? Math.max(0, Math.floor(trustProxy)) : 0;
  if (!hops) return normalizeIP(socketIp);

  const header = req.headers["x-forwarded-for"];
  const forwarded = (Array.isArray(header) ? header.join(",") : header || "")
    .split(",").map(s => s.trim()).filter(Boolean);
  const chain = [...forwarded, socketIp];
  return normalizeIP(chain[Math.max(0, chain.length - 1 - hops)] || socketIp);
}
