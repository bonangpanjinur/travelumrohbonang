---
name: ID card capture rendering
description: Rendering constraints for keeping the agent ID card preview, PDF, and print output visually identical.
---

For the agent ID card, avoid relying on CSS `clip-path` for decorative shapes when the same DOM is rasterized with `html2canvas`. The browser preview can render the diagonal geometry correctly while the canvas capture flattens it into rectangles or bands.

**Why:** The PDF and preview can use the same React data and nominal DOM structure yet still differ at rasterization time when html2canvas does not support a CSS feature equivalently.

**How to apply:** Represent geometric card decorations as inline SVG polygons or another capture-safe graphic primitive, but keep html2canvas on its standard renderer in this deployment because `foreignObjectRendering` can produce a completely white canvas. Before capture, convert inline SVGs such as QRCodeSVG to self-contained image data URLs with their measured rendered width and height. Keep PDF and print downstream of the same captured front/back images.