# Middleware & Plugins API

## app.use(middleware)

Registers a middleware that runs on every request before controllers.

### Middleware signature

```ts
(req: SimpleJsRequestObject, res: SimpleJsResponseObject, next: () => Promise<void> | void) => Promise<any> | void
```

### Example

```ts
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});
```

`req.url` and `req.path` are normalized to what the router matches on (lowercased, repeated slashes collapsed), so prefix checks like `req.path.startsWith("/admin")` cannot be bypassed with `/ADMIN` or `//admin`. The raw URL is on `req.originalUrl`.

Global middlewares run before the controller is resolved, so `req.body` is not set yet. Call `SimpleJsReadBody(req)` to read it; the controller then reuses the same bytes. See [Body Parsing](/middlewares/body-parsing).

## app.useError(errorMiddleware)

Registers a global error handler. Catches all errors thrown in middlewares, controllers, and async handlers.

```ts
app.useError((err, req, res, next) => {
  const status = err?.code || 500;
  res.status(status).json({ error: err.message });
});
```

Errors raised by the framework (404, 405, 413 `Payload Too Large`, 400 `Invalid Payload`, …) are `Error` instances with the HTTP status on `err.code` and the text on `err.message`.

If no error middleware sends a response, the framework replies with:

- the error's status and message, for errors created with `SimpleJsHttpError(status, message)` or plain `{ code, error }` objects with a status from 400–599;
- `503 Service unavailable` for **everything else** — including library errors that carry their own `code` (database, filesystem, HTTP clients). Their messages are never sent to the client, and an invalid `code` can no longer crash the process.

```ts
import { SimpleJsHttpError } from "simplejsnode";

if (exists) throw SimpleJsHttpError(409, "Email already registered");
```

A failing error middleware is caught and the default response above is sent.

## app.registerPlugin(plugin)

Registers a plugin function.

```ts
type Plugin = (app: SimpleJsServer, opts?: any) => Promise<any> | void;
```

```ts
app.registerPlugin(app => SimpleJsSecurityPlugin(app, opt));
```

See [Plugins](/plugins/) for the full list of built-in plugins.
