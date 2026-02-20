import { HttpMethod, ObjectPayload, RequestObject, ResponseObject, SimpleJsPrivateMethodProps } from "../typings/general";
import { SubRequestHandler } from "../typings/simpletypes";

export class SimpleNodeJsController {
  protected req!: RequestObject;
  protected res!: ResponseObject;
  protected body!: ObjectPayload;
  protected query!: ObjectPayload
  protected method!: HttpMethod;
  protected _custom_data!: any;

  /** @internal */
  private __bindContext(ctx: { req: RequestObject; res: ResponseObject; }) {
    this.req = ctx.req;
    this.res = ctx.res;
    this.body = ctx.req.body
    this.query = ctx.req.query
    this.method = (ctx.req.method || "").toLocaleLowerCase() as any
    this._custom_data = ctx.req._custom_data
    this.__checkContext();
  }

  protected __checkContext() { }

  protected __run(handlers: SubRequestHandler) {
    return handlers
  }
}