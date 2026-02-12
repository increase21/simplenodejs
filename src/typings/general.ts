import http, { IncomingMessage, ServerResponse } from "http";
export type Next = () => Promise<void> | void;
export type Plugin = (app: SimpleJsServer, opts?: any) => Promise<void> | void;

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
  register: (plugin: Plugin, opts?: any) => Promise<void>;
  _environment: 'dev' | 'stag' | 'live'
}

export interface RequestObject extends IncomingMessage {
  body?: any;
  query?: any;
  _server_environment?: 'dev' | 'stag' | 'live'
  id?: string
}

export interface ResponseObject extends ServerResponse {
  status: (value: number) => ResponseObject;
  json: (value: object) => void;
  text: (value?: string) => void;
}

export interface SubRequestHandler {
  post?: (params: PrivateMethodProps) => void;
  put?: (params: PrivateMethodProps) => void;
  get?: (params: PrivateMethodProps) => void;
  delete?: (params: PrivateMethodProps) => void;
  patch?: (params: PrivateMethodProps) => void;
}

export interface PrivateMethodProps {
  body: ObjectPayload;
  res: ResponseObject;
  req: RequestObject;
  query: ObjectPayload;
  id?: string;
  idMethod?: {
    post?: 'required' | 'optional',
    get?: 'required' | 'optional',
    put?: 'required' | 'optional',
    delete?: 'required' | 'optional',
    patch?: 'required' | 'optional',
  }
}
export type AcceptHeaderValue = 'application/media' | 'application/text'
