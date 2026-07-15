---
name: Unsanitized dangerouslySetInnerHTML stored XSS
description: Pattern found in umroh-app frontend — any dangerouslySetInnerHTML rendering DB-stored or user-influenced HTML must be sanitized.
---

Several pages rendered HTML straight from the database (CMS pages, blog posts, signed contract templates) via `dangerouslySetInnerHTML` with no sanitization. One template even interpolated a user's own profile name directly into an HTML string before rendering. Because the same stored HTML was later previewed in the admin panel, a malicious value from a low-privileged user could execute in an admin's browser session (stored XSS).

**Why:** rendering trust boundary was implicit — "this HTML came from our own DB" was treated as safe, but the DB fields are writable by non-admin users (jamaah profile name, contract signing flow) or by admins editing CMS content that could itself be compromised. Any HTML sourced from a DB column falls into this bucket unless proven otherwise.

**How to apply:** before adding or reviewing any `dangerouslySetInnerHTML`, check where the HTML string originates. If it can be influenced by anyone other than a fully trusted server-side template with no interpolated user data, sanitize with `dompurify` (see `artifacts/umroh-app/src/shared/lib/sanitizeHtml.ts` for the allow-list used in this project) before rendering.
