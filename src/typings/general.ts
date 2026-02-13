import http, { IncomingMessage, ServerResponse } from "http";
export type Next = () => Promise<void> | void;
export type Plugin = (app: SimpleJsServer, opts?: any) => Promise<void> | void;
export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

export type ObjectPayload = { [key: string]: any }
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
  registerPlugin: (plugin: Plugin) => Promise<void>;
  _environment: 'dev' | 'stag' | 'live'
}

export interface RequestObject extends IncomingMessage {
  body?: any;
  query?: any;
  id?: string
  _server_environment?: 'dev' | 'stag' | 'live'
  _custom_data?: ObjectPayload
}

export interface ResponseObject extends ServerResponse {
  status: (value: number) => ResponseObject;
  json: (value: object) => void;
  text: (value?: string) => void;
}

export interface SubRequestHandler {
  post?: (params: SimpleJsPrivateMethodProps) => void;
  put?: (params: SimpleJsPrivateMethodProps) => void;
  get?: (params: SimpleJsPrivateMethodProps) => void;
  delete?: (params: SimpleJsPrivateMethodProps) => void;
  patch?: (params: SimpleJsPrivateMethodProps) => void;
}

export interface SimpleJsPrivateMethodProps {
  body: ObjectPayload;
  res: ResponseObject;
  req: RequestObject;
  query: ObjectPayload;
  id?: string;
  customData?: any
  idMethod?: {
    post?: 'required' | 'optional',
    get?: 'required' | 'optional',
    put?: 'required' | 'optional',
    delete?: 'required' | 'optional',
    patch?: 'required' | 'optional',
  }
}
export type AcceptHeaderValue = 'application/media' | 'application/text'
