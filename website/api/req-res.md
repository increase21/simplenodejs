# Request & Response

## RequestObject (req)

Extends Node's `IncomingMessage` with additional properties.

| Property | Type | Description |
|---|---|---|
| `req.query` | `object` | Parsed query string parameters |
| `req.body` | `any` | Parsed request body (automatically populated when a body is present) |
| `req.id` | `string` | Auto-generated UUID for the request (also sent as `X-Request-Id` header) |
| `req._custom_data` | `object` | Shared data bag written by plugins (payload, cookies, etc.) |

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
