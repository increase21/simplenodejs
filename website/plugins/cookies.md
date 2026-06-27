# SimpleJsCookiePlugin + SignCookie

Parses the `Cookie` header on every request. Cookies are available at `this._custom_data.cookies`.

If a `secret` is provided, signed cookies (prefixed with `s:`) are verified using HMAC-SHA256. Cookies with invalid signatures are silently dropped.

| Option | Type | Description |
|---|---|---|
| `secret` | `string` | Optional signing secret for verified cookies |
| `dataKey` | `string` | Key on `_custom_data`. Default: `"cookies"` |

```ts
import { SimpleJsCookiePlugin, SignCookie } from "simplejsnode";

// Register plugin
app.registerPlugin(app => SimpleJsCookiePlugin(app, {
  secret: process.env.COOKIE_SECRET,
}));

// Set a signed cookie in a handler
const signed = SignCookie(sessionId, process.env.COOKIE_SECRET!);
ctx.res.setHeader("Set-Cookie", `session=${signed}; HttpOnly; Secure; SameSite=Strict`);

// Read cookie in any handler
const { session } = ctx.customData.cookies;
```
