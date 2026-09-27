// body.ts
import { SimpleJsRequestObject } from "../typings/general";
import { SetBodyLimit } from "./simpleMiddleware";
import { httpError, throwHttpError } from "./helpers";

export type SimpleJsReadBodyAs = "auto" | "json" | "text" | "buffer" | "form";
export type SimpleJsReadBodyOptions = { limit?: string | number; as?: SimpleJsReadBodyAs };

// Raw bytes are read from the stream once per request and shared by every caller
const rawCache = new WeakMap<SimpleJsRequestObject, Promise<Buffer>>();
// Requests whose response has finished; their bytes are gone and reading again is a bug
const released = new WeakSet<SimpleJsRequestObject>();
let defaultLimit: string | number = "1mb";

export function setDefaultBodyLimit(limit: string | number) {
  defaultLimit = limit;
}

export function hasRequestBody(req: SimpleJsRequestObject): boolean {
  const h = req.headers;
  return !!(h["content-type"] || h["transfer-encoding"] || (h["content-length"] && h["content-length"] !== "0"));
}

/**
 * Frees the cached body bytes once the response has finished, so they do not outlive the
 * request even if user code keeps a reference to `req`. `req.body` (the parsed value) is kept.
 */
export function releaseBody(req: SimpleJsRequestObject) {
  released.add(req);
  rawCache.delete(req);
}

function readRaw(req: SimpleJsRequestObject, limit?: string | number): Promise<Buffer> {
  if (released.has(req)) {
    return Promise.reject(new Error("SimpleJsReadBody: the response has finished and the request body was released; read it before responding or use req.body"));
  }
  const cached = rawCache.get(req);
  if (cached) return cached;

  const r = req as any;
  const p = new Promise<Buffer>((resolve, reject) => {
    const maxSize = SetBodyLimit(limit ?? defaultLimit);
    const overflow = () => {
      r._body_overflow = true;
      r.removeAllListeners("data");
      r.pause();
      reject(httpError(413, "Payload Too Large"));
    };

    if (maxSize && Number(r.headers["content-length"] || 0) > maxSize) return overflow();
    if (r.readableEnded) return resolve(Buffer.alloc(0));

    let size = 0;
    const chunks: Buffer[] = [];

    r.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (maxSize && size > maxSize) return overflow();
      chunks.push(chunk);
    });
    r.on("end", () => resolve(Buffer.concat(chunks)));
    r.on("error", () => reject(httpError(400, "Request stream ended")));
    r.on("close", () => {
      if (!r.complete) reject(httpError(400, "Request stream ended"));
    });
  });

  rawCache.set(req, p);
  return p;
}

/**
 * Reads the request body. The stream is consumed once; later calls reuse the same bytes.
 * - `as: "auto"` (default): parses by Content-Type and sets `req.body`. A body that fails
 *   to parse is kept as the raw string and `req._body_error` is set; it never throws.
 * - `as: "json" | "form" | "text" | "buffer"`: returns that form and throws 400 on a parse failure.
 * Size limit and stream errors throw in both modes.
 */
export async function SimpleJsReadBody<T = any>(req: SimpleJsRequestObject, opts: SimpleJsReadBodyOptions = {}): Promise<T> {
  const buf = await readRaw(req, opts.limit);
  const as = opts.as ?? "auto";
  const strict = as !== "auto";
  if (as === "buffer") return buf as any;

  const text = buf.toString("utf8");
  const contentType = String(req.headers["content-type"] || "");
  const kind = strict ? as : contentType.includes("json") ? "json"
    : contentType.includes("x-www-form-urlencoded") ? "form" : "text";

  let value: any = text || undefined;
  if (text && kind !== "text") {
    try {
      value = kind === "json" ? JSON.parse(text) : Object.fromEntries(new URLSearchParams(text));
    } catch {
      if (strict) throwHttpError(400, "Invalid Payload");
      (req as any)._body_error = "Invalid Payload";
    }
  }

  if (!strict) req.body = value;
  return value;
}
