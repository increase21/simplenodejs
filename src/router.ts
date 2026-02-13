// router.ts
import fs from "node:fs";
import path from "node:path";
import { RequestObject, ResponseObject } from "./typings/general";
import { SimpleJsControllerMeta } from "./typings/simpletypes";
let controllers = new Map<string, SimpleJsControllerMeta>();


export function loadControllers(root = "controllers"): Map<string, SimpleJsControllerMeta> {
  const base = path.resolve(process.cwd(), root);
  const map = new Map<string, SimpleJsControllerMeta>();
  //walk up
  function walk(dir: string) {
    //get all the file in the directory
    for (const file of fs.readdirSync(dir)) {
      //add the file name and path
      const full = path.join(dir, file);
      //load direct and reload the files
      if (fs.statSync(full).isDirectory()) walk(full);
      //if it's file load the file
      else if (file.endsWith(".js") || file.endsWith(".ts")) {
        const mod = require(full);
        // const Controller = mod.default;
        if (!full.startsWith(base)) return;
        const Controller = require(full)?.default;
        if (typeof Controller !== "function") return;
        const key = full.replace(base, "").replace(/\\/g, "/").replace(/\.(ts|js)$/, "");
        map.set(key.toLowerCase(), { name: Controller.name, Controller });
      }
    }
  }

  walk(base);
  return map;
}

export function setControllersDir(dir: string) {
  controllers = loadControllers(dir);
}

export async function route(req: RequestObject, res: ResponseObject, controllersDir?: string) {
  // console.log("Router is called")
  const url = new URL(req.url!, "http://localhost");
  const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");

  let controllerPath = (parts.length > 2 ? "/" + parts.slice(0, 2).join("/") : `/${parts.join("/")}`).toLocaleLowerCase()
  let methodName = parts.length > 2 ? parts[2] : "index";
  let id = methodName !== "index" ? parts.slice(parts.indexOf(methodName) + 1) : null

  const meta = controllers.get(controllerPath);

  //if the controller is not available or not found
  if (!meta || !meta.name || !meta.Controller) return res.status(404).json({ error: "The requested resource does not exist" })

  const ControllerClass = meta.Controller;
  const controller = new ControllerClass();

  //if the endpoint not a function
  if (typeof controller[methodName] !== "function") {
    //if it's using index
    if (typeof controller["index"] === "function" && parts.length === 3) {
      methodName = "index"
      id = parts.slice(2)
    } else {
      return res.status(404).json({ error: "The requested resource does not exist" })
    }
  }

  //if the data require params but there's no matching params
  if (id && id.length && (!controller[methodName].length || controller[methodName].length < id.length)) {
    return res.status(404).json({ error: "The requested resource does not exist. Kindly check your url" })
  }

  //bind the controller to use the global properties
  controller.__bindContext({ req, res });

  ////if there's protected function to run
  if (typeof controller.__checkContext === "function") controller.__checkContext()

  const result = await controller[methodName](...(id || []));

  //if it's not responded
  if (!res.writableEnded && result) {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(result));
  }
}