# SetCORS(options?)

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
