# Upgrading from 4.x

This release renames every public export to carry the `SimpleJs` prefix, changes when the request body is read, and fixes several security issues in ways that change behavior. All three are breaking changes.

## Renamed exports

Update your imports and calls. The old names are no longer exported.

| 4.x | Now |
|---|---|
| `SetCORS` | `SimpleJsSetCORS` |
| `SetHSTS` | `SimpleJsSetHSTS` |
| `SetCSP` | `SimpleJsSetCSP` |
| `SetFrameGuard` | `SimpleJsSetFrameGuard` |
| `SetNoSniff` | `SimpleJsSetNoSniff` |
| `SetReferrerPolicy` | `SimpleJsSetReferrerPolicy` |
| `SetPermissionsPolicy` | `SimpleJsSetPermissionsPolicy` |
| `SetCOEP` | `SimpleJsSetCOEP` |
| `SetCOOP` | `SimpleJsSetCOOP` |
| `SetHelmet` | `SimpleJsSetHelmet` |
| `SetRateLimiter` | `SimpleJsSetRateLimiter` |
| `SignCookie` | `SimpleJsSignCookie` |
| `loadDocs` | `SimpleJsLoadDocs` |
| `renderDocs` | `SimpleJsRenderDocs` |

Types:

| 4.x | Now |
|---|---|
| `RequestObject` | `SimpleJsRequestObject` |
| `ResponseObject` | `SimpleJsResponseObject` |
| `DocsPluginOptions` | `SimpleJsDocsPluginOptions` |
| `DocsTheme` | `SimpleJsDocsTheme` |
| `DocModel`, `DocGroup`, `DocEndpoint`, `DocField`, `DocHeader` | `SimpleJsDocModel`, `SimpleJsDocGroup`, `SimpleJsDocEndpoint`, `SimpleJsDocField`, `SimpleJsDocHeader` |

`CreateSimpleJsHttpServer`, `CreateSimpleJsHttpsServer`, the `SimpleJs*Plugin` functions, `SimpleJsCtx`, `SimpleJsEndpoint`, `SimpleJsMiddleware` and `SimpleJsErrorMiddleware` are unchanged.

```ts
// 4.x
import { SetCORS, SetHelmet, RequestObject } from "simplejsnode";
app.use(SetCORS());

// now
import { SimpleJsSetCORS, SimpleJsSetHelmet, SimpleJsRequestObject } from "simplejsnode";
app.use(SimpleJsSetCORS());
```

## Body reading

Endpoint handlers still get `ctx.body` automatically, and inline (void-returning) methods still call `ctx.readBody()`. What changed:

| 4.x | Now |
|---|---|
| `ctx.readBody()` resolved to nothing | Returns the body (and still sets `ctx.body`). Accepts a limit or `{ limit, as }` |
| Invalid JSON always returned `400` | The automatic read keeps the raw string in `ctx.body` and sets `req._body_error`. `ctx.readBody({ as: "json" })` / `SimpleJsReadBody(req, { as: "json" })` still return `400` |
| Only JSON was parsed | `application/x-www-form-urlencoded` is parsed to an object too |
| Reading the body after responding was possible | The raw bytes are freed when the response finishes; reading after that throws. `req.body` stays set |

New: `SimpleJsReadBody(req, opts?)` reads the body from any middleware or function. The stream is consumed once and reused by every later call, so a middleware can read it and the endpoint handler still gets `ctx.body`.

## Errors

Framework errors are now `Error` instances with the HTTP status on `err.code` and the text on `err.message`. If your `useError` handler read `err.error`, switch to `err.message`.

Only errors made with the new `SimpleJsHttpError(status, message)`, or plain `{ code, error }` objects, send their status and message to the client. An `Error` you create and give a `code` yourself now returns a generic `503`. This stops database, filesystem and HTTP-client errors (which carry their own `code`) from leaking their messages or crashing the server.

```ts
// 4.x
const e = new Error("Email already registered"); e.code = 409; throw e;

// now
throw SimpleJsHttpError(409, "Email already registered");
```

## Security fixes that change behavior

| Area | 4.x | Now |
|---|---|---|
| `trustProxy` (rate limiter, IP whitelist, maintenance mode) | Used the **leftmost** `X-Forwarded-For` entry, which clients can forge | Uses the entry added by your proxy (rightmost). Accepts a number for multiple proxies (`trustProxy: 2`). Leave it off when there is no proxy |
| `req.url` | Raw URL | Normalized path + query: lowercased, repeated slashes collapsed, backslashes turned into slashes. Raw URL moved to `req.originalUrl`; normalized path also on `req.path` |
| Rate limiter `urlMatch` | Case-sensitive `startsWith` on the raw URL | Whole-segment, case-insensitive match on `req.path` (`/auth/login` no longer matches `/auth/login-help`) |
| Rate limiter window | Fixed window | Sliding window; IPv6 clients counted per `/64` |
| `SimpleJsSetCORS({ credentials: true })` without `origin` | Echoed **any** origin with credentials | Throws at startup; pass an allowlist (`string`, `string[]` or predicate). Requests without an `Origin` header are no longer rejected. `Vary: Origin` is set |
| Signed cookies | Mixed into `customData.cookies`; a plain cookie could replace a signed one | Verified signed cookies are only in `customData.signedCookies` |
| `SimpleJsSignCookie(value, secret)` | Signature did not cover the cookie name | `SimpleJsSignCookie(name, value, secret)`. **Existing signed cookies stop verifying** — users will need to sign in again |
| `req.id` | Documented but never set | Set to the same UUID as the `X-Request-Id` header |
| `SimpleJsTimeoutPlugin` | Sent 408 but the handler kept running unnoticed | Also aborts `req.abortSignal` and closes the connection |
