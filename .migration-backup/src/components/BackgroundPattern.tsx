import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BackgroundPatternProps {
  children: React.ReactNode;
  className?: string;
  variant?: "light" | "dark" | "none";
}

interface BackgroundSettings {
  type: "pattern" | "image" | "none";
  image_url?: string;
  pattern_type?: "islamic" | "dots" | "grid" | "none";
}

const BackgroundPattern = ({ 
  children, 
  className = "", 
  variant = "light"
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

  // If settings are "none", just render children with className
  if (settings?.type === "none" || settings?.pattern_type === "none") {
    return <div className={className}>{children}</div>;
  }

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
    if (variant === "none") return "";
    
    const patternType = settings?.pattern_type || "islamic";
    
    // Use lighter patterns for light backgrounds
    if (variant === "light") {
      switch (patternType) {
        case "dots": return "bg-dots-pattern";
        case "grid": return "bg-grid-pattern";
        case "islamic": 
        default: return "islamic-pattern-light";
      }
    }
    
    // Use standard patterns for dark backgrounds
    switch (patternType) {
      case "dots": return "bg-dots-pattern";
      case "grid": return "bg-grid-pattern";
      case "islamic":
      default: return "islamic-pattern";
    }
  };

  // For image backgrounds, add an overlay
  if (settings?.type === "image" && settings.image_url) {
    return (
      <div 
        className={`relative ${className}`}
        style={getBackgroundStyle()}
      >
        <div className="absolute inset-0 bg-background/95" />
        <div className="relative z-10">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={`${getPatternClass()} ${className}`}>
      {children}
    </div>
  );
};

export default BackgroundPattern;
