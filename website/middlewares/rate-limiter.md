# SetRateLimiter(options)

Limits repeated requests per client IP using an in-memory store.

| Param | Type | Required | Description |
|---|---|---|---|
| `windowMs` | `number` | ✅ | Time window in milliseconds |
| `max` | `number` | ✅ | Max requests per window |
| `trustProxy` | `boolean` | ❌ | If `true`, reads IP from `X-Forwarded-For` (for Nginx/load balancers). Default: `false` |
| `keyGenerator` | `(req) => string` | ❌ | Custom key function (e.g. by user ID instead of IP) |
| `urlMatch` | `string[]` | ❌ | If provided, only requests whose URL **starts with** one of the entries are rate limited; all other routes pass through untouched. Each matched prefix gets its own per-client counter |

```ts
app.use(SetRateLimiter({ windowMs: 60_000, max: 100 }));

// Behind Nginx
app.use(SetRateLimiter({ windowMs: 60_000, max: 100, trustProxy: true }));

// Only rate-limit routes under these prefixes — each prefix gets its own per-client counter
app.use(SetRateLimiter({
  windowMs: 60_000,
  max: 5,
  urlMatch: ["/auth/login", "/auth/send-otp"],
}));
```

> `urlMatch` is a **prefix** match against the request URL (`req.url.startsWith(entry)`), so `/auth/login` also covers `/auth/login?next=/home`. All requests sharing a matched prefix share a single counter (the counter is keyed by the prefix, not the exact URL). Requests that match no prefix are never counted.

> The store is in-memory and per-process. In clustered/multi-worker deployments each worker maintains its own counter. Use a custom `keyGenerator` with an external store for distributed rate limiting.
