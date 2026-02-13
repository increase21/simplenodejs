import { ErrorMiddleware, Middleware, RequestObject, ResponseObject } from "../typings/general";

export function composeWithError(middlewares: Middleware[]) {
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

export function throwHttpError(code: number, message: string) {
  const error = new Error(message) as any;
  error.statusCode = code;
  error.toJSON = () => ({ code, error: message });
  throw error;
}