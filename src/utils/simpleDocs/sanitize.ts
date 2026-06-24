// Security helpers for the docs renderer.
// Docs are authored by the developer, but content is still interpolated into
// HTML/CSS — these guards prevent javascript: links, attribute breakout, and
// CSS injection from malformed or pasted content.

/** Escapes a value for safe interpolation into HTML text or a quoted attribute. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Only these protocols (plus relative/anchor links) are allowed in markdown
// links. Anything else (notably `javascript:`) is dropped.
const SAFE_URL = /^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/)/i;

/**
 * Returns a safe href, or "#" if the URL uses a disallowed scheme.
 * Control characters and spaces are stripped (they can smuggle `javascript:`),
 * and quotes are percent-encoded so a URL can never break out of the href.
 */
export function safeUrl(raw: string): string {
  let cleaned = "";
  for (const ch of String(raw ?? "").trim()) {
    const code = ch.charCodeAt(0);
    // drop control chars (<= 0x20) and DEL (0x7f)
    if (code > 0x20 && code !== 0x7f) cleaned += ch;
  }
  const guarded = cleaned.replace(/"/g, "%22").replace(/'/g, "%27");
  return SAFE_URL.test(guarded) ? guarded : "#";
}

// ─── Theme value validation (prevents CSS injection / style breakout) ─────────
const COLOR =
  /^(#[0-9a-fA-F]{3,8}|rgb\(\s*[\d.\s,%]+\)|rgba\(\s*[\d.\s,%/]+\)|hsl\(\s*[\d.\s,%]+\)|hsla\(\s*[\d.\s,%/]+\)|[a-zA-Z]{1,30})$/;
const SIZE = /^[0-9](?:[0-9.]{0,6})?(px|rem|em|%|pt|vw|vh)$/;
const FONT_FAMILY = /^[a-zA-Z0-9 ,'"._-]{1,160}$/;

export function safeColor(value: string | undefined, fallback: string): string {
  return value && COLOR.test(value.trim()) ? value.trim() : fallback;
}

export function safeSize(value: string | undefined, fallback: string): string {
  return value && SIZE.test(value.trim()) ? value.trim() : fallback;
}

export function safeFontFamily(value: string | undefined, fallback: string): string {
  return value && FONT_FAMILY.test(value.trim()) ? value.trim() : fallback;
}
