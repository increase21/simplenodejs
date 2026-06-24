import { HttpMethod, ObjectPayload, RequestObject, ResponseObject } from "./general";
import http from "node:http";
import https from "node:https";
export type Next = () => Promise<any> | void;
export type Plugin = (app: SimpleJsServer, opts?: any) => Promise<any> | void;
export type SimpleJSRateLimitType = {
  windowMs: number; max: number;
  trustProxy?: boolean;
  keyGenerator?: (req: any) => string,
  urlMatch?: string[]
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

export interface SimpleJsCtx<T = any> {
  body: ObjectPayload;
  res: ResponseObject;
  req: RequestObject;
  query: ObjectPayload;
  method: HttpMethod;
  customData: T;
  readBody: (limit?: string | number) => Promise<void>;
}

export interface SimpleJsEndpointDescriptor {
  method: HttpMethod;
  id?: "required" | "optional";
  middleware?: Middleware[];
  ignoreStream?: boolean;
  bodyLimit?: string | number;
  handler: (ctx: SimpleJsCtx, id?: string) => any;
}

export type SimpleJsEndpoint = SimpleJsEndpointDescriptor[] | void;
