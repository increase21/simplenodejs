import { HttpMethod, ObjectPayload, RequestObject, ResponseObject, SimpleJsPrivateMethodProps } from "../typings/general";
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

  protected RunRequest(handlers: SubRequestHandler, params: SimpleJsPrivateMethodProps) {
    const method = this.req.method?.toLowerCase() as HttpMethod | undefined;

    if (!method) return this.res.status(400).json({ code: 400, error: "Invalid HTTP Method" });

    const runFn = handlers[method];

    if (typeof runFn !== "function") return this.res.status(405).json({ code: 405, error: "Method Not Allowed" });

    // ID validation rules
    if (params && params.id && (!params.idMethod || !params.idMethod[method])) {
      return this.res.status(404).json({ code: 404, error: "Resource not found" });
    }

    if (params && params.idMethod?.[method] === "required" && !params.id) {
      return this.res.status(404).json({ code: 404, error: "Resource not found" });
    }

    return runFn({
      ...(params || {}), req: this.req,
      res: this.res, query: this.query,
      customData: this._custom_data
    });
  }
}