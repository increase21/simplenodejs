# SimpleJsCachePlugin

Sets `Cache-Control` response headers globally.

| Option | Type | Description |
|---|---|---|
| `maxAge` | `number` | Max age in seconds |
| `private` | `boolean` | Mark as private (user-specific, not shared caches) |
| `noStore` | `boolean` | Disable all caching entirely |

```ts
import { SimpleJsCachePlugin } from "simplejsnode";

// Public cache for 5 minutes
app.registerPlugin(app => SimpleJsCachePlugin(app, { maxAge: 300 }));

// No caching (APIs with sensitive data)
app.registerPlugin(app => SimpleJsCachePlugin(app, { noStore: true }));
```
