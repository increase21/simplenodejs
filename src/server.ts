
import http, { IncomingMessage, ServerResponse } from "http";
import { route } from "./router";

import { ErrorMiddleware, Middleware, Plugin, RequestObject, ResponseObject, SimpleJsServer } from "./typings/general";

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
}


export function compose(middlewares: Middleware[]) {
  return async function (req: RequestObject, res: ResponseObject) {
    let idx = -1;
    async function dispatch(i: number): Promise<void> {
      if (i <= idx) throw new Error("next() called twice");
      idx = i;
      const fn = middlewares[i];
      if (!fn) return;
      try {
        await fn(req, res, () => dispatch(i + 1));
      } catch (err) {
        if (!res.writableEnded) {
          res.status(500).json({ error: "Middleware error" });
        }
      }
    }
    await dispatch(0);
  };
}

export const CreateSimpleJsHttpServer = (handler?: (req: IncomingMessage, res: ServerResponse) => void) => {
  const middlewares: Middleware[] = [];
  const errorMiddlewares: ErrorMiddleware[] = [];
  const plugins: Plugin[] = [];
  const server = http.createServer(async (req, res) => {
    extension(req, res as ResponseObject)
    const run = compose(middlewares);
    try {
      handler && await handler(req, res)
      if (res.writableEnded) return;
      await run(req as RequestObject, res as ResponseObject);
      //if the request has ended stop here
      if (res.writableEnded) return;
      await route(req as RequestObject, res as ResponseObject)
    } catch (err) {
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  }) as SimpleJsServer;

  server.setTimeout(60_000) //60Seconds

  server.use = mw => { middlewares.push(mw) }
  server.useError = mw => errorMiddlewares.push(mw);
  server.register = async (plugin, opts) => {
    plugins.push(plugin);
    await plugin(server, opts);
  };
  return server;
}