import http, { IncomingMessage, ServerResponse } from "http";
export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
export type ObjectPayload = { [key: string]: any }
export interface SimpleJsRequestObject extends IncomingMessage {
  body?: any;
  query?: any;
  /** Unique id for this request, also sent as the X-Request-Id response header. */
  id?: string;
  /** Normalized, lowercased path the router matched on (no query string). */
  path?: string;
  /** The request URL exactly as received. `req.url` holds the normalized path plus query. */
  originalUrl?: string;
  /** Aborted when the client disconnects or SimpleJsTimeoutPlugin fires. */
  abortSignal?: AbortSignal;
  _end_point_path?: string[];
  _custom_data?: ObjectPayload;
}

export interface SimpleJsResponseObject extends ServerResponse {
  status: (value: number) => SimpleJsResponseObject;
  json: (value: object) => void;
  text: (value?: string) => void;
}
