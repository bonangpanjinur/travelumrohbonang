/**
 * Client-side watermark utility.
 * Loads an image, overlays text (brand + optional label), returns a data URL.
 * For privacy-preserving display: use signed/private URLs server-side as upgrade later.
 */
export async function applyWatermark(
  imageUrl: string,
  brandText: string,
  subText?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0);

        // Diagonal repeating watermark
        const fontSize = Math.max(18, Math.floor(canvas.width / 28));
        ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.strokeStyle = "rgba(0,0,0,0.25)";
        ctx.lineWidth = 2;

        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 6);
        const step = fontSize * 6;
        for (let y = -canvas.height; y < canvas.height; y += step) {
          for (let x = -canvas.width; x < canvas.width; x += step * 2) {
            ctx.strokeText(brandText, x, y);
            ctx.fillText(brandText, x, y);
          }
        }
        ctx.restore();

        // Bottom-right corner label
        if (subText) {
          const pad = Math.floor(canvas.width / 60);
          const labelSize = Math.max(14, Math.floor(canvas.width / 50));
          ctx.font = `500 ${labelSize}px system-ui, sans-serif`;
          const metrics = ctx.measureText(subText);
          const boxW = metrics.width + pad * 2;
          const boxH = labelSize + pad * 1.4;
          const x = canvas.width - boxW - pad;
          const y = canvas.height - boxH - pad;
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.fillRect(x, y, boxW, boxH);
          ctx.fillStyle = "#fff";
          ctx.fillText(subText, x + pad, y + labelSize + pad * 0.2);
        }

        resolve(canvas.toDataURL("image/jpeg", 0.9));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageUrl;
  });
}
