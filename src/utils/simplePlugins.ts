import { Plugin, SimpleJsServer } from "../typings/general";
import { SimpleJSRateLimitType } from "../typings/simpletypes";
import { SetRateLimiter, SetRequestCORS } from "./simpleMiddleware";

export function SimpleJsSecurityPlugin(app: SimpleJsServer, opts: {
  cors?: { name: string, value: string }[],
  rateLimit?: SimpleJSRateLimitType
}) {
  opts.cors && app.use(SetRequestCORS(opts.cors || []));
  opts.rateLimit && app.use(SetRateLimiter(opts.rateLimit || { windowMs: 1000, max: 100 }));
}

