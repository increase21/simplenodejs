import http, { IncomingMessage, ServerResponse } from "http";
import https from "node:https";
import qs from "node:querystring";
import { route, setControllersDir } from "./router";
import crypto from "node:crypto";
import { ErrorMiddleware, Middleware, Plugin, RequestObject, ResponseObject, SimpleJsHttpsServer, SimpleJsServer } from "./typings/general";
import { composeMiddleware, runErrorMiddlewares } from "./utils/helpers";

type ServerOptions = {
  controllersDir?: string;
  tlsOpts?: https.ServerOptions,
};

const extension = (req: RequestObject, res: ResponseObject): void => {
  res.status = (code: number): ResponseObject => {
    if (typeof code !== "number") throw new Error("Status code expected to be number but got " + typeof code);
    res.statusCode = code ?? 200;
    return res;
  };
  res.json = (param: object): void => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(param));
  };
  res.text = (param?: string): void => {
    res.setHeader('Content-Type', 'text/plain');
    res.end(param);
  };
  const url = new URL(req.url!, "http://localhost");
  req.query = url.search ? qs.parse(url.search.substring(1)) : {};
  req._end_point_path = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
  req.id = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);
};


function buildRequestHandler(middlewares: Middleware[], errorMiddlewares: ErrorMiddleware[]) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    try {
      extension(req as RequestObject, res as ResponseObject);
      if (res.writableEnded) return;
      const run = composeMiddleware(middlewares);
      await run(req as RequestObject, res as ResponseObject);
      if (res.writableEnded) return;
      await route(req as RequestObject, res as ResponseObject);
    } catch (err) {
      await runErrorMiddlewares(err, errorMiddlewares, req as RequestObject, res as ResponseObject);
      if (!res.headersSent) {
        let errorCode = (err as any || {}).code
        res.statusCode = errorCode || 503;
        res.end(errorCode ? (err as any).error : "Service unavailable");
      }
    }
  };
}

function attachServerMethods(
  server: SimpleJsServer | SimpleJsHttpsServer,
  middlewares: Middleware[],
  errorMiddlewares: ErrorMiddleware[],
  opts?: ServerOptions
): void {
  server.use = mw => { middlewares.push(mw); };
  server.useError = mw => { errorMiddlewares.push(mw); };
  server.registerPlugin = async (plugin: Plugin) => { await plugin(server as SimpleJsServer); };
}

export const CreateSimpleJsHttpServer = (opts?: ServerOptions): SimpleJsServer => {
  const middlewares: Middleware[] = [];
  const errorMiddlewares: ErrorMiddleware[] = [];
  if (opts && opts.controllersDir) setControllersDir(opts.controllersDir);
  const server = http.createServer(buildRequestHandler(middlewares, errorMiddlewares)) as SimpleJsServer;
  attachServerMethods(server, middlewares, errorMiddlewares, opts);
  return server;
};

export const CreateSimpleJsHttpsServer = (opts?: ServerOptions): SimpleJsHttpsServer => {
  const middlewares: Middleware[] = [];
  const errorMiddlewares: ErrorMiddleware[] = [];
  if (!opts?.tlsOpts) throw new Error("CreateSimpleJsHttpsServer requires opts.tlsOpts");
  if (opts.controllersDir) setControllersDir(opts.controllersDir);
  const server = https.createServer(opts.tlsOpts, buildRequestHandler(middlewares, errorMiddlewares)) as SimpleJsHttpsServer;
  attachServerMethods(server, middlewares, errorMiddlewares, opts);
  return server;
};
