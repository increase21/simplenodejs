# SimpleJsMaintenanceModePlugin

Returns `503` for all traffic when maintenance mode is on. Specific IPs (e.g. your office or CI server) can bypass.

| Option | Type | Description |
|---|---|---|
| `enabled` | `boolean` | Toggle maintenance mode |
| `message` | `string` | Custom response message |
| `allowIPs` | `string[]` | IPs that bypass maintenance mode |
| `trustProxy` | `boolean` | Read IP from `X-Forwarded-For`. Default: `false` |

```ts
import { SimpleJsMaintenanceModePlugin } from "simplejsnode";

app.registerPlugin(app => SimpleJsMaintenanceModePlugin(app, {
  enabled: process.env.MAINTENANCE === "true",
  message: "We are upgrading. Back soon.",
  allowIPs: ["203.0.113.10"],
}));
```
