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
  let parts = (req._end_point_path || []).map(part => part.toLowerCase().replace(/\-{1}\w{1}/g, match => match.replace("-", "").toUpperCase()))
  let parthLen = parts.length
  if (parthLen < 2) return throwHttpError(404, "The requested resource does not exist")
  let controllerPath1 = `/${parts.join("/")}`
  let controllerPath2 = parthLen > 2 ? controllerPath1.split("/").slice(0, -1).join("/") : ""
  let controllerPath3 = parthLen > 3 ? controllerPath1.split("/").slice(0, -2).join("/") : ""
  const httpMethod = (req.method || "").toLowerCase() as HttpMethod
  const meta1 = controllers.get(controllerPath1)
  const meta2 = controllers.get(controllerPath2)
  const meta3 = controllers.get(controllerPath3)

  const meta = meta1 || meta2 || meta3
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

  // Get method name
  let methodName = parthLen > 2 ? parts[parthLen - 1] in ControllerClass.prototype ? parts[parthLen - 1] :
    parts[parthLen - 2] in ControllerClass.prototype ? parts[parthLen - 2] : null : null

  //if method name is null, set it to index
  methodName = methodName || "index"

  // Block Object.prototype methods and __private convention
  if (methodName.startsWith("__") || UNSAFE_METHODS.has(methodName)) return throwHttpError(404, "The requested resource does not exist");

  // Fallback to index if method not found (treat path segment as id)
  if (typeof controller[methodName] !== "function") return throwHttpError(404, "The requested resource does not exist");

  //get the id from the url
  let id = meta1 ? [] : meta2 ? parts.slice(controllerPath2.split("/").length - 1) : parts.slice(controllerPath3.split("/").length - 1)

  //remove the method name from the id
  id = id[0] === methodName ? id.slice(1) : id

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
