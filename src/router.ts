// router.ts
import { RequestObject, ResponseObject } from "./typings/general";
import { SimpleJsControllerMeta } from "./typings/simpletypes";
import { loadControllers, throwHttpError } from "./utils/helpers";
import { SimpleNodeJsController } from "./utils/simpleController";
let controllers = new Map<string, SimpleJsControllerMeta>();

const UNSAFE_METHODS = new Set([
  ...Object.getOwnPropertyNames(Object.prototype),
  ...Object.getOwnPropertyNames(SimpleNodeJsController.prototype),
]);

export function setControllersDir(dir: string) {
  controllers = loadControllers(dir);
}

export async function route(req: RequestObject, res: ResponseObject) {
  let parts = req._end_point_path || []
  let controllerPath = (parts.length > 2 ? "/" + parts.slice(0, 2).join("/") : `/${parts.join("/")}`).toLowerCase().replace(/\-{1}\w{1}/g, match => match.replace("-", "").toUpperCase());
  let methodName = parts.length > 2 ? parts[2] : "index";
  let id = methodName !== "index" ? parts.slice(3) : []
  let httpMethod = (req.method || "").toLowerCase()
  const meta = controllers.get(controllerPath);

  //if the controller is not available or not found
  if (!meta || !meta.name || !meta.Controller) return throwHttpError(404, "The requested resource does not exist")

  const ControllerClass = meta.Controller;
  const controller = new ControllerClass();

  //Update the method name to the framework pattern
  methodName = (methodName || "").replace(/\-{1}\w{1}/g, match => match.replace("-", "").toUpperCase());

  // Block Object.prototype methods (constructor, toString, etc.) and __private convention
  if (methodName.startsWith("__") || UNSAFE_METHODS.has(methodName)) {
    return throwHttpError(404, "The requested resource does not exist");
  }

  //if the endpoint not a function
  if (typeof controller[methodName] !== "function") {
    if (typeof controller["index"] === "function" && parts.length === 3) {
      methodName = "index";
      id = parts.slice(2) || []; // pass the rest of the path as ID;
    } else {
      return throwHttpError(404, "The requested resource does not exist");
    }
  }

  //if the data require params but there's no matching params
  if (id && id.length && (!controller[methodName].length || controller[methodName].length < id.length)) {
    return throwHttpError(404, "The requested resource does not exist")
  }

  //bind the controller to use the global properties
  (controller as any).__bindContext({ req, res });

  let result = await controller[methodName](...id);

  //if the cycle has ended
  if (res.writableEnded) return

  //if the controller returned nothing and response is not ended, end it
  if (!result && !res.writableEnded) return res.end();

  //if there's no method defined for the http verb, return 405
  if (result && typeof result[httpMethod] !== "function") return throwHttpError(405, "Method Not Allowed");

  // ID validation rules
  if (id.length && (!result.id || !result.id[httpMethod])) return throwHttpError(404, "Resource not found");
  if (result.id && result.id[httpMethod] === "required" && !id.length) return throwHttpError(404, "Resource not found");
  result = await result[httpMethod]({
    req, res, query: controller.query, body: controller.body,
    id: id.join("/"), customData: controller._custom_data
  });

  //if not responded
  if (!res.writableEnded) res.end("");
}