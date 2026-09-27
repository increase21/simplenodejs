# SimpleJsMaintenanceModePlugin

Returns `503` for all traffic when maintenance mode is on. Specific IPs (e.g. your office or CI server) can bypass.

| Option | Type | Description |
|---|---|---|
| `enabled` | `boolean` | Toggle maintenance mode |
| `message` | `string` | Custom response message |
| `allowIPs` | `string[]` | IPs that bypass maintenance mode |
| `trustProxy` | `boolean \| number` | Number of trusted proxies in front of the app (`true` = 1). The client IP is taken from `X-Forwarded-For` that many entries from the right. Default: `false` (socket address). See [Rate Limiter](/middlewares/rate-limiter) |

```ts
import { SimpleJsMaintenanceModePlugin } from "simplejsnode";

app.registerPlugin(app => SimpleJsMaintenanceModePlugin(app, {
  enabled: process.env.MAINTENANCE === "true",
  message: "We are upgrading. Back soon.",
  allowIPs: ["203.0.113.10"],
}));
```
