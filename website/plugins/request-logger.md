# SimpleJsRequestLoggerPlugin

Logs every completed request with method, URL, status code, and duration.

| Option | Type | Description |
|---|---|---|
| `logger` | `(msg: string) => void` | Custom log function. Default: `console.log` |
| `format` | `"simple" \| "json"` | Log format. Default: `"simple"` |

```ts
import { SimpleJsRequestLoggerPlugin } from "simplejsnode";

// Simple text logs
app.registerPlugin(app => SimpleJsRequestLoggerPlugin(app));
// → [2025-01-01T00:00:00.000Z] GET /users/auth/login 200 12ms

// JSON logs (for log aggregators)
app.registerPlugin(app => SimpleJsRequestLoggerPlugin(app, {
  format: "json",
  logger: (msg) => process.stdout.write(msg + "\n"),
}));
// → {"time":"...","method":"GET","url":"/users/auth/login","status":200,"ms":12,"id":"uuid"}
```
