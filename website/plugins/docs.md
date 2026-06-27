# SimpleJsDocsPlugin

Serves a self-contained API documentation page built from a folder of markdown files. You write each endpoint as prose plus a small `yaml` block; the plugin renders a single HTML page (inline CSS + JS, no external assets, no build step) with a landing page, per-group navigation, and search.

| Option | Type | Description |
|---|---|---|
| `dir` | `string` | **Required.** Folder containing the `.md` docs |
| `path` | `string` | Mount path. Default: `/docs` |
| `site` | `{ name?, tagline? }` | Title + tagline shown on the landing page |
| `vars` | `Record<string,string>` | Values usable as `{{var}}` inside docs (e.g. `base_url`). **Never put secrets here** — they render into a public page |
| `theme` | `DocsTheme` | Colors and font sizes (validated before use) |
| `enabled` | `boolean` | Whether the route is served. Default: `true`. Set `false` in production to hide your API surface |
| `watch` | `boolean` | Rebuild when the docs folder changes (dev). Default: `false` |

`DocsTheme` fields (all optional): `textColor`, `fontSize`, `fontFamily`, `sidebarBg`, `sidebarText`, `sidebarAccent`, `sidebarFontSize`, `accent`.

```ts
import { CreateSimpleJsHttpServer, SimpleJsDocsPlugin } from "simplejsnode";

const app = CreateSimpleJsHttpServer({ controllersDir: "./controllers" });

app.registerPlugin(app => SimpleJsDocsPlugin(app, {
  dir: "./docs/pages",
  path: "/docs",
  site: { name: "USER SERVICE", tagline: "API Documentation" },
  vars: { base_url: process.env.BASE_URL || "https://api.example.com" },
  theme: { sidebarBg: "#1a1f2e", accent: "#e0457b", fontSize: "16px" },
  enabled: process.env.NODE_ENV !== "production",
  watch: process.env.NODE_ENV !== "production",
}));
```

## Doc file format

One file per area (e.g. all auth endpoints together). A single frontmatter block at the top sets the `group` and `section` defaults; each endpoint is a `##` heading, a `yaml` metadata block, then markdown prose.

````md
---
group: User Route
section: Auths
---

## Login Account

```yaml
method: POST
url: "{{base_url}}/user/auths/login"
headers:
  - { name: Authorization, value: "Bearer <token>" }
fields:
  - { name: email, type: String, required: true, desc: "User email address" }
  - { name: password, type: String, required: false, desc: "When password login is used" }
response: |
  { "status": "ok", "data": {} }
```

Newly created users must reset their password on first login. When a reset
is required this endpoint returns `201` instead of `200`.
````

- `headers` accepts any number of request headers (not just `Authorization`).
- `{{base_url}}` and other `vars` are substituted at render time.
- The prose body supports headings, lists, bold/italic, inline code, fenced code, and links.

## Helpers

`loadDocs(dir, vars)` returns the parsed `DocModel`, and `renderDocs(model, opts)` returns the HTML string — use these directly if you want to serve or export the page yourself.

## Security

- **Link safety:** markdown links are protocol-checked; `javascript:`/`data:` schemes are dropped.
- **Theme safety:** color/size values are validated, preventing CSS injection.
- **Page-scoped CSP:** the response sets `Content-Security-Policy: default-src 'none'` allowing only its own inline style/script and no external connections — this overrides a stricter global CSP for the docs route so the page still renders.
- **Surface disclosure:** the page lists every endpoint, header, and payload. Keep `enabled: false` in production, or gate the route with `SimpleJsIPWhitelistPlugin` or auth.
- **Path safety:** only `.md` files resolving inside `dir` are read (symlinks pointing elsewhere are skipped). Non-`GET` requests return `405`.
