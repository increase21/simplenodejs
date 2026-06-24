// Types for the SimpleJs API docs plugin (SimpleJsDocsPlugin).

export interface DocField {
  name: string;
  type?: string;
  required?: boolean;
  desc?: string;
}

export interface DocHeader {
  name: string;
  value: string;
}

export interface DocEndpoint {
  /** Stable slug derived from the title; used for in-page navigation. */
  id: string;
  group: string;
  section: string;
  title: string;
  method: string;
  url: string;
  headers?: DocHeader[];
  fields?: DocField[];
  response?: string;
  /** Raw markdown prose body for the endpoint. */
  body: string;
}

export interface DocGroup {
  name: string;
  slug: string;
  count: number;
  sections: Record<string, DocEndpoint[]>;
}

export interface DocModel {
  endpoints: DocEndpoint[];
  groups: DocGroup[];
}

/**
 * Visual theming. All values are validated before being injected into CSS
 * (colors must be hex/rgb/hsl/named; sizes must be a number + unit). Invalid
 * values are ignored and the default is used.
 */
export interface DocsTheme {
  /** Body text color. */
  textColor?: string;
  /** Body font size, e.g. "15px" / "1rem". */
  fontSize?: string;
  /** Base font family. */
  fontFamily?: string;
  /** Sidebar background color. */
  sidebarBg?: string;
  /** Sidebar text color. */
  sidebarText?: string;
  /** Sidebar group-label / heading color. */
  sidebarAccent?: string;
  /** Sidebar font size, e.g. "14px". */
  sidebarFontSize?: string;
  /** Accent color for links, the active item, and hovers. */
  accent?: string;
}

export interface DocsPluginOptions {
  /** Folder containing the `.md` docs. Required. */
  dir: string;
  /** Mount path. Default `"/docs"`. */
  path?: string;
  /** Landing title + tagline. */
  site?: { name?: string; tagline?: string };
  /**
   * Templating values usable as `{{var}}` inside docs (e.g. base_url).
   * NOTE: these render into a publicly served page — never put secrets here.
   */
  vars?: Record<string, string>;
  /** Theme overrides (colors, font sizes). Validated before use. */
  theme?: DocsTheme;
  /**
   * Whether the docs route is served. Default `true`.
   * The docs page enumerates every endpoint, its headers and payloads — set
   * this to `false` in production (or gate the route) to avoid disclosing your
   * internal API surface.
   */
  enabled?: boolean;
  /** Rebuild the HTML when the docs folder changes (dev only). Default `false`. */
  watch?: boolean;
}
