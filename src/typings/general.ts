import http, { IncomingMessage, ServerResponse } from "http";
import https from "node:https";
export type Next = () => Promise<any> | void;
export type Plugin = (app: SimpleJsServer, opts?: any) => Promise<any> | void;
export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
export type ObjectPayload = { [key: string]: any }
export type RequestObject = IncomingMessage & {
  body?: any;
  query?: any;
  id?: string;
  _end_point_path?: string[];
  _custom_data?: ObjectPayload;
}

export type ResponseObject = ServerResponse & {
  status: (value: number) => ResponseObject;
  json: (value: object) => void;
  text: (value?: string) => void;
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

export interface SimpleJsPrivateMethodProps {
  body: ObjectPayload;
  res: ResponseObject;
  req: RequestObject;
  query: ObjectPayload;
  customData: any
  id?: string;
}
