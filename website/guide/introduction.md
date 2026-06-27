# What is simplejsnode?

**SimpleJsNode** (`simplejsnode`) is a minimal, dependency-free Node.js framework built on top of Node's native `http` and `https` modules. It provides controller-based routing, middleware, plugins, and security utilities with full TypeScript support.

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

## Next steps

- [Installation](/guide/installation) — add the package to your project
- [Quick Start](/guide/quick-start) — a minimal server in a few lines
- [Controllers](/api/controllers) — how routing works
