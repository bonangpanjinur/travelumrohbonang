---
name: CMS metadata database source
description: Public title, favicon, and SEO metadata must use the server CMS settings endpoint backed by the database.
---

Public metadata should read branding and SEO values through the server's CMS settings endpoint, not direct browser queries to Supabase REST. The same source must drive the favicon, document title, page SEO tags, Open Graph/Twitter tags, and SEO overrides.

**Why:** Direct Supabase reads and server-side Drizzle reads can point at different environments after an import, causing the visible site title and favicon to disagree with the admin/database values.

**How to apply:** Use the public site-settings and SEO-overrides endpoints for metadata loaders, keep the HTML shell as a minimal bootstrap fallback, and ensure Drizzle response keys use camelCase while JSON setting keys retain their existing CMS contract.