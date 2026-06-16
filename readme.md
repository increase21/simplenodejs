# @increase21/simplenodejs

**SimpleNodeJS** is a minimal, dependency-free Node.js framework built on top of Node's native `http` and `https` modules.
It provides controller-based routing, middleware, plugins, and security utilities with full TypeScript support.

---

## Features

- Native Node.js HTTP/HTTPS server (no Express/Fastify)
- Controller-based routing (file-system driven)
- Middleware & error middleware
- Plugin system
- Individual security middlewares (CORS, HSTS, CSP, Helmet, etc.)
- Rate limiting with proxy support
- Cookie parsing & signed cookies
- IP whitelist/blacklist
- Request logging, timeouts, cache control, maintenance mode
- Body and query parsing
- TypeScript-first
- Reverse-proxy friendly (Nginx, load balancers)

---

## Installation

```bash
npm install @increase21/simplenodejs
```

---

## Quick Start

```ts
import {
  CreateSimpleJsHttpServer,
  SetHelmet,
  SetCORS,
  SetRateLimiter,
} from "@increase21/simplenodejs";

const app = CreateSimpleJsHttpServer({
  controllersDir: process.cwd() + "/controllers",
  bodyLimit: "2mb",
});

app.use(SetCORS());
app.use(SetHelmet());
app.use(SetRateLimiter({ windowMs: 60_000, max: 100 }));

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

---

## CreateSimpleJsHttpServer(options)

Creates and returns an HTTP app instance.

| Param | Type | Required | Description |
|------|------|----------|-------------|
| `controllersDir` | `string` | ✅ | Path to your controllers directory |
| `bodyLimit` | `string \| number` | ❌ | Global max body size (e.g. `"2mb"`, `"500kb"`, or bytes). Default: `"1mb"` |

## CreateSimpleJsHttpsServer(options)

Creates and returns an HTTPS app instance.

| Param | Type | Required | Description |
|------|------|----------|-------------|
| `controllersDir` | `string` | ✅ | Path to your controllers directory |
| `tlsOpts` | `https.ServerOptions` | ✅ | TLS options (key, cert, etc.) |
| `bodyLimit` | `string \| number` | ❌ | Global max body size (e.g. `"2mb"`, `"500kb"`, or bytes). Default: `"1mb"` |

```ts
import fs from "fs";
import { CreateSimpleJsHttpsServer } from "@increase21/simplenodejs";

const app = CreateSimpleJsHttpsServer({
  controllersDir: process.cwd() + "/controllers",
  tlsOpts: {
    key: fs.readFileSync("key.pem"),
    cert: fs.readFileSync("cert.pem"),
  },
});

app.listen(443);
```

---

## Controllers

Controllers are auto-loaded from `controllersDir` at startup. The file path maps directly to a URL. Controllers must be exported as the default export; otherwise, requests to that controller will return a 404 error.

```
controllers/
  drivers/
      auths.ts        → /drivers/auths

  customers/
      auths.ts       → /customers/auths
      accounts      → /customers/accounts
```

Controllers are plain classes — no base class required. Each method represents an endpoint and returns a `SimpleJsEndpoint` (an array of `SimpleJsEndpointDescriptor` objects) that declares which HTTP methods are supported and which handler to call.

Every controller receives the request context (`SimpleJsCtx`) via its constructor and it is also available as `this.ctx` anywhere inside the class — in endpoint methods, descriptor handlers, and private helpers.

```ts
// controllers/drivers/auths.ts
import { SimpleJsCtx, SimpleJsEndpoint } from "@increase21/simplenodejs";

export default class AuthController {
  ctx: SimpleJsCtx;

  // single HTTP method — access this.ctx directly, no descriptor needed
  async login(): Promise<void> {
    if (this.ctx.method !== "post") return this.ctx.res.status(405).json({ error: "Method Not Allowed" });
    // other logic...
  }

