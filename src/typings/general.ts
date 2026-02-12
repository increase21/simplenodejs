import http, { IncomingMessage, ServerResponse } from "http";
export type Next = () => Promise<void> | void;
export type Plugin = (app: SimpleJsServer, opts?: any) => Promise<void> | void;

export type Middleware = (
  req: RequestObject,
  res: ResponseObject,
  next: () => Promise<void> | void
) => Promise<void> | void;

export type ErrorMiddleware = (
  err: any,
  req: RequestObject,
  res: ResponseObject,
  next: Next
) => Promise<void> | void;

export interface SimpleJsServer extends http.Server {
  use(mw: Middleware): Promise<any> | void;
  useError: (mw: ErrorMiddleware) => void;
  register: (plugin: Plugin, opts?: any) => Promise<void>;
}

export interface RequestObject extends IncomingMessage {
  body?: any;
  query?: any;
  _server_environment?: 'dev' | 'stag' | 'live'
  _body_size?: 0
}

export interface ResponseObject extends ServerResponse {
  status: (value: number) => ResponseObject;
  json: (value: object) => void;
  text: (value?: string) => void;
}

export type AcceptHeaderValue = 'application/media' | 'application/text'
