# SimpleJsSetRateLimiter(options)

Limits repeated requests per client IP using an in-memory sliding window.

| Param | Type | Required | Description |
|---|---|---|---|
| `windowMs` | `number` | ✅ | Time window in milliseconds |
| `max` | `number` | ✅ | Max requests per window |
| `trustProxy` | `boolean \| number` | ❌ | Number of trusted proxies in front of the app (`true` = 1). The client IP is taken from `X-Forwarded-For` that many entries from the right. Default: `false` (socket address) |
| `keyGenerator` | `(req) => string` | ❌ | Custom key function (e.g. by user ID instead of IP) |
| `urlMatch` | `string[]` | ❌ | If provided, only requests under one of these paths are rate limited; all other routes pass through untouched. Each matched path gets its own per-client counter |

```ts
app.use(SimpleJsSetRateLimiter({ windowMs: 60_000, max: 100 }));

// Behind one Nginx / load balancer
app.use(SimpleJsSetRateLimiter({ windowMs: 60_000, max: 100, trustProxy: true }));

// Behind a CDN and a load balancer
app.use(SimpleJsSetRateLimiter({ windowMs: 60_000, max: 100, trustProxy: 2 }));

// Only rate-limit routes under these paths — each gets its own per-client counter
app.use(SimpleJsSetRateLimiter({
  windowMs: 60_000,
  max: 5,
  urlMatch: ["/auth/login", "/auth/send-otp"],
}));
```

> `urlMatch` matches whole path segments on the normalized path (`req.path`): `/auth/login` covers `/auth/login`, `/auth/login/123` and `/AUTH//login`, but not `/auth/login-help`. The query string is ignored. All requests under a matched path share a single counter. Requests that match no entry are never counted.

> The window slides: requests from the previous window still count in proportion to how much of it overlaps, so a client cannot send `2 × max` by bursting across a window boundary. IPv6 clients are counted per `/64` network, since a single client usually controls the whole `/64`.

> Set `trustProxy` to the exact number of proxies you run. Each proxy appends the address it received from, so entries further left are supplied by the client and can be forged. Setting it when there is no proxy lets any client choose its own IP.

> The store is in-memory and per-process. In clustered/multi-worker deployments each worker maintains its own counter. Use a custom `keyGenerator` with an external store for distributed rate limiting.