  // multiple HTTP methods — return a SimpleJsEndpoint array
  async vehicleList(id?: string): Promise<SimpleJsEndpoint> {
    return [
      { method: "get",    id: "optional", handler: getVehicles },
      { method: "put",    id: "required", handler: updateVehicle },
      { method: "delete", id: "required", handler: deleteVehicle },
    ];
  }
}
```

> `this.ctx` is injected automatically by the router on every request. You do not need to pass it around manually — it is always available anywhere in the class.

### Endpoint Naming

Controller methods use **camelCase** and are exposed as **kebab-case** URLs.

| Method name | URL |
|---|---|
| `async index()` | `/drivers/auths` |
| `async login()` | `/drivers/auths/login` |
| `async vehicleList()` | `/drivers/auths/vehicle-list` |

### ID Parameters

Declare `id` in the endpoint method signature to indicate it accepts an ID segment. Use the descriptor's `id` field to enforce whether it is required or optional at the routing level.

```ts
// GET  /drivers/auths/vehicle-list         → id is optional
// GET  /drivers/auths/vehicle-list/123     → id = "123"
// PUT  /drivers/auths/vehicle-list/123     → required, 404 if missing
// DELETE  /drivers/auths/vehicle-list/123  → required, 404 if missing
```

---

## SimpleJsCtx

The context object passed to every endpoint method and handler. Accepts an optional generic type `T` for `customData`.

| Property | Type | Description |
|---|---|---|
| `req` | `RequestObject` | Raw request object |
| `res` | `ResponseObject` | Raw response object |
| `body` | `object` | Parsed request body |
| `query` | `object` | Parsed query string |
| `method` | `HttpMethod` | HTTP method of the request (`"get"`, `"post"`, etc.) |
| `customData` | `T` (default `any`) | Data attached by plugins/middlewares via `req._custom_data` |
| `readBody(limit?)` | `(limit?: string \| number) => Promise<void>` | Manually parse the request body. Call this inside void-returning controller methods that handle the response directly. Parsed result is available on `ctx.body` after awaiting. No-op if the body was already parsed. |

```ts
// Typed customData
const cookies = (ctx as SimpleJsCtx<{ cookies: Record<string, string> }>).customData.cookies;
```

**`readBody` — void-returning controller methods**

For controller methods that handle the response directly (no `SimpleJsEndpoint` return), call `ctx.readBody()` before accessing `ctx.body`:

```ts
export default class AuthController {
  ctx: SimpleJsCtx;

