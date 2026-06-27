# Middleware & Plugins API

## app.use(middleware)

Registers a middleware that runs on every request before controllers.

### Middleware signature

```ts
(req: RequestObject, res: ResponseObject, next: () => Promise<void> | void) => Promise<any> | void
```

### Example

```ts
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});
```

## app.useError(errorMiddleware)

Registers a global error handler. Catches all errors thrown in middlewares, controllers, and async handlers.

```ts
app.useError((err, req, res, next) => {
  const status = err?.statusCode || 500;
  res.status(status).json({ error: err.message });
});
```

## app.registerPlugin(plugin)

Registers a plugin function.

```ts
type Plugin = (app: SimpleJsServer, opts?: any) => Promise<any> | void;
```

```ts
app.registerPlugin(app => SimpleJsSecurityPlugin(app, opt));
```

See [Plugins](/plugins/) for the full list of built-in plugins.
