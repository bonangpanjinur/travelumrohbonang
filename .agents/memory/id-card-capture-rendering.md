---
name: ID card capture rendering
description: Rendering constraints for keeping the agent ID card preview, PDF, and print output visually identical.
---

For the agent ID card, avoid relying on CSS `clip-path` for decorative shapes when the same DOM is rasterized with `html2canvas`. The browser preview can render the diagonal geometry correctly while the canvas capture flattens it into rectangles or bands.

**Why:** The PDF and preview can use the same React data and nominal DOM structure yet still differ at rasterization time when html2canvas does not support a CSS feature equivalently.

**How to apply:** Represent geometric card decorations as inline SVG polygons or another capture-safe graphic primitive, but keep html2canvas on its standard renderer in this deployment because `foreignObjectRendering` can produce a completely white canvas. Before capture, convert inline SVGs such as QRCodeSVG to self-contained image data URLs with their measured rendered width and height. Keep PDF and print downstream of the same captured front/back images.

Text elements with tight computed pixel line boxes can still lose glyphs in the html2canvas export clone even when the browser preview looks correct. Mark critical text nodes and override the clone with `height: auto`, a comfortable line-height, and small vertical padding before capture.

**Why:** The export clone copies computed styles and can turn a responsive text line into a fixed-height box; html2canvas clips the glyphs at that box boundary.

**How to apply:** Keep the preview styling readable, then apply the export-only text override after computed styles are copied and before html2canvas runs. Avoid changing the source preview solely to compensate for a capture-only clipping bug.