  async login() {
    await this.ctx.readBody();
    const { email, password } = this.ctx.body;
    // handle response directly...
  }
}
```

A per-call size limit can be passed to override the global `bodyLimit`:

```ts
await this.ctx.readBody("500kb");
```

`readBody` is a no-op if the body was already parsed, so calling it more than once is safe.

## SimpleJsEndpoint

`SimpleJsEndpoint` is the return type for controller endpoint methods. It is equivalent to `SimpleJsEndpointDescriptor[]`.

## SimpleJsEndpointDescriptor

Each object in the `SimpleJsEndpoint` array describes one HTTP verb handler.

| Property | Type | Required | Description |
|---|---|---|---|
| `method` | `HttpMethod` | ✅ | HTTP verb: `"get"`, `"post"`, `"put"`, `"patch"`, `"delete"` |
| `handler` | `(ctx, id?) => any` | ✅ | Method reference to call for this HTTP verb |
| `id` | `"required" \| "optional"` | ❌ | ID routing rule. Omit if the endpoint never uses an ID |
| `middleware` | `Middleware[]` | ❌ | Array of middlewares to run before the handler |
| `bodyLimit` | `string \| number` | ❌ | Per-endpoint max body size override (e.g. `"50mb"`). Overrides the global `bodyLimit` |
| `ignoreStream` | `boolean` | ❌ | Set to `true` to skip body parsing entirely and receive the raw stream in the handler |

---

## RequestObject (req)

Extends Node's `IncomingMessage` with additional properties.

| Property | Type | Description |
|---|---|---|
| `req.query` | `object` | Parsed query string parameters |
| `req.body` | `any` | Parsed request body (automatically populated when a body is present) |
| `req.id` | `string` | Auto-generated UUID for the request (also sent as `X-Request-Id` header) |
| `req._custom_data` | `object` | Shared data bag written by plugins (payload, cookies, etc.) |

---

## ResponseObject (res)

Extends Node's `ServerResponse` with helper methods.

| Method | Params | Description |
|---|---|---|
| `res.status(code)` | `number` | Set HTTP status code, chainable |
| `res.json(data)` | `object` | Send a JSON response |
| `res.text(data?)` | `string` | Send a plain text response |

```ts
res.status(200).json({ success: true });
res.status(404).text("Not found");
```

---

## app.use(middleware)

Registers a middleware that runs on every request before controllers.

### Middleware signature

```ts
(req: RequestObject, res: ResponseObject, next: () => Promise<void> | void) => Promise<any> | void
```

### Example

```ts
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});
```

---

## app.useError(errorMiddleware)

Registers a global error handler. Catches all errors thrown in middlewares, controllers, and async handlers.

```ts
app.useError((err, req, res, next) => {
  const status = err?.statusCode || 500;
  res.status(status).json({ error: err.message });
});
```

---

## app.registerPlugin(plugin)

Registers a plugin function.

```ts
type Plugin = (app: SimpleJsServer, opts?: any) => Promise<any> | void;
```

```ts
app.registerPlugin(app => SimpleJsSecurityPlugin(app, opt));
```

---

# Built-in Middlewares

## Body Parsing

Body parsing is **automatic** — no middleware registration required. When a request carries a body (`Content-Type` or `Content-Length` header), the framework reads and parses it before your handler runs. The result is available as `ctx.body`.

**JSON** bodies (`application/json`) are parsed to an object. All other content types are left as a raw string.

### Global limit

Set the max payload size for all endpoints via the server options:

```ts
const app = CreateSimpleJsHttpServer({
  controllersDir: process.cwd() + "/controllers",
  bodyLimit: "5mb",   // default: "1mb"
});
```

Accepts a string (`"500kb"`, `"10mb"`) or a number of bytes. Requests exceeding the limit are rejected immediately with `413 Payload Too Large`.

### Per-endpoint limit

Override the global limit for a specific endpoint using the `limit` field on the descriptor:

```ts
return [
  { method: "post", bodyLimit: "50mb", handler: uploadHandler },
  { method: "get",  handler: listHandler },
];
```

The per-endpoint `limit` takes precedence over the global `bodyLimit`.

### Raw stream endpoints (`ignoreStream`)

Set `ignoreStream: true` on a descriptor to skip body parsing entirely. The raw Node.js stream is passed directly to your handler — useful when piping to a library like `formidable` or `busboy`:

```ts
return [
  { method: "post", ignoreStream: true, handler: uploadHandler },
];
```

When `ignoreStream` is `true`, `ctx.body` is `undefined` and your handler is responsible for consuming the stream.

### SetBodyParser

> **Deprecated** — `SetBodyParser` will be removed in a future release. Use `bodyLimit` on the server options and `bodyLimit` / `ignoreStream` on the endpoint descriptor instead.

---

## SetCORS(options?)

Sets `Access-Control-*` headers and handles OPTIONS preflight.

| Param | Type | Default | Description |
|---|---|---|---|
| `origin` | `string` | `"*"` | Allowed origin |
| `methods` | `string` | `"GET, POST, DELETE, PUT, PATCH"` | Allowed methods |
| `headers` | `string` | standard set | Allowed headers |
| `credentials` | `boolean` | `false` | Allow cookies/auth headers. Requires `origin` to be set to a specific domain |

```ts
// Public API
app.use(SetCORS());

// Credentialed (cookies, Authorization header)
app.use(SetCORS({ origin: "https://myapp.com", credentials: true }));
```

---

## SetHelmet(options?)

Sets all security response headers in one call. Each header can be individually overridden or disabled.

| Option | Header | Default |
|---|---|---|
| `hsts` | `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `csp` | `Content-Security-Policy` | `default-src 'none'` |
| `frameGuard` | `X-Frame-Options` | `DENY` |
| `noSniff` | `X-Content-Type-Options` | `nosniff` |
| `referrerPolicy` | `Referrer-Policy` | `no-referrer` |
| `permissionsPolicy` | `Permissions-Policy` | all features blocked |
| `coep` | `Cross-Origin-Embedder-Policy` | `require-corp` |
| `coop` | `Cross-Origin-Opener-Policy` | `same-origin` |

Pass `false` to disable any individual header. Pass a string to override the value.

