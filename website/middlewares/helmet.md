# Helmet & Security Headers

## SetHelmet(options?)

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
app.use(SetHelmet());

// HTTP server — disable HSTS, relax CSP
app.use(SetHelmet({
  hsts: false,
  csp: "default-src 'self'",
  coep: false,
}));
```

## Individual Security Headers

Each header is also available as a standalone middleware:

| Function | Header |
|---|---|
| `SetHSTS(opts?)` | `Strict-Transport-Security` |
| `SetCSP(policy?)` | `Content-Security-Policy` |
| `SetFrameGuard(action?)` | `X-Frame-Options` |
| `SetNoSniff()` | `X-Content-Type-Options` |
| `SetReferrerPolicy(policy?)` | `Referrer-Policy` |
| `SetPermissionsPolicy(policy?)` | `Permissions-Policy` |
| `SetCOEP(value?)` | `Cross-Origin-Embedder-Policy` |
| `SetCOOP(value?)` | `Cross-Origin-Opener-Policy` |

```ts
app.use(SetFrameGuard("SAMEORIGIN"));
app.use(SetCSP("default-src 'self'; img-src *"));
app.use(SetHSTS({ maxAge: 63072000, preload: true }));
```

> `SetHSTS` is only meaningful on HTTPS. Browsers silently ignore it over plain HTTP.
