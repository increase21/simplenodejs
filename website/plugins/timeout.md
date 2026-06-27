# SimpleJsTimeoutPlugin

Automatically closes requests that exceed the configured time limit with `503`.

| Option | Type | Description |
|---|---|---|
| `ms` | `number` | Timeout in milliseconds |
| `message` | `string` | Custom timeout message. Default: `"Request timeout"` |

```ts
import { SimpleJsTimeoutPlugin } from "simplejsnode";

app.registerPlugin(app => SimpleJsTimeoutPlugin(app, { ms: 10_000 }));
```