```ts
// All defaults
app.use(SetHelmet());

// HTTP server — disable HSTS, relax CSP
app.use(SetHelmet({
  hsts: false,
  csp: "default-src 'self'",
  coep: false,
}));
```

---

## Individual Security Headers

Each header is also available as a standalone middleware:

| Function | Header |
|---|---|
| `SetHSTS(opts?)` | `Strict-Transport-Security` |
| `SetCSP(policy?)` | `Content-Security-Policy` |
| `SetFrameGuard(action?)` | `X-Frame-Options` |
| `SetNoSniff()` | `X-Content-Type-Options` |
| `SetReferrerPolicy(policy?)` | `Referrer-Policy` |
| `SetPermissionsPolicy(policy?)` | `Permissions-Policy` |
| `SetCOEP(value?)` | `Cross-Origin-Embedder-Policy` |
| `SetCOOP(value?)` | `Cross-Origin-Opener-Policy` |

```ts
app.use(SetFrameGuard("SAMEORIGIN"));
app.use(SetCSP("default-src 'self'; img-src *"));
app.use(SetHSTS({ maxAge: 63072000, preload: true }));
```

> `SetHSTS` is only meaningful on HTTPS. Browsers silently ignore it over plain HTTP.

---

## SetRateLimiter(options)

Limits repeated requests per client IP using an in-memory store.

| Param | Type | Required | Description |
|---|---|---|---|
| `windowMs` | `number` | ✅ | Time window in milliseconds |
| `max` | `number` | ✅ | Max requests per window |
| `trustProxy` | `boolean` | ❌ | If `true`, reads IP from `X-Forwarded-For` (for Nginx/load balancers). Default: `false` |
| `keyGenerator` | `(req) => string` | ❌ | Custom key function (e.g. by user ID instead of IP) |

```ts
app.use(SetRateLimiter({ windowMs: 60_000, max: 100 }));

// Behind Nginx
app.use(SetRateLimiter({ windowMs: 60_000, max: 100, trustProxy: true }));
```

> The store is in-memory and per-process. In clustered/multi-worker deployments each worker maintains its own counter. Use a custom `keyGenerator` with an external store for distributed rate limiting.

---

# Plugins

## SimpleJsSecurityPlugin

Convenience plugin combining CORS, Helmet, and rate limiting.

```ts
import { SimpleJsSecurityPlugin } from "@increase21/simplenodejs";

app.registerPlugin(app => SimpleJsSecurityPlugin(app, {
  cors: { origin: "https://myapp.com", credentials: true },
  helmet: { hsts: false },
  rateLimit: { windowMs: 60_000, max: 200 },
}));
```

---

## SimpleJsCookiePlugin + SignCookie

Parses the `Cookie` header on every request. Cookies are available at `this._custom_data.cookies`.

If a `secret` is provided, signed cookies (prefixed with `s:`) are verified using HMAC-SHA256. Cookies with invalid signatures are silently dropped.

| Option | Type | Description |
|---|---|---|
| `secret` | `string` | Optional signing secret for verified cookies |
| `dataKey` | `string` | Key on `_custom_data`. Default: `"cookies"` |

```ts
import { SimpleJsCookiePlugin, SignCookie } from "@increase21/simplenodejs";

// Register plugin
app.registerPlugin(app => SimpleJsCookiePlugin(app, {
  secret: process.env.COOKIE_SECRET,
}));

// Set a signed cookie in a handler
const signed = SignCookie(sessionId, process.env.COOKIE_SECRET!);
ctx.res.setHeader("Set-Cookie", `session=${signed}; HttpOnly; Secure; SameSite=Strict`);

// Read cookie in any handler
const { session } = ctx.customData.cookies;
```

---

## SimpleJsIPWhitelistPlugin

Allows or blocks requests by client IP address.

| Option | Type | Description |
|---|---|---|
| `ips` | `string[]` | List of IP addresses |
| `mode` | `"allow" \| "deny"` | `"allow"` = whitelist (only listed IPs pass). `"deny"` = blacklist (listed IPs are blocked). Default: `"allow"` |
| `trustProxy` | `boolean` | Read IP from `X-Forwarded-For`. Default: `false` |

