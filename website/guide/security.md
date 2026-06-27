# Security Best Practices

- Always register `SetHelmet()` or individual header middlewares
- Use `SetRateLimiter` on all public endpoints
- Enable `credentials: true` in `SetCORS` only with a specific `origin` — never with a wildcard
- Only set `trustProxy: true` on `SetRateLimiter` or `SimpleJsIPWhitelistPlugin` when running behind a trusted reverse proxy (Nginx, etc.)
- Set a reasonable `bodyLimit` on server creation to prevent oversized payloads; override per endpoint with the descriptor's `bodyLimit` field
- Use `app.useError` to handle errors uniformly — unhandled errors return `"Service unavailable"` with no internal details exposed
- Add `HttpOnly; Secure; SameSite=Strict` attributes when setting cookies via `Set-Cookie`
- On HTTPS deployments, register `SetHSTS()` or include it in `SetHelmet()`
- Disable `SimpleJsDocsPlugin` (`enabled: false`) in production, or gate `/docs` behind auth or `SimpleJsIPWhitelistPlugin`, to avoid exposing your API surface
