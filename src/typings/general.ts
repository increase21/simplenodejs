import http, { IncomingMessage, ServerResponse } from "http";
export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
export type ObjectPayload = { [key: string]: any }
export interface RequestObject extends IncomingMessage {
  body?: any;
  query?: any;
  id?: string;
  _end_point_path?: string[];
  _custom_data?: ObjectPayload;
}

export interface ResponseObject extends ServerResponse {
  status: (value: number) => ResponseObject;
  json: (value: object) => void;
  text: (value?: string) => void;
}
