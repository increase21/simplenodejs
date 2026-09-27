# Context (SimpleJsCtx)

The context object passed to every endpoint method and handler. Accepts an optional generic type `T` for `customData`.

| Property | Type | Description |
|---|---|---|
| `req` | `SimpleJsRequestObject` | Raw request object |
| `res` | `SimpleJsResponseObject` | Raw response object |
| `body` | `any` | Request body: an object for JSON/form bodies, otherwise a string. Set automatically for endpoint handlers; inline methods must call `readBody()` first |
| `query` | `object` | Parsed query string |
| `method` | `HttpMethod` | HTTP method of the request (`"get"`, `"post"`, etc.) |
| `customData` | `T` (default `any`) | Data attached by plugins/middlewares via `req._custom_data` |
| `readBody(opts?)` | `(opts?: string \| number \| { limit?, as? }) => Promise<any>` | Reads and returns the request body, and sets `ctx.body`. Required in inline methods; in endpoint handlers use it to get another form (`as: "buffer"`, `"json"`, …). Reuses the bytes already read. |

```ts
// Typed customData
const cookies = (ctx as SimpleJsCtx<{ cookies: Record<string, string> }>).customData.cookies;
```

## readBody

Inline (void-returning) methods that handle the response directly are **not** given the body automatically — call `ctx.readBody()` first:

```ts
export default class AuthController {
  ctx: SimpleJsCtx;

  async login() {
    const { email, password } = await this.ctx.readBody();   // also sets this.ctx.body
    // handle response directly...
  }
}
```

Endpoint handlers (descriptors) receive `ctx.body` automatically unless the descriptor sets `ignoreStream: true`.

`ctx.readBody()` can be called any number of times. Pass a limit (`readBody("5mb")`) or `{ limit, as }` to get a specific form; an explicit type throws `400` if the body cannot be parsed:

```ts
const raw = await this.ctx.readBody({ as: "buffer" });
const data = await this.ctx.readBody({ as: "json" });
```

See [Body Parsing](../middlewares/body-parsing.md) for limits and raw-stream endpoints.

## SimpleJsEndpoint

`SimpleJsEndpoint` is the return type for controller endpoint methods. It is equivalent to `SimpleJsEndpointDescriptor[]`.

## SimpleJsEndpointDescriptor

Each object in the `SimpleJsEndpoint` array describes one HTTP verb handler.

| Property | Type | Required | Description |
|---|---|---|---|
| `method` | `HttpMethod` | ✅ | HTTP verb: `"get"`, `"post"`, `"put"`, `"patch"`, `"delete"` |
| `handler` | `(ctx, id?) => any` | ✅ | Method reference to call for this HTTP verb |
| `id` | `"required" \| "optional"` | ❌ | ID routing rule. Omit if the endpoint never uses an ID |
| `middleware` | `SimpleJsMiddleware[]` | ❌ | Array of middlewares to run before the handler |
| `bodyLimit` | `string \| number` | ❌ | Per-endpoint max body size (e.g. `"50mb"`). Overrides the global `bodyLimit` |
| `ignoreStream` | `boolean` | ❌ | Set to `true` to skip the automatic body read and receive the raw stream in the handler |
