# Request & Response

## SimpleJsRequestObject (req)

Extends Node's `IncomingMessage` with additional properties.

| Property | Type | Description |
|---|---|---|
| `req.query` | `object` | Parsed query string parameters |
| `req.body` | `any` | Parsed request body. Set automatically for endpoint handlers, or by `ctx.readBody()` / `SimpleJsReadBody(req)`. See [Body Parsing](/middlewares/body-parsing) |
| `req._body_error` | `string` | Set to `"Invalid Payload"` when the automatic read could not parse the body (`req.body` then holds the raw string) |
| `req.id` | `string` | Auto-generated UUID for the request (also sent as `X-Request-Id` header) |
| `req.path` | `string` | Normalized path the router matched on: lowercased, repeated slashes collapsed, backslashes turned into slashes, no query string |
| `req.url` | `string` | `req.path` plus the original query string. Use it (or `req.path`) for path checks in middlewares — it always matches what the router sees |
| `req.originalUrl` | `string` | The request URL exactly as received |
| `req.abortSignal` | `AbortSignal` | Aborted when the client disconnects or `SimpleJsTimeoutPlugin` fires. Pass it to long-running work |
| `req._custom_data` | `object` | Shared data bag written by plugins (payload, cookies, etc.) |

## SimpleJsResponseObject (res)

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
