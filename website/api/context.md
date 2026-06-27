# Context (SimpleJsCtx)

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

## readBody — void-returning controller methods

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
