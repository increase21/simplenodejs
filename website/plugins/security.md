# SimpleJsSecurityPlugin

Convenience plugin combining CORS, Helmet, and rate limiting.

```ts
import { SimpleJsSecurityPlugin } from "simplejsnode";

app.registerPlugin(app => SimpleJsSecurityPlugin(app, {
  cors: { origin: "https://myapp.com", credentials: true },
  helmet: { hsts: false },
  rateLimit: { windowMs: 60_000, max: 200 },
}));
```

See the individual middlewares for all available options: [CORS](/middlewares/cors), [Helmet](/middlewares/helmet), and [Rate Limiter](/middlewares/rate-limiter).
