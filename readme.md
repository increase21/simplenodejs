# simplejsnode

**SimpleJsNode** is a minimal, dependency-free Node.js framework built on Node's native `http` and `https` modules — controller-based routing, middleware, plugins, and security utilities with full TypeScript support.

[![npm version](https://img.shields.io/npm/v/simplejsnode.svg)](https://www.npmjs.com/package/simplejsnode)
[![npm downloads](https://img.shields.io/npm/dm/simplejsnode.svg)](https://www.npmjs.com/package/simplejsnode)
[![license](https://img.shields.io/npm/l/simplejsnode.svg)](https://www.npmjs.com/package/simplejsnode)
[![node](https://img.shields.io/node/v/simplejsnode.svg)](https://nodejs.org)

> 📖 **Full documentation:** **[increase21.github.io/simplenodejs](https://increase21.github.io/simplenodejs/)**

---

## Features

- Native Node.js HTTP/HTTPS server (no Express/Fastify)
- Controller-based routing (file-system driven)
- Middleware & error middleware
- Plugin system
- Individual security middlewares (CORS, HSTS, CSP, Helmet, etc.)
- Rate limiting with proxy support
- Cookie parsing & signed cookies
- IP whitelist/blacklist
- Request logging, timeouts, cache control, maintenance mode
- Markdown-driven API documentation page (`SimpleJsDocsPlugin`)
- Body and query parsing
- TypeScript-first
- Reverse-proxy friendly (Nginx, load balancers)

## Installation

```bash
npm install simplejsnode
```

Requires Node.js `>=20`.

## Quick Start

```ts
import {
  CreateSimpleJsHttpServer,
  SetHelmet,
  SetCORS,
  SetRateLimiter,
} from "simplejsnode";

const app = CreateSimpleJsHttpServer({
  controllersDir: process.cwd() + "/controllers",
  bodyLimit: "2mb",
});

app.use(SetCORS());
app.use(SetHelmet());
app.use(SetRateLimiter({ windowMs: 60_000, max: 100 }));

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

## Documentation

The complete guides and API reference live at **[increase21.github.io/simplenodejs](https://increase21.github.io/simplenodejs/)**.

| Section | Pages |
|---|---|
| **Guide** | [Introduction](https://increase21.github.io/simplenodejs/guide/introduction) · [Installation](https://increase21.github.io/simplenodejs/guide/installation) · [Quick Start](https://increase21.github.io/simplenodejs/guide/quick-start) |
| **Core API** | [Server](https://increase21.github.io/simplenodejs/api/server) · [Controllers](https://increase21.github.io/simplenodejs/api/controllers) · [Context](https://increase21.github.io/simplenodejs/api/context) · [Request & Response](https://increase21.github.io/simplenodejs/api/req-res) · [Middleware & Plugins API](https://increase21.github.io/simplenodejs/api/app) |
| **Middlewares** | [Body Parsing](https://increase21.github.io/simplenodejs/middlewares/body-parsing) · [CORS](https://increase21.github.io/simplenodejs/middlewares/cors) · [Helmet & Security Headers](https://increase21.github.io/simplenodejs/middlewares/helmet) · [Rate Limiter](https://increase21.github.io/simplenodejs/middlewares/rate-limiter) |
| **Plugins** | [Overview](https://increase21.github.io/simplenodejs/plugins/) — security, cookies, IP whitelist, request logger, timeout, cache, maintenance mode, API docs |
| **Best Practices** | [Security](https://increase21.github.io/simplenodejs/guide/security) |

## License

MIT © Increase Nkanta
