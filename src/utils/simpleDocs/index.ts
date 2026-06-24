// SimpleJsDocsPlugin — serves a self-contained API docs page from a folder of
// markdown files. Follows the framework's plugin convention: call it with the
// app and options; it registers a middleware that answers the docs path.
import { watch } from "node:fs";
import { resolve } from "node:path";
import { RequestObject, ResponseObject } from "../../typings/general";
import { SimpleJsServer } from "../../typings/simpletypes";
import { DocsPluginOptions } from "../../typings/docs";
import { loadDocs } from "./load";
import { renderDocs } from "./render";

export { loadDocs } from "./load";
export { renderDocs } from "./render";

/**
 * Mounts an API documentation page.
 *
 * Security notes:
 * - The page enumerates every endpoint, header and payload. Keep `enabled`
 *   off in production, or gate the route (e.g. SimpleJsIPWhitelistPlugin/auth),
 *   to avoid disclosing your internal API surface.
 * - The response carries a page-scoped Content-Security-Policy that allows only
 *   its own inline style/script and forbids any external connection. This
 *   overrides a stricter global CSP for the docs route so the page still works.
 * - `vars` render into a public page — never put secrets in them.
 */
export function SimpleJsDocsPlugin(app: SimpleJsServer, opts: DocsPluginOptions): void {
  if (!opts || !opts.dir) throw new Error("SimpleJsDocsPlugin requires opts.dir");
  if (opts.enabled === false) return;

  const mount = "/" + String(opts.path || "/docs").replace(/^\/+|\/+$/g, "");
  const dir = resolve(opts.dir);

  const build = (): string => renderDocs(loadDocs(dir, opts.vars || {}), opts);

  let html = build();

  if (opts.watch) {
    try {
      watch(dir, { persistent: false }, () => {
        try {
          html = build();
        } catch {
          // keep the last good build if a save leaves the folder mid-edit
        }
      });
    } catch {
      // fs.watch may be unsupported on some platforms — ignore
    }
  }

  app.use(async (req: RequestObject, res: ResponseObject, next: () => Promise<any> | void) => {
    const path = "/" + String(req.url || "").split("?")[0].replace(/^\/+|\/+$/g, "");
    if (path !== mount) return next();

    if ((req.method || "GET").toUpperCase() !== "GET") {
      res.statusCode = 405;
      res.setHeader("Allow", "GET");
      return res.end("Method Not Allowed");
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'none'"
    );
    res.end(html);
  });
}
