// router.ts
import { HttpMethod, RequestObject, ResponseObject } from "./typings/general";
import { SimpleJsControllerMeta, SimpleJsCtx, SimpleJsEndpoint } from "./typings/simpletypes";
import { loadControllers, composeMiddleware, throwHttpError } from "./utils/helpers";
import { SetBodyLimit } from "./utils/simpleMiddleware";

let controllers = new Map<string, SimpleJsControllerMeta>();
let globalBodyLimit: string | number | undefined;

export function setBodyConfig(opts: { limit?: string | number }) {
  globalBodyLimit = opts.limit;
}


function parseBody(req: RequestObject, res: ResponseObject, limit?: string | number): Promise<void> {
  return new Promise((resolve, reject) => {
    const r = req as any;
    const s = res as any;
    const maxSize = SetBodyLimit(limit ?? globalBodyLimit ?? "1mb");
    const contentType = r.headers["content-type"] || "";
    let size = 0;
    const chunks: any[] = [];

    r.on("data", (chunk: any) => {
      size += chunk.length;
      if (maxSize && size > maxSize) {
        reject({ code: 413, error: "Payload Too Large" });
        if (!s.writableEnded) s.status(413).end("Payload Too Large");
        r.destroy();
        r.socket?.destroy();
        return;
      }
      chunks.push(chunk);
    });

    r.on("end", () => {
      if (s.writableEnded) return resolve();
      try {
        const body = Buffer.concat(chunks).toString();
        if (body && contentType.includes("application/json")) {
          req.body = JSON.parse(body);
        } else {
          req.body = body || undefined;
        }
        resolve();
      } catch {
        reject({ code: 400, error: "Invalid Payload" });
        if (!s.writableEnded) s.status(400).end("Invalid Payload");
      }
    });

    r.on("error", () => {
      reject({ code: 400, error: "Request stream ended" });
      if (!s.writableEnded) s.status(400).end("Request stream ended");
    });
  });
}

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
    readBody: (limit?: string | number) => parseBody(req, res, limit).then(() => { ctx.body = req.body; }),
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

  // Auto-parse body unless the endpoint opts out or body was already consumed
  if (descriptor.ignoreStream !== true && req.body === undefined) {
    const r = req.headers
    const hasBody = r["content-type"] || (r["content-length"] && r["content-length"] !== "0")
    if (hasBody) {
      await parseBody(req, res, descriptor.bodyLimit);
      if (res.writableEnded) return;
      ctx.body = req.body;
    }
  }

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
