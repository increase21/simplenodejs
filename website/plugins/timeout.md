# SimpleJsTimeoutPlugin

Automatically closes requests that exceed the configured time limit with `408` and closes the connection.

| Option | Type | Description |
|---|---|---|
| `ms` | `number` | Timeout in milliseconds |
| `message` | `string` | Custom timeout message. Default: `"Request timeout"` |

```ts
import { SimpleJsTimeoutPlugin } from "simplejsnode";

app.registerPlugin(app => SimpleJsTimeoutPlugin(app, { ms: 10_000 }));
```

The timeout also aborts `req.abortSignal` (reason: an error with `code` `408`). JavaScript cannot stop a running handler, so pass the signal to long-running work to stop it:

```ts
async report() {
  const rows = await db.query(sql, { signal: this.ctx.req.abortSignal });
  if (this.ctx.req.abortSignal.aborted) return;
  this.ctx.res.json(rows);
}
```

`req.abortSignal` is also aborted when the client disconnects, with or without this plugin.
