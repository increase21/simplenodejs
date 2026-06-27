# Quick Start

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

From here:

- [Creating a Server](/api/server) — `CreateSimpleJsHttpServer` / `CreateSimpleJsHttpsServer` options
- [Controllers](/api/controllers) — how files map to routes
- [Built-in Middlewares](/middlewares/body-parsing) — CORS, Helmet, rate limiting and more
- [Plugins](/plugins/) — cookies, logging, caching, maintenance mode, API docs
