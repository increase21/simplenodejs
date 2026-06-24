// Loads a folder of .md docs into a DocModel.
// Format: one file per area, a single top frontmatter for group/section
// defaults, then each endpoint as a "## Title" heading + a ```yaml metadata
// block + markdown prose.
import { readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { DocEndpoint, DocGroup, DocModel } from "../../typings/docs";

const slug = (s: string): string =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const stripQuotes = (v: string): string => v.replace(/^["']|["']$/g, "");
const coerce = (v: string): string | boolean =>
  v === "true" ? true : v === "false" ? false : stripQuotes(v);

function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q: string | null = null;
  for (const ch of s) {
    if (q) {
      if (ch === q) q = null;
      cur += ch;
    } else if (ch === '"' || ch === "'") {
      q = ch;
      cur += ch;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function parseInline(s: string): Record<string, any> {
  const obj: Record<string, any> = {};
  for (const p of splitTopLevel(s.trim().replace(/^\{|\}$/g, ""))) {
    const i = p.indexOf(":");
    if (i === -1) continue;
    obj[p.slice(0, i).trim()] = coerce(p.slice(i + 1).trim());
  }
  return obj;
}

function parseYaml(text: string): Record<string, any> {
  const lines = text.split("\n");
  const data: Record<string, any> = {};
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    const rawVal = kv[2];
    if (rawVal === "|") {
      const block: string[] = [];
      const base = lines[i + 1]?.match(/^(\s*)/)?.[1]?.length ?? 0;
      while (i + 1 < lines.length && (lines[i + 1].trim() === "" || lines[i + 1].startsWith(" "))) {
        block.push(lines[++i].slice(base));
      }
      data[key] = block.join("\n").replace(/\n+$/, "");
    } else if (rawVal === "") {
      const list: any[] = [];
      while (i + 1 < lines.length && /^\s*-\s+/.test(lines[i + 1])) {
        list.push(parseInline(lines[++i].replace(/^\s*-\s+/, "")));
      }
      data[key] = list.length ? list : "";
    } else {
      data[key] = coerce(rawVal);
    }
  }
  return data;
}

function parseFrontmatter(raw: string): { data: Record<string, any>; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  return { data: parseYaml(m[1]), body: m[2] };
}

function applyVars(s: string, vars: Record<string, string>): string {
  return String(s).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : `{{${k}}}`
  );
}

function loadFile(raw: string): Record<string, any>[] {
  const { data: defaults, body } = parseFrontmatter(raw);
  const parts = body.split(/^##\s+(.+)$/m); // [intro, title1, body1, title2, body2, ...]
  const endpoints: Record<string, any>[] = [];
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i].trim();
    let meta: Record<string, any> = {};
    const prose = (parts[i + 1] || "").replace(/```ya?ml\n([\s\S]*?)```/, (_m, y) => {
      meta = parseYaml(y);
      return "";
    });
    endpoints.push({ ...defaults, ...meta, title, body: prose.trim() });
  }
  return endpoints;
}

/**
 * Reads every `.md` file directly inside `dir` and returns the doc model.
 * Only files resolving inside `dir` are read (symlinks pointing elsewhere are
 * skipped), and `dir` is never derived from request input.
 */
export function loadDocs(dir: string, vars: Record<string, string> = {}): DocModel {
  const realDir = realpathSync(resolve(dir));
  const files = readdirSync(realDir).filter((f) => f.endsWith(".md")).sort();

  const endpoints: DocEndpoint[] = [];
  const seen = new Set<string>();

  for (const f of files) {
    const full = join(realDir, f);
    let real: string;
    try {
      real = realpathSync(full);
    } catch {
      continue; // broken symlink
    }
    // refuse anything that resolves outside the docs folder
    if (real !== full && !real.startsWith(realDir + sep)) continue;
    if (!statSync(real).isFile()) continue;

    for (const ep of loadFile(readFileSync(real, "utf8"))) {
      let id = slug(ep.title || "endpoint");
      while (seen.has(id)) id += "-x";
      seen.add(id);
      endpoints.push({
        id,
        group: String(ep.group || "Ungrouped"),
        section: String(ep.section || "Endpoints"),
        title: String(ep.title || "Untitled"),
        method: String(ep.method || "GET").toUpperCase(),
        url: applyVars(ep.url || "", vars),
        headers: Array.isArray(ep.headers) ? ep.headers : undefined,
        fields: Array.isArray(ep.fields) ? ep.fields : undefined,
        response: ep.response || undefined,
        body: ep.body || "",
      });
    }
  }

  // group -> { name, slug, sections, count }
  const groups: DocGroup[] = [];
  const byName = new Map<string, DocGroup>();
  for (const ep of endpoints) {
    let g = byName.get(ep.group);
    if (!g) {
      g = { name: ep.group, slug: slug(ep.group), sections: {}, count: 0 };
      byName.set(ep.group, g);
      groups.push(g);
    }
    (g.sections[ep.section] ||= []).push(ep);
    g.count++;
  }

  return { endpoints, groups };
}
