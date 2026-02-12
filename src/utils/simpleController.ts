import { RequestObject, ResponseObject } from "../typings/general";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

type SubRequestHandler = Partial<Record<HttpMethod, (params: PrivateMethodProps) => any>>;

interface PrivateMethodProps {
  id?: string;
  idMethod?: Partial<Record<HttpMethod, "required" | "optional">>;
}

export class SimpleNodeJsController {
  protected req!: RequestObject;
  protected res!: ResponseObject;

  /** framework-internal method */
  _bindContext(ctx: { req: RequestObject; res: ResponseObject; }) {
    this.req = ctx.req;
    this.res = ctx.res;
  }

  protected RunRequest(handlers: SubRequestHandler, params?: PrivateMethodProps) {
    const method = this.req.method?.toLowerCase() as HttpMethod | undefined;

    if (!method) {
      return this.res.status(400).json({ code: 400, msg: "Invalid HTTP Method" });
    }

    const runFn = handlers[method];

    if (typeof runFn !== "function") {
      return this.res.status(405).json({ code: 405, msg: "Method Not Allowed" });
    }

    // ID validation rules
    if (params && params.id && (!params.idMethod || !params.idMethod[method])) {
      return this.res.status(404).json({ code: 404, msg: "Resource not found" });
    }

    if (params && params.idMethod?.[method] === "required" && !params.id) {
      return this.res.status(404).json({ code: 404, msg: "Resource not found" });
    }

    return runFn({
      ...(params || {}),
      req: this.req,
      res: this.res,
    } as PrivateMethodProps);
  }
}