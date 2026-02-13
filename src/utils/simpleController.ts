import { HttpMethod, ObjectPayload, RequestObject, ResponseObject, SimpleJsPrivateMethodProps } from "../typings/general";
import { throwHttpError } from "./helpers";
type SubRequestHandler = Partial<Record<HttpMethod, (params: SimpleJsPrivateMethodProps) => any>>;

export class SimpleNodeJsController {
  protected req!: RequestObject;
  protected res!: ResponseObject;
  protected body!: ObjectPayload;
  protected query!: ObjectPayload
  protected method!: HttpMethod;
  protected _custom_data!: any;

  /** framework-internal method */
  __bindContext(ctx: { req: RequestObject; res: ResponseObject; }) {
    this.req = ctx.req;
    this.res = ctx.res;
    this.body = ctx.req.body
    this.query = ctx.req.query
    this.method = (ctx.req.method || "").toLocaleLowerCase() as any
    this._custom_data = ctx.req._custom_data
  }

  /** framework-internal method */
  __checkContext() { }

  protected RunRequest(handlers: SubRequestHandler, params?: SimpleJsPrivateMethodProps) {
    const method = this.req.method?.toLowerCase() as HttpMethod | undefined;

    if (!method) return throwHttpError(400, "Invalid HTTP Method");

    const runFn = handlers[method];

    if (typeof runFn !== "function") return throwHttpError(405, "Method Not Allowed");

    // ID validation rules
    if (params && params.id && (!params.idMethod || !params.idMethod[method])) return throwHttpError(404, "Resource not found");

    if (params && params.idMethod?.[method] === "required" && !params.id) return throwHttpError(404, "Resource not found");

    return runFn({
      ...(params || {}), req: this.req,
      res: this.res, query: this.query,
      customData: this._custom_data,
      body: this.body,
    });
  }
}