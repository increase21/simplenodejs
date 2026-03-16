// router.ts
import { RequestObject, ResponseObject } from "./typings/general";
import { SimpleJsControllerMeta } from "./typings/simpletypes";
import { loadControllers, throwHttpError } from "./utils/helpers";
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
  const httpMethod = (req.method || "").toLowerCase()
  const meta = controllers.get(controllerPath);

  if (!meta || !meta.name || !meta.Controller) return throwHttpError(404, "The requested resource does not exist")

  const ControllerClass = meta.Controller;
  const controller = new ControllerClass();

  methodName = (methodName || "").replace(/\-{1}\w{1}/g, match => match.replace("-", "").toUpperCase());

  // Block Object.prototype methods and __private convention
  if (methodName.startsWith("__") || UNSAFE_METHODS.has(methodName)) {
    return throwHttpError(404, "The requested resource does not exist");
  }

  const ctx = {
    req, res,
    body: req.body,
    query: req.query,
    customData: req._custom_data,
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
  if (id.length && (!controller[methodName].length || controller[methodName].length === 1)) {
    return throwHttpError(404, "Resource not found")
  }

  const descriptors = await controller[methodName](ctx, ...id)

  if (res.writableEnded) return

  if (!descriptors || !Array.isArray(descriptors)) return res.end()

  const descriptor = descriptors.find((d: any) => d.method === httpMethod)

  if (!descriptor) return throwHttpError(405, "Method Not Allowed")

  // Id validation
  if (id.length && !descriptor.id) return throwHttpError(404, "Resource not found")
  if (descriptor.id === "required" && !id.length) return throwHttpError(404, "Resource not found")

  // bind to controller so `this` works in regular methods too
  await descriptor.handler.bind(controller)(ctx, ...id)

  if (!res.writableEnded) res.end("")
}
