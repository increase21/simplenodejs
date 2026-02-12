// router.ts
import fs from "node:fs";
import path from "node:path";
import { RequestObject, ResponseObject } from "./typings/context";

export interface ControllerMeta {
  name: string;
  file: string;
  Controller: any;
}

export function loadControllers(root = "controllers"): Map<string, ControllerMeta> {
  const base = path.resolve(process.cwd(), root);
  const map = new Map<string, ControllerMeta>();
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
        const Controller = mod.default;
        if (Controller) {
          const key = full.replace(base, "").replace(/\\/g, "/").replace(/\.(ts|js)$/, "");
          map.set(key.toLowerCase(), { name: Controller.name, file: full, Controller });
        }
      }
    }
  }

  walk(base);
  return map;
}

const controllers = loadControllers();

export async function route(req: RequestObject, res: ResponseObject, controllersDir?: string) {
  // console.log("Router is called")
  const url = new URL(req.url!, "http://localhost");
  const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");

  const controllerPath = "/" + parts.slice(0, -1).join("/");
  const methodName = parts[parts.length - 1] || "index";
  const id = parts[parts.length];

  const meta = controllers.get(controllerPath.toLowerCase());

  if (!meta) return res.status(404).text("The requested resource does not exist")

  const ControllerClass = meta.Controller;
  const controller = new ControllerClass(req, res);

  if (typeof controller[methodName] !== "function") {
    return res.status(404).text("The requested resource does not exist")
  }

  const result = await controller[methodName](id);

  if (!res.writableEnded && result !== undefined) {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(result));
  }
}