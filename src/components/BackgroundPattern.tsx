import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BackgroundPatternProps {
  children: React.ReactNode;
  className?: string;
  overlay?: boolean;
  overlayOpacity?: number;
}

interface BackgroundSettings {
  type: "pattern" | "image";
  image_url?: string;
  pattern_type?: "islamic" | "dots" | "grid";
}

const BackgroundPattern = ({ 
  children, 
  className = "", 
  overlay = true,
  overlayOpacity = 0.85
}: BackgroundPatternProps) => {
  const [settings, setSettings] = useState<BackgroundSettings | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "background")
        .eq("category", "appearance")
        .single();

      if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
        const val = data.value as Record<string, unknown>;
        if (val.type) {
          setSettings(val as unknown as BackgroundSettings);
        }
      }
    };
    fetchSettings();
  }, []);

  const getBackgroundStyle = (): React.CSSProperties => {
    if (settings?.type === "image" && settings.image_url) {
      return {
        backgroundImage: `url(${settings.image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed"
      };
    }
    return {};
  };

  const getPatternClass = () => {
    if (settings?.type === "image") return "";
    
    switch (settings?.pattern_type) {
      case "dots": return "bg-dots-pattern";
      case "grid": return "bg-grid-pattern";
      case "islamic":
      default: return "islamic-pattern";
    }
  };

  return (
    <div 
      className={`relative ${getPatternClass()} ${className}`}
      style={getBackgroundStyle()}
    >
      {overlay && settings?.type === "image" && (
        <div 
          className="absolute inset-0 bg-background"
          style={{ opacity: overlayOpacity }}
        />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default BackgroundPattern;
