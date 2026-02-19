import { HttpMethod, SimpleJsPrivateMethodProps } from "./general";

export type SimpleJSRateLimitType = { windowMs: number; max: number; trustProxy?: boolean; keyGenerator?: (req: any) => string }
export type SimpleJSBodyParseType = { limit?: string | number; }

export interface SimpleJsControllerMeta {
  name: string;
  Controller: any;
}

export interface SubRequestHandler {
  post?: (params: SimpleJsPrivateMethodProps) => void;
  put?: (params: SimpleJsPrivateMethodProps) => void;
  get?: (params: SimpleJsPrivateMethodProps) => void;
  delete?: (params: SimpleJsPrivateMethodProps) => void;
  patch?: (params: SimpleJsPrivateMethodProps) => void;
  id?: Partial<Record<HttpMethod, "required" | "optional">>;
}