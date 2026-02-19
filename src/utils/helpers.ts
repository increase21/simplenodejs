import path from "node:path";
import { ErrorMiddleware, Middleware, RequestObject, ResponseObject } from "../typings/general";
import fs from "node:fs";
import { SimpleJsControllerMeta } from "../typings/simpletypes";

export function composeMiddleware(middlewares: Middleware[]) {
  return async function (req: RequestObject, res: ResponseObject) {
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
  errorMiddlewares: ErrorMiddleware[],
  req: RequestObject,
  res: ResponseObject
): Promise<void> {
  let idx = 0;
  async function next(): Promise<void> {
    const mw = errorMiddlewares[idx++];
    if (!mw || res.writableEnded) return;
    await mw(err, req, res, next);
  }
  await next();
}

export function throwHttpError(code: number, message: string): never {
  const error = new Error(message) as any;
  error.code = code;
  throw error;
}


export function loadControllers(root = "controllers"): Map<string, SimpleJsControllerMeta> {
  const base = path.resolve(process.cwd(), root);
  const realBase = fs.realpathSync(base);  // resolve the base itself (may be a symlink)
  const map = new Map<string, SimpleJsControllerMeta>();

  function walk(dir: string) {
    for (const file of fs.readdirSync(dir)) {
      const full = path.join(dir, file);

      let realFull: string;
      try {
        realFull = fs.realpathSync(full);  // resolve actual disk path, following all symlinks
      } catch {
        continue;  // skip broken symlinks
      }

      // Block anything whose real path is outside the controllers directory
      if (!realFull.startsWith(realBase + path.sep)) continue;

      if (fs.statSync(full).isDirectory()) walk(full);
      else if (file.endsWith(".js") || file.endsWith(".ts")) {
        const Controller = require(full)?.default;
        if (typeof Controller !== "function") continue;
        const key = full.slice(base.length).replace(/\\/g, "/").replace(/\.(ts|js)$/, "");
        map.set(key.toLowerCase(), { name: Controller.name, Controller });
      }
    }
  }

  walk(base);
  return map;
}
