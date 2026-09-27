import { HttpMethod, ObjectPayload, SimpleJsRequestObject, SimpleJsResponseObject } from "./general";
import http from "node:http";
import https from "node:https";
import type { SimpleJsReadBodyOptions } from "../utils/body";
export type Next = () => Promise<any> | void;
export type Plugin = (app: SimpleJsServer, opts?: any) => Promise<any> | void;
export type SimpleJSRateLimitType = {
  windowMs: number; max: number;
  /** true = one trusted proxy in front of the app; a number = that many trusted proxies. */
  trustProxy?: boolean | number;
  keyGenerator?: (req: any) => string,
  /** Path prefixes (whole segments, case-insensitive) the limiter applies to. */
  urlMatch?: string[]
}
export interface SimpleJsControllerMeta {
  name: string;
  Controller: any;
}

export type SimpleJsMiddleware = (
  req: SimpleJsRequestObject,
  res: SimpleJsResponseObject,
  next: () => Promise<any> | void,
) => Promise<any> | void;

export type SimpleJsErrorMiddleware = (
  err: any,
  req: SimpleJsRequestObject,
  res: SimpleJsResponseObject,
  next: Next
) => Promise<boolean> | void;

export interface SimpleJsServer extends http.Server {
  use(mw: SimpleJsMiddleware): Promise<any> | void;
  useError: (mw: SimpleJsErrorMiddleware) => void;
  registerPlugin: (plugin: Plugin) => Promise<any> | void;
}

export interface SimpleJsHttpsServer extends https.Server {
  use(mw: SimpleJsMiddleware): Promise<any> | void;
  useError: (mw: SimpleJsErrorMiddleware) => void;
  registerPlugin: (plugin: Plugin) => Promise<any> | void;
}

export interface SimpleJsCtx<T = any> {
  body: ObjectPayload;
  res: SimpleJsResponseObject;
  req: SimpleJsRequestObject;
  query: ObjectPayload;
  method: HttpMethod;
  customData: T;
  /** Reads the body (once per request). Inline methods call this; descriptor handlers get it automatically. Pass a limit, or `{ limit, as }`. */
  readBody: (opts?: string | number | SimpleJsReadBodyOptions) => Promise<any>;
}

export interface SimpleJsEndpointDescriptor {
  method: HttpMethod;
  id?: "required" | "optional";
  middleware?: SimpleJsMiddleware[];
  /** Skip the automatic body read and leave the raw stream to the handler. */
  ignoreStream?: boolean;
  /** Max body size for this endpoint. Overrides the global `bodyLimit`. */
  bodyLimit?: string | number;
  handler: (ctx: SimpleJsCtx, id?: string) => any;
}

export type SimpleJsEndpoint = SimpleJsEndpointDescriptor[] | void;
