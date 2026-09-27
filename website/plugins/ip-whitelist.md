# SimpleJsIPWhitelistPlugin

Allows or blocks requests by client IP address.

| Option | Type | Description |
|---|---|---|
| `ips` | `string[]` | List of IP addresses |
| `mode` | `"allow" \| "deny"` | `"allow"` = whitelist (only listed IPs pass). `"deny"` = blacklist (listed IPs are blocked). Default: `"allow"` |
| `trustProxy` | `boolean \| number` | Number of trusted proxies in front of the app (`true` = 1). The client IP is taken from `X-Forwarded-For` that many entries from the right. Default: `false` (socket address). See [Rate Limiter](/middlewares/rate-limiter) |

```ts
import { SimpleJsIPWhitelistPlugin } from "simplejsnode";

// Only allow specific IPs (whitelist)
app.registerPlugin(app => SimpleJsIPWhitelistPlugin(app, {
  ips: ["203.0.113.10", "198.51.100.5"],
  mode: "allow",
}));

// Block known bad IPs (blacklist)
app.registerPlugin(app => SimpleJsIPWhitelistPlugin(app, {
  ips: ["203.0.113.99"],
  mode: "deny",
  trustProxy: true,
}));
```
