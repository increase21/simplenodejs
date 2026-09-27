# Helmet & Security Headers

## SimpleJsSetHelmet(options?)

Sets all security response headers in one call. Each header can be individually overridden or disabled.

| Option | Header | Default |
|---|---|---|
| `hsts` | `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `csp` | `Content-Security-Policy` | `default-src 'none'` |
| `frameGuard` | `X-Frame-Options` | `DENY` |
| `noSniff` | `X-Content-Type-Options` | `nosniff` |
| `referrerPolicy` | `Referrer-Policy` | `no-referrer` |
| `permissionsPolicy` | `Permissions-Policy` | all features blocked |
| `coep` | `Cross-Origin-Embedder-Policy` | `require-corp` |
| `coop` | `Cross-Origin-Opener-Policy` | `same-origin` |

Pass `false` to disable any individual header. Pass a string to override the value.

```ts
// All defaults
app.use(SimpleJsSetHelmet());

// HTTP server — disable HSTS, relax CSP
app.use(SimpleJsSetHelmet({
  hsts: false,
  csp: "default-src 'self'",
  coep: false,
}));
```

## Individual Security Headers

Each header is also available as a standalone middleware:

| Function | Header |
|---|---|
| `SimpleJsSetHSTS(opts?)` | `Strict-Transport-Security` |
| `SimpleJsSetCSP(policy?)` | `Content-Security-Policy` |
| `SimpleJsSetFrameGuard(action?)` | `X-Frame-Options` |
| `SimpleJsSetNoSniff()` | `X-Content-Type-Options` |
| `SimpleJsSetReferrerPolicy(policy?)` | `Referrer-Policy` |
| `SimpleJsSetPermissionsPolicy(policy?)` | `Permissions-Policy` |
| `SimpleJsSetCOEP(value?)` | `Cross-Origin-Embedder-Policy` |
| `SimpleJsSetCOOP(value?)` | `Cross-Origin-Opener-Policy` |

```ts
app.use(SimpleJsSetFrameGuard("SAMEORIGIN"));
app.use(SimpleJsSetCSP("default-src 'self'; img-src *"));
app.use(SimpleJsSetHSTS({ maxAge: 63072000, preload: true }));
```

> `SimpleJsSetHSTS` is only meaningful on HTTPS. Browsers silently ignore it over plain HTTP.
