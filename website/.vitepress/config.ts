import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/simplenodejs/',
  lang: 'en-US',
  title: 'simplejsnode',
  description: 'Lightweight Node.js HTTP framework with middlewares and plugins',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'API', link: '/api/server' },
      { text: 'Plugins', link: '/plugins/' },
      { text: 'npm', link: 'https://www.npmjs.com/package/simplejsnode' },
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'What is simplejsnode?', link: '/guide/introduction' },
          { text: 'Installation', link: '/guide/installation' },
          { text: 'Quick Start', link: '/guide/quick-start' },
        ],
      },
      {
        text: 'Core API',
        items: [
          { text: 'Creating a Server', link: '/api/server' },
          { text: 'Controllers', link: '/api/controllers' },
          { text: 'Context (SimpleJsCtx)', link: '/api/context' },
          { text: 'Request & Response', link: '/api/req-res' },
          { text: 'Middleware & Plugins API', link: '/api/app' },
        ],
      },
      {
        text: 'Built-in Middlewares',
        items: [
          { text: 'Body Parsing', link: '/middlewares/body-parsing' },
          { text: 'CORS', link: '/middlewares/cors' },
          { text: 'Helmet & Security Headers', link: '/middlewares/helmet' },
          { text: 'Rate Limiter', link: '/middlewares/rate-limiter' },
        ],
      },
      {
        text: 'Plugins',
        items: [
          { text: 'Overview', link: '/plugins/' },
          { text: 'Security', link: '/plugins/security' },
          { text: 'Cookies', link: '/plugins/cookies' },
          { text: 'IP Whitelist', link: '/plugins/ip-whitelist' },
          { text: 'Request Logger', link: '/plugins/request-logger' },
          { text: 'Timeout', link: '/plugins/timeout' },
          { text: 'Cache', link: '/plugins/cache' },
          { text: 'Maintenance Mode', link: '/plugins/maintenance' },
          { text: 'API Docs Plugin', link: '/plugins/docs' },
        ],
      },
      {
        text: 'Best Practices',
        items: [
          { text: 'Security', link: '/guide/security' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/increase21/simplenodejs' },
    ],
    search: { provider: 'local' },
    editLink: {
      pattern: 'https://github.com/increase21/simplenodejs/edit/main/website/:path',
      text: 'Edit this page on GitHub',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © Increase Nkanta',
    },
  },
})
