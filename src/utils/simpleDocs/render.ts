// Renders a DocModel into a single self-contained HTML page (inline CSS + JS).
import { DocEndpoint, DocGroup, DocModel, DocsPluginOptions } from "../../typings/docs";
import { escapeHtml as esc, safeColor, safeSize, safeFontFamily, safeUrl } from "./sanitize";

// Minimal markdown -> html. Links are protocol-checked; all text is escaped.
function renderMarkdown(src: string): string {
  const escMd = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    escMd(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, url) =>
        `<a href="${safeUrl(url)}" rel="noopener noreferrer">${text}</a>`
      );
  const out: string[] = [];
  src.split("```").forEach((chunk, idx) => {
    if (idx % 2 === 1) {
      const lines = chunk.replace(/^\n/, "").replace(/\n$/, "").split("\n");
      if (/^[a-zA-Z]+$/.test(lines[0])) lines.shift();
      out.push("<pre><code>" + escMd(lines.join("\n")) + "</code></pre>");
      return;
    }
    let para: string[] = [];
    let list: string[] = [];
    const flushP = () => { if (para.length) { out.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; } };
    const flushL = () => { if (list.length) { out.push("<ul>" + list.map((li) => "<li>" + inline(li) + "</li>").join("") + "</ul>"); list = []; } };
    for (const ln of chunk.split("\n")) {
      const h = ln.match(/^(#{1,4})\s+(.*)$/);
      const li = ln.match(/^\s*-\s+(.*)$/);
      if (h) { flushP(); flushL(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); }
      else if (li) { flushP(); list.push(li[1]); }
      else if (!ln.trim()) { flushP(); flushL(); }
      else { flushL(); para.push(ln.trim()); }
    }
    flushP(); flushL();
  });
  return out.join("\n");
}

function themeVars(opts: DocsPluginOptions): string {
  const t = opts.theme || {};
  const vars: Record<string, string> = {
    "--font-family": safeFontFamily(t.fontFamily, "ui-sans-serif, system-ui, -apple-system, sans-serif"),
    "--text-color": safeColor(t.textColor, "#24292f"),
    "--font-size": safeSize(t.fontSize, "15px"),
    "--sidebar-bg": safeColor(t.sidebarBg, "#0d1117"),
    "--sidebar-text": safeColor(t.sidebarText, "#c9d1d9"),
    "--sidebar-accent": safeColor(t.sidebarAccent, "#58a6ff"),
    "--sidebar-font-size": safeSize(t.sidebarFontSize, "14px"),
    "--accent": safeColor(t.accent, "#1f6feb"),
  };
  return ":root{" + Object.entries(vars).map(([k, v]) => `${k}:${v};`).join("") + "}";
}

// Lowercased, attribute-safe search index for an endpoint.
function searchIndex(p: DocEndpoint): string {
  const parts = [p.title, p.url, p.method, ...(p.fields || []).map((f) => f.name)];
  return esc(parts.join(" ").toLowerCase());
}

function pageHtml(p: DocEndpoint): string {
  return `
  <article class="view doc" data-key="page:${esc(p.id)}" data-group="${esc(slugOf(p.group))}" hidden>
    <a class="back" data-nav="group:${esc(slugOf(p.group))}">← ${esc(p.group)}</a>
    <span class="method method-${esc(p.method)}">${esc(p.method)}</span>
    <h2>${esc(p.title)}</h2>
    <code class="url">${esc(p.url)}</code>
    ${Array.isArray(p.headers) && p.headers.length ? `
    <div class="headers">
      <div class="headers-label">Headers</div>
      ${p.headers.map((h) => `<div class="hrow"><code>${esc(h.name)}</code><span>${esc(h.value)}</span></div>`).join("")}
    </div>` : ""}
    <div class="prose">${renderMarkdown(p.body)}</div>
    ${Array.isArray(p.fields) && p.fields.length ? `
    <table>
      <thead><tr><th>Field</th><th>Status</th><th>Description</th></tr></thead>
      <tbody>${p.fields.map((f) => `
        <tr>
          <td><code>${esc(f.name)}</code><div class="ftype">${esc(f.type || "")}</div></td>
          <td><span class="badge ${f.required ? "req" : "opt"}">${f.required ? "required" : "optional"}</span></td>
          <td>${esc(f.desc || "")}</td>
        </tr>`).join("")}</tbody>
    </table>` : ""}
    ${p.response ? `<h4>Response on success</h4><pre><code>${esc(p.response)}</code></pre>` : ""}
  </article>`;
}

let _slugCache: Record<string, string> = {};
function slugOf(name: string): string {
  return (_slugCache[name] ??= name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
}

function groupHtml(g: DocGroup): string {
  return `
  <article class="view group-view" data-key="group:${esc(g.slug)}" hidden>
    <a class="back" data-nav="home">← All groups</a>
    <h1>${esc(g.name)}</h1>
    <input class="search" type="search" placeholder="Search ${esc(g.name)} endpoints…" aria-label="Search endpoints">
    ${Object.entries(g.sections).map(([section, ps]) => `
      <div class="ep-section">
        <h3 class="sec">${esc(section)}</h3>
        <div class="ep-list">${ps.map((p) => `
          <button class="ep" data-nav="page:${esc(p.id)}" data-search="${searchIndex(p)}">
            <span class="method method-${esc(p.method)}">${esc(p.method)}</span>
            <span class="ep-title">${esc(p.title)}</span>
          </button>`).join("")}</div>
      </div>`).join("")}
    <p class="no-results" hidden>No endpoints match your search.</p>
  </article>`;
}

export function renderDocs(model: DocModel, opts: DocsPluginOptions): string {
  _slugCache = {};
  const groups = model.groups;
  const site = { name: opts.site?.name || "API", tagline: opts.site?.tagline || "API Documentation" };

  const homeHtml = `
  <div class="view home" data-key="home">
    <h1 class="site-name">${esc(site.name)}</h1>
    <p class="lead">${esc(site.tagline)}</p>
    <div class="cards">${groups.map((g) => `
      <button class="card" data-nav="group:${esc(g.slug)}">
        <h3>${esc(g.name)}</h3>
        <span>${g.count} endpoint${g.count === 1 ? "" : "s"}</span>
      </button>`).join("")}</div>
  </div>`;

  const sidebarHtml = `
  <a class="navlink home-link" data-nav="home">Home</a>
  ${groups.map((g) => `
    <div class="side-group" data-group="${esc(g.slug)}" hidden>
      <div class="group" data-nav="group:${esc(g.slug)}">${esc(g.name)}</div>
      ${Object.entries(g.sections).map(([section, ps]) => `
        <div class="section">${esc(section)}</div>
        ${ps.map((p) => `<a class="navlink" data-nav="page:${esc(p.id)}">${esc(p.title)}</a>`).join("")}
      `).join("")}
    </div>
  `).join("")}`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(site.name)} · Docs</title>
<style>
  ${themeVars(opts)}
  * { box-sizing: border-box; }
  body { margin: 0; font-family: var(--font-family); color: var(--text-color); }
  .layout { display: flex; min-height: 100vh; }
  aside { width: 280px; background: var(--sidebar-bg); color: var(--sidebar-text); padding: 18px 14px; overflow-y: auto; }
  .group { margin: 22px 6px 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--sidebar-accent); cursor: pointer; }
  .group:hover { filter: brightness(1.2); }
  .section { margin: 12px 6px 4px; font-size: 12px; font-weight: 600; color: #8b949e; }
  .navlink { display: block; padding: 7px 12px; border-radius: 6px; color: var(--sidebar-text); text-decoration: none; font-size: var(--sidebar-font-size); cursor: pointer; }
  .navlink:hover { background: rgba(255,255,255,.08); }
  .navlink.active { background: var(--accent); color: #fff; }
  .home-link { color: #8b949e; margin-bottom: 6px; }
  main { flex: 1; padding: 40px 56px; max-width: 900px; }
  .method { display: inline-block; padding: 3px 10px; border-radius: 5px; font-size: 12px; font-weight: 700; color: #fff; }
  .method-GET { background: #2da44e; } .method-POST { background: #1f6feb; }
  .method-PUT { background: #bf8700; } .method-PATCH { background: #8250df; } .method-DELETE { background: #cf222e; }
  h2 { margin: 12px 0 6px; }
  .url { display: inline-block; background: #f6f8fa; border: 1px solid #d0d7de; padding: 6px 10px; border-radius: 6px; font-size: 14px; }
  .headers { margin: 16px 0; border: 1px solid #d0d7de; border-radius: 8px; overflow: hidden; }
  .headers-label { background: #f6f8fa; padding: 6px 12px; font-size: 12px; font-weight: 600; color: #57606a; border-bottom: 1px solid #d0d7de; }
  .hrow { display: flex; gap: 10px; padding: 8px 12px; font-size: 13px; align-items: baseline; }
  .hrow + .hrow { border-top: 1px solid #eaeef2; }
  .hrow code { font-weight: 600; color: #0550ae; }
  .hrow span { color: #57606a; }
  .prose { line-height: 1.65; font-size: var(--font-size); color: var(--text-color); margin: 18px 0; }
  .prose h3 { font-size: 16px; margin: 18px 0 8px; }
  .prose a { color: var(--accent); }
  .prose code, .url, td code, .hrow code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .prose code { background: #f6f8fa; padding: 1px 5px; border-radius: 4px; font-size: 90%; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 14px; }
  th { text-align: left; background: #f6f8fa; }
  th, td { border: 1px solid #d0d7de; padding: 8px 10px; vertical-align: top; }
  td code { font-weight: 600; }
  .ftype { font-size: 12px; color: #8250df; margin-top: 3px; }
  .badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
  .badge.req { background: #ffebe9; color: #cf222e; } .badge.opt { background: #eaeef2; color: #57606a; }
  pre { background: #0d1117; color: #e6edf3; padding: 14px; border-radius: 8px; overflow: auto; font-size: 13px; }
  pre code { font-family: ui-monospace, Menlo, monospace; }
  .lead { color: #57606a; }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-top: 24px; }
  body.at-home aside { display: none; }
  body.at-home main { display: flex; align-items: center; justify-content: center; max-width: none; }
  .home { max-width: 760px; text-align: center; }
  .site-name { font-size: 40px; letter-spacing: .5px; margin: 0 0 4px; }
  .home .lead { font-size: 16px; margin-top: 0; }
  .home .cards { display: flex; flex-wrap: wrap; justify-content: center; }
  .home .card { flex: 0 0 220px; text-align: center; }
  .card { text-align: left; background: #fff; border: 1px solid #d0d7de; border-radius: 10px; padding: 20px; cursor: pointer; transition: .12s; font: inherit; }
  .card:hover { border-color: var(--accent); box-shadow: 0 2px 8px rgba(31,111,235,.13); transform: translateY(-2px); }
  .card h3 { margin: 0 0 6px; font-size: 17px; }
  .card span { color: #8b949e; font-size: 13px; }
  .back { display: inline-block; margin-bottom: 18px; color: var(--accent); cursor: pointer; font-size: 14px; text-decoration: none; }
  .search { width: 100%; max-width: 420px; margin: 8px 0 4px; padding: 9px 12px; font: inherit; font-size: 14px; border: 1px solid #d0d7de; border-radius: 8px; }
  .search:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(31,111,235,.15); }
  .sec { margin: 24px 0 10px; font-size: 13px; text-transform: uppercase; letter-spacing: .5px; color: #8b949e; }
  .ep-list { display: flex; flex-direction: column; gap: 8px; }
  .ep { display: flex; align-items: center; gap: 12px; text-align: left; background: #fff; border: 1px solid #d0d7de; border-radius: 8px; padding: 12px 14px; cursor: pointer; font: inherit; }
  .ep:hover { border-color: var(--accent); background: #f6f8ff; }
  .ep-title { font-size: 15px; }
  .no-results { color: #8b949e; }
</style></head>
<body>
  <div class="layout">
    <aside>${sidebarHtml}</aside>
    <main>
      ${homeHtml}
      ${groups.map(groupHtml).join("")}
      ${model.endpoints.map(pageHtml).join("")}
    </main>
  </div>
  <script>
    var views = document.querySelectorAll(".view");
    var navs = document.querySelectorAll("[data-nav]");
    function show(key) {
      views.forEach(function (v) { v.hidden = v.dataset.key !== key; });
      navs.forEach(function (n) { n.classList.toggle("active", n.classList.contains("navlink") && n.dataset.nav === key); });
      document.body.classList.toggle("at-home", key === "home");
      // sidebar shows only the active group's section
      var activeGroup = null;
      if (key.indexOf("group:") === 0) activeGroup = key.slice(6);
      else if (key.indexOf("page:") === 0) {
        var current = document.querySelector('[data-key="' + key + '"]');
        activeGroup = current ? current.getAttribute("data-group") : null;
      }
      document.querySelectorAll(".side-group").forEach(function (sg) {
        sg.hidden = activeGroup === null || sg.getAttribute("data-group") !== activeGroup;
      });
      var main = document.querySelector("main"); if (main) main.scrollTop = 0;
    }
    navs.forEach(function (n) { n.addEventListener("click", function () { show(n.dataset.nav); }); });
    document.querySelectorAll(".search").forEach(function (input) {
      input.addEventListener("input", function () {
        var q = input.value.trim().toLowerCase();
        var scope = input.closest(".group-view");
        if (!scope) return;
        scope.querySelectorAll(".ep").forEach(function (ep) {
          ep.style.display = (!q || (ep.dataset.search || "").indexOf(q) !== -1) ? "" : "none";
        });
        scope.querySelectorAll(".ep-section").forEach(function (sec) {
          var vis = Array.prototype.some.call(sec.querySelectorAll(".ep"), function (e) { return e.style.display !== "none"; });
          sec.style.display = vis ? "" : "none";
        });
        var nores = scope.querySelector(".no-results");
        if (nores) {
          var any = Array.prototype.some.call(scope.querySelectorAll(".ep"), function (e) { return e.style.display !== "none"; });
          nores.hidden = any;
        }
      });
    });
    show("home");
  </script>
</body></html>`;
}
