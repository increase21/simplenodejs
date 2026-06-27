# Controllers

Controllers are auto-loaded from `controllersDir` at startup. The file path maps directly to a URL. Controllers must be exported as the default export; otherwise, requests to that controller will return a 404 error.

```
controllers/
  drivers/
      auths.ts        → /drivers/auths

  customers/
      auths.ts       → /customers/auths
      accounts      → /customers/accounts
```

Controllers are plain classes — no base class required. Each method represents an endpoint and returns a `SimpleJsEndpoint` (an array of `SimpleJsEndpointDescriptor` objects) that declares which HTTP methods are supported and which handler to call.

Every controller receives the request context (`SimpleJsCtx`) via its constructor and it is also available as `this.ctx` anywhere inside the class — in endpoint methods, descriptor handlers, and private helpers.

```ts
// controllers/drivers/auths.ts
import { SimpleJsCtx, SimpleJsEndpoint } from "simplejsnode";

export default class AuthController {
  ctx: SimpleJsCtx;

  // single HTTP method — access this.ctx directly, no descriptor needed
  async login(): Promise<void> {
    if (this.ctx.method !== "post") return this.ctx.res.status(405).json({ error: "Method Not Allowed" });
    // other logic...
  }

  // multiple HTTP methods — return a SimpleJsEndpoint array
  async vehicleList(id?: string): Promise<SimpleJsEndpoint> {
    return [
      { method: "get",    id: "optional", handler: getVehicles },
      { method: "put",    id: "required", handler: updateVehicle },
      { method: "delete", id: "required", handler: deleteVehicle },
    ];
  }
}
```

> `this.ctx` is injected automatically by the router on every request. You do not need to pass it around manually — it is always available anywhere in the class.

## Endpoint Naming

Controller methods use **camelCase** and are exposed as **kebab-case** URLs.

| Method name | URL |
|---|---|
| `async index()` | `/drivers/auths` |
| `async login()` | `/drivers/auths/login` |
| `async vehicleList()` | `/drivers/auths/vehicle-list` |

## ID Parameters

Declare `id` in the endpoint method signature to indicate it accepts an ID segment. Use the descriptor's `id` field to enforce whether it is required or optional at the routing level.

```ts
// GET  /drivers/auths/vehicle-list         → id is optional
// GET  /drivers/auths/vehicle-list/123     → id = "123"
// PUT  /drivers/auths/vehicle-list/123     → required, 404 if missing
// DELETE  /drivers/auths/vehicle-list/123  → required, 404 if missing
```

See also the [endpoint descriptor reference](/api/context#simplejsendpointdescriptor).
