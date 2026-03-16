import { HttpMethod, ObjectPayload, RequestObject, ResponseObject } from "./general";
import http from "node:http";
import https from "node:https";
export type Next = () => Promise<any> | void;
export type Plugin = (app: SimpleJsServer, opts?: any) => Promise<any> | void;
export type SimpleJSRateLimitType = { windowMs: number; max: number; trustProxy?: boolean; keyGenerator?: (req: any) => string }
export type SimpleJSBodyParseType = {
  limit?: string | number;
  /**
   * Skip stream reading (and pass the raw stream to the handler) for matching requests.
   * Accepts a list of path prefixes or a predicate function.
   * Multipart requests are always skipped regardless of this option.
   * The `type` field determines whether the URL should be matched exactly (`exact`) or as a prefix (`prefix`).
   */
  ignoreStream?: { url: string, method: HttpMethod, type: 'exact' | 'prefix' }[] | ((req: RequestObject) => boolean);
}

export interface SimpleJsControllerMeta {
  name: string;
  Controller: any;
}


export type Middleware = (
  req: RequestObject,
  res: ResponseObject,
  next: () => Promise<any> | void,
) => Promise<any> | void;

export type ErrorMiddleware = (
  err: any,
  req: RequestObject,
  res: ResponseObject,
  next: Next
) => Promise<boolean> | void;

export interface SimpleJsServer extends http.Server {
  use(mw: Middleware): Promise<any> | void;
  useError: (mw: ErrorMiddleware) => void;
  registerPlugin: (plugin: Plugin) => Promise<any> | void;
}

export interface SimpleJsHttpsServer extends https.Server {
  use(mw: Middleware): Promise<any> | void;
  useError: (mw: ErrorMiddleware) => void;
  registerPlugin: (plugin: Plugin) => Promise<any> | void;
}

export interface SimpleJsCtx {
  body: ObjectPayload;
  res: ResponseObject;
  req: RequestObject;
  query: ObjectPayload;
  customData: any;
}

export interface SimpleJsEndpointDescriptor {
  method: HttpMethod;
  id?: "required" | "optional";
  handler: (ctx: SimpleJsCtx, id?: string) => any;
}
