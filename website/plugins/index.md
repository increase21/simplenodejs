# Plugins

Plugins are registered with [`app.registerPlugin`](/api/app#app-registerplugin-plugin). simplejsnode ships the following built-in plugins:

- [Security](/plugins/security) — combines CORS, Helmet, and rate limiting
- [Cookies](/plugins/cookies) — cookie parsing and signed cookies (`SignCookie`)
- [IP Whitelist](/plugins/ip-whitelist) — allow/deny by client IP
- [Request Logger](/plugins/request-logger) — log every completed request
- [Timeout](/plugins/timeout) — close slow requests with `503`
- [Cache](/plugins/cache) — set `Cache-Control` headers globally
- [Maintenance Mode](/plugins/maintenance) — return `503` for all traffic while upgrading
- [API Docs Plugin](/plugins/docs) — serve a markdown-driven API documentation page

```ts
type Plugin = (app: SimpleJsServer, opts?: any) => Promise<any> | void;
```
