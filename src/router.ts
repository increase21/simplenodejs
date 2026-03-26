// router.ts
import { HttpMethod, RequestObject, ResponseObject } from "./typings/general";
import { SimpleJsControllerMeta, SimpleJsCtx, SimpleJsEndpoint } from "./typings/simpletypes";
import { loadControllers, composeMiddleware, throwHttpError } from "./utils/helpers";
let controllers = new Map<string, SimpleJsControllerMeta>();

const UNSAFE_METHODS = new Set([
  ...Object.getOwnPropertyNames(Object.prototype),
]);

export function setControllersDir(dir: string) {
  controllers = loadControllers(dir);
}

export async function route(req: RequestObject, res: ResponseObject) {
  let parts = req._end_point_path || []
  let controllerPath = (parts.length > 2 ? "/" + parts.slice(0, 2).join("/") : `/${parts.join("/")}`).toLowerCase().replace(/\-{1}\w{1}/g, match => match.replace("-", "").toUpperCase());
  let methodName = parts.length > 2 ? parts[2] : "index";
  let id = methodName !== "index" ? parts.slice(3) : []
  const httpMethod = (req.method || "").toLowerCase() as HttpMethod
  const meta = controllers.get(controllerPath);

  if (!meta || !meta.name || !meta.Controller) return throwHttpError(404, "The requested resource does not exist")

  const ctx: SimpleJsCtx = {
    req, res,
    body: req.body,
    query: req.query,
    method: httpMethod,
    customData: req._custom_data,
  }

  const ControllerClass = meta.Controller;
  const controller = new ControllerClass(ctx);

  //if request has ended, do not proceed
  if (res.writableEnded) return

  //sanitize method name, convert kebab-case to camelCase
  methodName = (methodName || "").replace(/\-{1}\w{1}/g, match => match.replace("-", "").toUpperCase());

  // Block Object.prototype methods and __private convention
  if (methodName.startsWith("__") || UNSAFE_METHODS.has(methodName)) {
    return throwHttpError(404, "The requested resource does not exist");
  }

  // Fallback to index if method not found (treat path segment as id)
  if (typeof controller[methodName] !== "function") {
    if (typeof controller["index"] === "function" && parts.length === 3) {
      id = parts.slice(2);
      methodName = "index";
    } else {
      return throwHttpError(404, "The requested resource does not exist");
    }
  }
  //checking if the method does not require id but id is provided, if so, return 404
  if (id.length && !controller[methodName].length) return throwHttpError(404, "Resource not found")

  //also add the context to the controller instance so that it can be accessed in the methods without passing it as a parameter
  controller.ctx = ctx;

  const descriptors: SimpleJsEndpoint = await controller[methodName](...id)
  // If the controller method has already sent a response, do not proceed
  if (res.writableEnded) return

  //if the handler returns no descriptors or an invalid format, end the response
  if (!descriptors || !Array.isArray(descriptors)) return res.end()

  // Find the descriptor matching the HTTP method
  const descriptor = descriptors.find(d => d.method === httpMethod)

  if (!descriptor) return throwHttpError(405, "Method Not Allowed")

  // Id validation
  if (id.length && !descriptor.id) return throwHttpError(404, "Resource not found")
  if (descriptor.id === "required" && !id.length) return throwHttpError(404, "Resource not found")

  // Run endpoint-level middlewares before the handler
  if (descriptor.middleware && descriptor.middleware.length) {
    await composeMiddleware(descriptor.middleware)(req, res);
  }
  // If the handler has already sent a response, do not proceed
  if (res.writableEnded) return;

  // bind to controller so `this` works in regular methods too
  await descriptor.handler.bind(controller)(ctx, ...id)

  if (!res.writableEnded) res.end("")
}
