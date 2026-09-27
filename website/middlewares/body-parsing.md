# Body Parsing

Body parsing is built in — no middleware registration required.

- **Endpoint handlers** (methods that return a `SimpleJsEndpoint`): when the request carries a body (`Content-Type`, `Transfer-Encoding` or `Content-Length` header), it is read automatically after the matching descriptor is found and before its middlewares and handler run, unless the descriptor sets `ignoreStream: true`.
- **Inline methods** (methods that handle the response themselves): the body is **not** read automatically. Call `await this.ctx.readBody()` (or `SimpleJsReadBody(req)`) when you need it.

The result is available as `ctx.body` / `req.body`.

| Content type | `ctx.body` |
|---|---|
| `application/json` | Parsed object/array |
| `application/x-www-form-urlencoded` | Object of fields |
| Anything else | Raw string |

If an automatic parse fails (e.g. invalid JSON), the request is **not** rejected: `ctx.body` holds the raw string and `req._body_error` is set to `"Invalid Payload"`.

## `SimpleJsReadBody` — read the body anywhere

`SimpleJsReadBody(req, opts?)` can be called from a middleware, a controller, or any function that has the request. The stream is consumed only once; every later call reuses the same bytes, so calling it again is safe.

```ts
import { SimpleJsReadBody } from "simplejsnode";

app.use(async (req, res, next) => {
  const raw = await SimpleJsReadBody(req, { as: "buffer" }); // e.g. verify a webhook signature
  await next();
});
```

| Option | Values | Description |
|---|---|---|
| `as` | `"auto"` (default), `"json"`, `"form"`, `"text"`, `"buffer"` | `"auto"` parses by content type and sets `req.body`, never throwing on a parse failure. Any explicit type returns that form and throws `400 Invalid Payload` if it cannot be parsed. |
| `limit` | `string \| number` | Max size for this read. Only the first read of a request applies a limit. |

Exceeding the size limit (`413`) or a broken request stream (`400`) throws in every mode.

The raw bytes are kept only until the response finishes (sent, or the client disconnects), then freed. Calling `SimpleJsReadBody` / `ctx.readBody()` after that throws. Read the body before responding, or use `req.body`, which stays set for the lifetime of the request object.

Inside controllers, `ctx.readBody(limitOrOptions?)` does the same and updates `ctx.body` on the `"auto"` path.

## Global limit

Set the max payload size for all endpoints via the server options:

```ts
const app = CreateSimpleJsHttpServer({
  controllersDir: process.cwd() + "/controllers",
  bodyLimit: "5mb",   // default: "1mb"
});
```

Accepts a string (`"500kb"`, `"10mb"`) or a number of bytes. Requests exceeding the limit are rejected with `413 Payload Too Large` and the connection is closed.

## Per-endpoint limit

Override the global limit for a specific endpoint — larger or smaller — with the descriptor's `bodyLimit`:

```ts
return [
  { method: "post", bodyLimit: "50mb", handler: importHandler },
  { method: "get",  handler: listHandler },
];
```

Inline methods pass the limit when they read:

```ts
async import() {
  const rows = await this.ctx.readBody("50mb");
}
```

## Raw stream endpoints (`ignoreStream`)

Set `ignoreStream: true` on a descriptor to skip the automatic read. The raw Node.js stream is left for your handler — useful when piping to a library like `formidable` or `busboy`:

```ts
return [
  { method: "post", ignoreStream: true, handler: uploadHandler },
];
```

When `ignoreStream` is `true`, `ctx.body` is `undefined` and your handler is responsible for consuming the stream. Inline methods never read the body automatically, so they can consume the stream directly.
