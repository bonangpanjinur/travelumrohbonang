import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/shared/components/ui/button";

interface Props {
  onSign: (dataUrl: string) => void;
  disabled?: boolean;
}

/**
 * Custom signature pad using a plain <canvas>.
 *
 * Why not react-signature-canvas: it sets canvas size via CSS classes (w-full)
 * but never updates the canvas width/height *attributes*, so the internal
 * coordinate system stays at 300×150px while the element renders much wider.
 * Mouse/touch events then land completely off the drawable area, making the
 * pad appear frozen. This implementation uses a ResizeObserver to keep pixel
 * dimensions in sync with the rendered size.
 */
const SignaturePad = ({ onSign, disabled }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(true);

  /** Sync canvas pixel dimensions with CSS-rendered size */
  const syncSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (canvas.width !== Math.round(width) || canvas.height !== Math.round(height)) {
      // Save current drawing, resize, restore
      const ctx = canvas.getContext("2d");
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      ctx!.fillStyle = "#ffffff";
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      if (imageData) ctx?.putImageData(imageData, 0, 0);
    }
  }, []);

  useEffect(() => {
    syncSize();
    const ro = new ResizeObserver(syncSize);
    if (canvasRef.current) ro.observe(canvasRef.current);
    return () => ro.disconnect();
  }, [syncSize]);

  /** Get position relative to canvas */
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled) return;
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current || disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current!.x, lastPos.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
    lastPos.current = pos;
    setEmpty(false);
  };

  const endDraw = () => {
    drawing.current = false;
    lastPos.current = null;
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
  };

  const save = () => {
    if (empty) return;
    const dataUrl = canvasRef.current!.toDataURL("image/png");
    onSign(dataUrl);
  };

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-border rounded-xl overflow-hidden bg-white touch-none select-none">
        <canvas
          ref={canvasRef}
          className="w-full h-48 block cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      {empty && (
        <p className="text-xs text-muted-foreground text-center">
          Gambar tanda tangan Anda di dalam kotak di atas
        </p>
      )}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={clear}
          disabled={disabled || empty}
        >
          Bersihkan
        </Button>
        <Button
          type="button"
          onClick={save}
          disabled={disabled || empty}
          className="gradient-gold text-primary"
        >
          Tanda Tangani
        </Button>
      </div>
    </div>
  );
};

export default SignaturePad;
