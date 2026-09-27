# SimpleJsSetCORS(options?)

Sets `Access-Control-*` headers and handles OPTIONS preflight.

| Param | Type | Default | Description |
|---|---|---|---|
| `origin` | `string \| string[] \| (origin: string) => boolean` | `"*"` | Allowed origin(s): `"*"`, one exact origin, a list, or a predicate |
| `methods` | `string` | `"GET, POST, DELETE, PUT, PATCH"` | Allowed methods |
| `headers` | `string` | standard set | Allowed headers |
| `credentials` | `boolean` | `false` | Allow cookies/auth headers. **Requires** an explicit `origin` allowlist — `SimpleJsSetCORS` throws at startup if it is missing or `"*"` |

```ts
// Public API
app.use(SimpleJsSetCORS());

// Credentialed (cookies, Authorization header)
app.use(SimpleJsSetCORS({ origin: ["https://myapp.com", "https://admin.myapp.com"], credentials: true }));

// Predicate
app.use(SimpleJsSetCORS({ origin: o => o.endsWith(".myapp.com"), credentials: true }));
```

With an allowlist:

- A request whose `Origin` is allowed gets it echoed in `Access-Control-Allow-Origin` (plus `Access-Control-Allow-Credentials: true` when enabled).
- A request whose `Origin` is not allowed is rejected with `403`.
- A request with no `Origin` header (same-origin navigation, server-to-server, curl) passes through without CORS headers.
- `Vary: Origin` is always set so shared caches never serve one origin's response to another.
