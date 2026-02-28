import { HttpMethod, RequestObject, SimpleJsPrivateMethodProps } from "./general";

export type SimpleJSRateLimitType = { windowMs: number; max: number; trustProxy?: boolean; keyGenerator?: (req: any) => string }
export type SimpleJSBodyParseType = {
  limit?: string | number;
  /**
   * Skip stream reading (and pass the raw stream to the handler) for matching requests.
   * Accepts a list of path prefixes or a predicate function.
   * Multipart requests are always skipped regardless of this option.
   * The `type` field determines whether the URL should be matched exactly (`exact`) or as a prefix (`prefix`).
   */
  ignoreStream?: { url: string, method: HttpMethod, type: 'exact' | 'prefix' }[] | ((req: RequestObject) => boolean);
}

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