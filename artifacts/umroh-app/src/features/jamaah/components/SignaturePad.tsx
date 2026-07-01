import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";

interface Props {
  onSign: (dataUrl: string) => void;
  disabled?: boolean;
}

const SignaturePad = ({ onSign, disabled }: Props) => {
  const ref = useRef<SignatureCanvas | null>(null);
  const [empty, setEmpty] = useState(true);

  const clear = () => {
    ref.current?.clear();
    setEmpty(true);
  };

  const save = () => {
    if (!ref.current || ref.current.isEmpty()) return;
    const dataUrl = ref.current.getTrimmedCanvas().toDataURL("image/png");
    onSign(dataUrl);
  };

  return (
    <div className="space-y-2">
      <div className="border rounded-md bg-background">
        <SignatureCanvas
          ref={ref as any}
          penColor="hsl(var(--foreground))"
          canvasProps={{ className: "w-full h-48 rounded-md" }}
          onEnd={() => setEmpty(false)}
        />
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={clear} disabled={disabled}>Bersihkan</Button>
        <Button type="button" onClick={save} disabled={disabled || empty}>Tanda Tangani</Button>
      </div>
    </div>
  );
};

export default SignaturePad;
