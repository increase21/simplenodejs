# Security Best Practices

- Always register `SimpleJsSetHelmet()` or individual header middlewares
- Use `SimpleJsSetRateLimiter` on all public endpoints
- `credentials: true` in `SimpleJsSetCORS` requires an explicit `origin` allowlist (it throws otherwise)
- Set `trustProxy` on `SimpleJsSetRateLimiter`, `SimpleJsIPWhitelistPlugin` and `SimpleJsMaintenanceModePlugin` to the exact number of trusted proxies in front of the app, and leave it off when there are none — otherwise clients can forge their IP
- Do path-based checks in middlewares on `req.path` / `req.url` (normalized), never on `req.originalUrl`
- Read security-sensitive cookies from `customData.signedCookies`, never from `customData.cookies`
- Throw `SimpleJsHttpError` for errors meant for the client; other errors return a generic `503` without their message
- Set a reasonable `bodyLimit` on server creation to prevent oversized payloads; override it per endpoint with the descriptor's `bodyLimit`, or per call with `ctx.readBody(limit)`
- Use `app.useError` to handle errors uniformly — unhandled errors return `"Service unavailable"` with no internal details exposed
- Add `HttpOnly; Secure; SameSite=Strict` attributes when setting cookies via `Set-Cookie`
- On HTTPS deployments, register `SimpleJsSetHSTS()` or include it in `SimpleJsSetHelmet()`
- Disable `SimpleJsDocsPlugin` (`enabled: false`) in production, or gate `/docs` behind auth or `SimpleJsIPWhitelistPlugin`, to avoid exposing your API surface
