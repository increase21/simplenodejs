# simplejsnode documentation site

The public documentation site for `simplejsnode`, built with [VitePress](https://vitepress.dev) and deployed to GitHub Pages via [`.github/workflows/deploy-docs.yml`](../.github/workflows/deploy-docs.yml).

This folder is **independent** of the published npm package — `vitepress` is not a dependency of the library.

## Local development

```bash
cd website
npm install
npm run docs:dev       # preview at http://localhost:5173
npm run docs:build     # production build → .vitepress/dist
npm run docs:preview   # serve the production build locally
```

## Structure

- `index.md` — landing/hero page
- `.vitepress/config.ts` — site config, nav and sidebar
- `guide/`, `api/`, `middlewares/`, `plugins/` — content pages

## Deployment

Pushing to `main` with changes under `website/**` triggers the deploy workflow.
Before the first deploy, set **Settings → Pages → Source: GitHub Actions** in the GitHub repo.

The site is served at `https://increase21.github.io/simplenodejs/` (note the `base: '/simplenodejs/'` in the config — remove it only if you add a custom domain).
