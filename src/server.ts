import http, { IncomingMessage, ServerResponse } from "http";
import https from "node:https";
import crypto from "node:crypto";
import { route, setControllersDir } from "./router";
import { setDefaultBodyLimit, releaseBody } from "./utils/body";
import { SimpleJsRequestObject, SimpleJsResponseObject } from "./typings/general";
import { SimpleJsErrorMiddleware, SimpleJsMiddleware, Plugin, SimpleJsHttpsServer, SimpleJsServer } from "./typings/simpletypes";
import { composeMiddleware, runErrorMiddlewares, throwHttpError, resolveHttpError } from "./utils/helpers";

type ServerOptions = {
  controllersDir?: string;
  tlsOpts?: https.ServerOptions;
  bodyLimit?: string | number;
};

const extension = (req: SimpleJsRequestObject, res: SimpleJsResponseObject): void => {

  res.status = (code: number): SimpleJsResponseObject => {
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
  //if the URL string contains ../../ or ../.., then throw an error
  const rawUrl = req.url || "/";
  if (rawUrl.includes("../") || rawUrl.includes("..\\")) {
    return throwHttpError(404, "The requested resource does not exist");
  }

  // Normalize the path once so middlewares see exactly what the router routes on:
  // backslashes become slashes, empty and "." segments are dropped, and it is lowercased
  // (routing is case-insensitive). The untouched URL stays on req.originalUrl.
  const q = rawUrl.indexOf("?");
  const search = q >= 0 ? rawUrl.slice(q + 1) : "";
  const segments = (q >= 0 ? rawUrl.slice(0, q) : rawUrl)
    .replace(/\\/g, "/").split("/").filter(s => s && s !== ".").map(s => s.toLowerCase());

  req.originalUrl = rawUrl;
  req.path = "/" + segments.join("/");
  req.url = req.path + (q >= 0 ? "?" + search : "");
  req.query = search ? Object.fromEntries(new URLSearchParams(search).entries()) : {};
  req._end_point_path = segments;

  req.id = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.id);

  // Aborted when the client disconnects or a timeout fires; pass it to long-running work
  const abort = new AbortController();
  req.abortSignal = abort.signal;
  (req as any)._abort = abort;
  res.on("close", () => {
    if (!res.writableFinished) abort.abort(new Error("Client disconnected"));
    // Response is done (sent or aborted): free the raw body bytes now instead of waiting for GC
    releaseBody(req);
  });
};


// Only HTTP errors send their status and message; anything else (DB, fs, library errors)
// gets a generic 503 so internal details never reach the client.
function sendErrorResponse(err: unknown, res: ServerResponse) {
  try {
    if (res.writableEnded) return;
    if (res.headersSent) return void res.end();
    const httpErr = resolveHttpError(err);
    res.statusCode = httpErr ? httpErr.status : 503;
    res.end(httpErr ? httpErr.message : "Service unavailable");
  } catch {
    res.destroy();
  }
}

function buildRequestHandler(middlewares: SimpleJsMiddleware[], errorMiddlewares: SimpleJsErrorMiddleware[]) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    try {
      extension(req as SimpleJsRequestObject, res as SimpleJsResponseObject);
      if (res.writableEnded) return;
      const run = composeMiddleware(middlewares);
      await run(req as SimpleJsRequestObject, res as SimpleJsResponseObject);
      if (res.writableEnded) return;
      await route(req as SimpleJsRequestObject, res as SimpleJsResponseObject);
    } catch (err) {
      try {
        // Body exceeded the limit: close the connection instead of draining the rest of the upload
        if ((req as any)._body_overflow) {
          if (!res.headersSent) res.setHeader("Connection", "close");
          res.once("finish", () => req.socket?.destroy());
        }
        await runErrorMiddlewares(err, errorMiddlewares, req as SimpleJsRequestObject, res as SimpleJsResponseObject);
      } catch {
        // a failing error middleware must not take the process down; fall back to the default response
      }
      sendErrorResponse(err, res);
    }
  };
}

function attachServerMethods(
  server: SimpleJsServer | SimpleJsHttpsServer,
  middlewares: SimpleJsMiddleware[],
  errorMiddlewares: SimpleJsErrorMiddleware[],
  opts?: ServerOptions
): void {
  server.use = mw => { middlewares.push(mw); };
  server.useError = mw => { errorMiddlewares.push(mw); };
  server.registerPlugin = async (plugin: Plugin) => { await plugin(server as SimpleJsServer); };
}

export const CreateSimpleJsHttpServer = (opts?: ServerOptions): SimpleJsServer => {
  const middlewares: SimpleJsMiddleware[] = [];
  const errorMiddlewares: SimpleJsErrorMiddleware[] = [];
  if (opts?.controllersDir) setControllersDir(opts.controllersDir);
  if (opts?.bodyLimit !== undefined) setDefaultBodyLimit(opts.bodyLimit);
  const server = http.createServer(buildRequestHandler(middlewares, errorMiddlewares)) as SimpleJsServer;
  attachServerMethods(server, middlewares, errorMiddlewares, opts);
  return server;
};

export const CreateSimpleJsHttpsServer = (opts?: ServerOptions): SimpleJsHttpsServer => {
  const middlewares: SimpleJsMiddleware[] = [];
  const errorMiddlewares: SimpleJsErrorMiddleware[] = [];
  if (!opts?.tlsOpts) throw new Error("CreateSimpleJsHttpsServer requires opts.tlsOpts");
  if (opts.controllersDir) setControllersDir(opts.controllersDir);
  if (opts.bodyLimit !== undefined) setDefaultBodyLimit(opts.bodyLimit);
  const server = https.createServer(opts.tlsOpts, buildRequestHandler(middlewares, errorMiddlewares)) as SimpleJsHttpsServer;
  attachServerMethods(server, middlewares, errorMiddlewares, opts);
  return server;
};
