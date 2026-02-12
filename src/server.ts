import http, { IncomingMessage, ServerResponse } from "http";
import { route } from "./router";
import crypto from "node:crypto"
import { ErrorMiddleware, Middleware, Plugin, RequestObject, ResponseObject, SimpleJsServer } from "./typings/general";
import { composeWithError } from "./utils/helpers";

const extension = (req: RequestObject, res: ResponseObject): void => {
  //for response status
  res.status = (code: number): ResponseObject => {
    if (!/^\d+/.test(String(code)) || typeof code !== "number") throw new Error("Status code expected to be number but got " + typeof code)
    res.statusCode = code ? code : 200;
    return res;
  }
  ///convert the response to JSON
  res.json = (param: object): void => {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(param))
  }
  //convert the response to text/plain
  res.text = (param?: string): void => {
    res.setHeader('Content-Type', 'text/plain')
    res.end(param)
  }
  req.id = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
}

export const CreateSimpleJsHttpServer = (handler?: (req: IncomingMessage, res: ServerResponse) => void) => {
  const middlewares: Middleware[] = [];
  const errorMiddlewares: ErrorMiddleware[] = [];
  const plugins: Plugin[] = [];
  const server = http.createServer(async (req, res) => {
    extension(req, res as ResponseObject)
    const run = composeWithError(middlewares, errorMiddlewares);
    try {
      handler && await handler(req, res)
      if (res.writableEnded) return;
      await run(req as RequestObject, res as ResponseObject);
      //if the request has ended stop here
      if (res.writableEnded) return;
      await route(req as RequestObject, res as ResponseObject)
    } catch (err) {
      // 1. Run error middlewares
      for (const mw of errorMiddlewares) {
        await mw(err, req as RequestObject, res as ResponseObject, () => { });
      }
      // 2. Safe HTTP response fallback
      if (!res.headersSent) {
        res.statusCode = 503;
        res.end("Service unavailable at the moment");
      }
    }
  }) as SimpleJsServer;

  server.use = mw => { middlewares.push(mw) }
  server.useError = mw => errorMiddlewares.push(mw);
  server.register = async (plugin, opts) => {
    plugins.push(plugin);
    await plugin(server, opts);
  };
  return server;
}