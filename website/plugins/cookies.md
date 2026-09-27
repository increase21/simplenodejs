# SimpleJsCookiePlugin + SimpleJsSignCookie

Parses the `Cookie` header on every request. Plain cookies are available at `ctx.customData.cookies`.

If a `secret` is provided, signed cookies (prefixed with `s:`) are verified using HMAC-SHA256 and placed **only** in `ctx.customData.signedCookies`. Cookies with invalid signatures are silently dropped. Because signed and plain cookies live in separate objects, a client cannot replace a signed cookie by sending a plain one with the same name — always read security-sensitive values from `signedCookies`.

| Option | Type | Description |
|---|---|---|
| `secret` | `string` | Optional signing secret for verified cookies |
| `dataKey` | `string` | Key on `_custom_data` for plain cookies. Default: `"cookies"` |
| `signedDataKey` | `string` | Key on `_custom_data` for verified signed cookies. Default: `"signedCookies"` |

## SimpleJsSignCookie(name, value, secret)

Returns the signed value to put in `Set-Cookie`. The signature covers the cookie **name**, so a value signed for `session` is rejected if sent under any other name.

```ts
import { SimpleJsCookiePlugin, SimpleJsSignCookie } from "simplejsnode";

// Register plugin
app.registerPlugin(app => SimpleJsCookiePlugin(app, {
  secret: process.env.COOKIE_SECRET,
}));

// Set a signed cookie in a handler
const signed = SimpleJsSignCookie("session", sessionId, process.env.COOKIE_SECRET!);
ctx.res.setHeader("Set-Cookie", `session=${signed}; HttpOnly; Secure; SameSite=Strict`);

// Read cookies in any handler
const { session } = ctx.customData.signedCookies;   // verified
const { theme } = ctx.customData.cookies;           // plain, client-controlled
```
