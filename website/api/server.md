# Creating a Server

## CreateSimpleJsHttpServer(options)

Creates and returns an HTTP app instance.

| Param | Type | Required | Description |
|------|------|----------|-------------|
| `controllersDir` | `string` | ✅ | Path to your controllers directory |
| `bodyLimit` | `string \| number` | ❌ | Global max body size (e.g. `"2mb"`, `"500kb"`, or bytes). Default: `"1mb"` |

## CreateSimpleJsHttpsServer(options)

Creates and returns an HTTPS app instance.

| Param | Type | Required | Description |
|------|------|----------|-------------|
| `controllersDir` | `string` | ✅ | Path to your controllers directory |
| `tlsOpts` | `https.ServerOptions` | ✅ | TLS options (key, cert, etc.) |
| `bodyLimit` | `string \| number` | ❌ | Global max body size (e.g. `"2mb"`, `"500kb"`, or bytes). Default: `"1mb"` |

```ts
import fs from "fs";
import { CreateSimpleJsHttpsServer } from "simplejsnode";

const app = CreateSimpleJsHttpsServer({
  controllersDir: process.cwd() + "/controllers",
  tlsOpts: {
    key: fs.readFileSync("key.pem"),
    cert: fs.readFileSync("cert.pem"),
  },
});

app.listen(443);
```
