import { IncomingMessage, ServerResponse } from "http";

export interface Context {
  req: IncomingMessage;
  res: ServerResponse;
  body?: any;
  params?: Record<string, string>;
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