```ts
import { SimpleJsIPWhitelistPlugin } from "@increase21/simplenodejs";

// Only allow specific IPs (whitelist)
app.registerPlugin(app => SimpleJsIPWhitelistPlugin(app, {
  ips: ["203.0.113.10", "198.51.100.5"],
  mode: "allow",
}));

// Block known bad IPs (blacklist)
app.registerPlugin(app => SimpleJsIPWhitelistPlugin(app, {
  ips: ["203.0.113.99"],
  mode: "deny",
  trustProxy: true,
}));
```

---

## SimpleJsRequestLoggerPlugin

Logs every completed request with method, URL, status code, and duration.

| Option | Type | Description |
|---|---|---|
| `logger` | `(msg: string) => void` | Custom log function. Default: `console.log` |
| `format` | `"simple" \| "json"` | Log format. Default: `"simple"` |

```ts
import { SimpleJsRequestLoggerPlugin } from "@increase21/simplenodejs";

// Simple text logs
app.registerPlugin(app => SimpleJsRequestLoggerPlugin(app));
// → [2025-01-01T00:00:00.000Z] GET /users/auth/login 200 12ms

// JSON logs (for log aggregators)
app.registerPlugin(app => SimpleJsRequestLoggerPlugin(app, {
  format: "json",
  logger: (msg) => process.stdout.write(msg + "\n"),
}));
// → {"time":"...","method":"GET","url":"/users/auth/login","status":200,"ms":12,"id":"uuid"}
```

---

## SimpleJsTimeoutPlugin

Automatically closes requests that exceed the configured time limit with `503`.

| Option | Type | Description |
|---|---|---|
| `ms` | `number` | Timeout in milliseconds |
| `message` | `string` | Custom timeout message. Default: `"Request timeout"` |

```ts
import { SimpleJsTimeoutPlugin } from "@increase21/simplenodejs";

app.registerPlugin(app => SimpleJsTimeoutPlugin(app, { ms: 10_000 }));
```

---

## SimpleJsCachePlugin

Sets `Cache-Control` response headers globally.

| Option | Type | Description |
|---|---|---|
| `maxAge` | `number` | Max age in seconds |
| `private` | `boolean` | Mark as private (user-specific, not shared caches) |
| `noStore` | `boolean` | Disable all caching entirely |

```ts
import { SimpleJsCachePlugin } from "@increase21/simplenodejs";

// Public cache for 5 minutes
app.registerPlugin(app => SimpleJsCachePlugin(app, { maxAge: 300 }));

// No caching (APIs with sensitive data)
app.registerPlugin(app => SimpleJsCachePlugin(app, { noStore: true }));
```

---

## SimpleJsMaintenanceModePlugin

Returns `503` for all traffic when maintenance mode is on. Specific IPs (e.g. your office or CI server) can bypass.

| Option | Type | Description |
|---|---|---|
| `enabled` | `boolean` | Toggle maintenance mode |
| `message` | `string` | Custom response message |
| `allowIPs` | `string[]` | IPs that bypass maintenance mode |
| `trustProxy` | `boolean` | Read IP from `X-Forwarded-For`. Default: `false` |

```ts
import { SimpleJsMaintenanceModePlugin } from "@increase21/simplenodejs";

app.registerPlugin(app => SimpleJsMaintenanceModePlugin(app, {
  enabled: process.env.MAINTENANCE === "true",
  message: "We are upgrading. Back soon.",
  allowIPs: ["203.0.113.10"],
}));
```

---

# Security Best Practices

- Always register `SetHelmet()` or individual header middlewares
- Use `SetRateLimiter` on all public endpoints
- Enable `credentials: true` in `SetCORS` only with a specific `origin` — never with a wildcard
- Only set `trustProxy: true` on `SetRateLimiter` or `SimpleJsIPWhitelistPlugin` when running behind a trusted reverse proxy (Nginx, etc.)
- Set a reasonable `bodyLimit` on server creation to prevent oversized payloads; override per endpoint with the descriptor's `limit` field
- Use `app.useError` to handle errors uniformly — unhandled errors return `"Service unavailable"` with no internal details exposed
- Add `HttpOnly; Secure; SameSite=Strict` attributes when setting cookies via `Set-Cookie`
- On HTTPS deployments, register `SetHSTS()` or include it in `SetHelmet()`

---

## License

MIT

---

## Author

Increase
