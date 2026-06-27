# Body Parsing

Body parsing is **automatic** — no middleware registration required. When a request carries a body (`Content-Type` or `Content-Length` header), the framework reads and parses it before your handler runs. The result is available as `ctx.body`.

**JSON** bodies (`application/json`) are parsed to an object. All other content types are left as a raw string.

## Global limit

Set the max payload size for all endpoints via the server options:

```ts
const app = CreateSimpleJsHttpServer({
  controllersDir: process.cwd() + "/controllers",
  bodyLimit: "5mb",   // default: "1mb"
});
```

Accepts a string (`"500kb"`, `"10mb"`) or a number of bytes. Requests exceeding the limit are rejected immediately with `413 Payload Too Large`.

## Per-endpoint limit

Override the global limit for a specific endpoint using the `bodyLimit` field on the descriptor:

```ts
return [
  { method: "post", bodyLimit: "50mb", handler: uploadHandler },
  { method: "get",  handler: listHandler },
];
```

The per-endpoint `bodyLimit` takes precedence over the global `bodyLimit`.

## Raw stream endpoints (`ignoreStream`)

Set `ignoreStream: true` on a descriptor to skip body parsing entirely. The raw Node.js stream is passed directly to your handler — useful when piping to a library like `formidable` or `busboy`:

```ts
return [
  { method: "post", ignoreStream: true, handler: uploadHandler },
];
```

When `ignoreStream` is `true`, `ctx.body` is `undefined` and your handler is responsible for consuming the stream.
