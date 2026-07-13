import DOMPurify from "dompurify";

/**
 * Sanitizes untrusted/stored HTML before rendering via `dangerouslySetInnerHTML`.
 *
 * Any HTML that originates from a database field (CMS pages, blog posts,
 * signed contracts, etc.) must be run through this before rendering — it may
 * have been authored or influenced by a lower-privileged user (e.g. a
 * jamaah's own name flowing into a contract template) and rendering it raw
 * is a stored-XSS vector, including against admin sessions that later
 * preview the same content.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "a", "b", "strong", "i", "em", "u", "s", "p", "br", "hr",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "blockquote", "code", "pre",
      "table", "thead", "tbody", "tr", "th", "td",
      "img", "span", "div",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "target", "rel"],
  });
}
