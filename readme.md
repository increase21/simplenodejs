# @increase21/simplenodejs

**SimpleNodeJS** is a minimal, dependency-free Node.js framework built on top of Node’s native `http` and `https` module.  
It provides controller-based routing, middleware, plugins, and security utilities with full TypeScript support.

---

## ✨ Features

- Native Node.js HTTP server (no Express/Fastify)
- Controller-based routing (file-system driven)
- Middleware & error middleware
- Plugin system
- Built-in security middlewares
- Rate limiting
- CORS
- body and Query parsing
- HTML responses
- TypeScript-first
- Reverse-proxy friendly (Nginx)

---

## 📦 Installation

```bash
npm install @increase21/simplenodejs
```

---

## 🚀 Quick Start

```ts
import { CreateSimpleJsHttpServer } from "@increase21/simplenodejs";

const app = CreateSimpleJsHttpServer({
  controllersDir: process.cwd()+ "/controllers",
  trustProxy: true
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

---

## ⚙️ CreateSimpleJsHttpServer(options)

Creates and returns the HTTP app instance.

### Parameters

| Param | Type | Required | Description |
|------|------|----------|-------------|
| `controllersDir` | `string` | ✅ | Absolute path to your controllers directory |
<!-- | `trustProxy` | `boolean` | ❌ | If `true`, uses `x-forwarded-for` for IP detection (for Nginx/load balancers) |
| `globalPrefix` | `string` | ❌ | Prefix all routes, e.g. `/api` | -->

### Example

```ts
const app = CreateSimpleJsHttpServer({
  controllersDir: process.cwd()+ "/controllers",
});

app.listen(4000,callback)

```

---

## 📁 Controllers

Controllers are auto-loaded from `controllersDir`.

```ts
export default AuthControllers extends SimpleNodeJsController {

 async login(id:string) {
    return this.RunRequest({
      post: //....your post method handler,
      get://...
      put://...
      delete://....
      ...
    })
  }
};
```

### Controller Object Params
Each method defined in a controller file is exposed as an endpoint by SimpleNodeJsController.
Methods can receive parameters, which are passed through the URL pathname. When using this.RunRequest(...), the handler receives SimpleJsPrivateMethodProps.

---

## 🧾 SimpleJsPrivateMethodProps
```ts
{
  body: any // parsed payload.
  res: ResponseObject;
  req: RequestObject;
  query: JSON // parsed requests param.
  id?: string;
  customData?: any //any custom data attached to req._custom_data by middlewares
  idMethod?: {
    post?: 'required' | 'optional',
    get?: 'required' | 'optional',
    put?: 'required' | 'optional',
    delete?: 'required' | 'optional',
    patch?: 'required' | 'optional',
  }
}
  ```

## 🧾 RequestObject (req)

Available on every route handler.

| Property | Type | Description |
|---------|------|-------------|
| `req.url` | `string` | Request URL |
| `req.method` | `string` | HTTP method |
| `req.query` | `object` | Parsed query params |
| `req.body` | `any` | Parsed request body |
| `req.raw_body` | `any` | Parsed request body |
| `req._custom_data` | `any`  |

---

## 🧾 ResponseObject (res)

| Method | Params | Description |
|--------|--------|-------------|
| `res.status(code)` | `number` | Set HTTP status |
| `res.json(data)` | `any` | Send JSON response |
| `res.text(data)` | `string | Buffer` | Send raw response |
| `res.html(html)` | `string` | Send HTML response |

### Example

```ts
res.status(200).json({ success: true });
```

---

## 🔌 app.use(middleware)

Registers a middleware that runs before controllers.

### Middleware Signature

```ts
(req: RequestObject, res: ResponseObject, next: () => Promise<void> | void) => Promise<void> | void
```

### Example

```ts
app.use(async (req, res, next) => {
  console.log(req.method, req.url);
  await next();
});
```

---

## ❌ app.useError(errorMiddleware)

Registers a global error handler.

### Signature

```ts
(err: any, req: RequestObject, res: ResponseObject, next: () => void) => void
```

---

## 🧩 app.registerPlugin(app=>plugin(app,opts))

Registers a plugin.

### Plugin Shape

```ts
type Plugin = (app: SimpleJsServer, opts?: any) => void | Promise<void>;
```

### Built-In Plugins

| name      | Description |
|-----------|-------------|
| `SimpleJsSecurityPlugin` | CORS, RateLimit, Helmet |
| `SimpleJsJWTPlugin` | JWT protection|
| `SimpleJsIPWhitelistPlugin` | Restricting IP addresses |
| `SimpleJsCookiePlugin` | Restricting IP addresses |

---

# 🧱 Built-in Middlewares

## 🔐 SetRequestCORS(options?)

Adds security headers.

### Options (optional)
All the standard http headers

### Usage
```ts
app.use(app=>SetRequestCORS(app, [{
  "Access-Control-Allow-Origin": "*",
  "X-Frame-Options": "DENY",
}]));
```

---

## ⏱ SetRateLimiter(options)

### Options

| Param | Type | Required | Description |
|------|------|----------|-------------|
| `windowMs` | `number` | ✅ | Time window in ms |
| `max` | `number` | ✅ | Max requests per window |
| `keyGenerator` | `(req) => string` | ❌ | Custom key generator |

```ts
app.use(SetRateLimiter({
  windowMs: 60_000,
  max: 100,
  keyGenerator: (req) => req.ip
}));
```

---

## 📥 SetBodyParser(options?)
SetBodyParser middleware must be set for controllers to receive all needed data to process. 
### Options

| Param | Type | Description |
|------|------|-------------|
| `limit` | `string` or `number` | Max body size (e.g. "1mb") 

```ts
app.use(SetBodyParser({ limit: "2mb" }));
```

---

## 🛡 Security Best Practices

- Always enable `SetSecurityHeaders`
- Enable `SetRateLimiter` on public APIs
- Validate request body
- Use `trustProxy: true` only behind trusted proxies
- Avoid leaking stack traces in production

---

## 📄 License

MIT

---

## 👤 Author

Increase
