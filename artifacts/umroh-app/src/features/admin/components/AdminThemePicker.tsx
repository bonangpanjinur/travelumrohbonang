import { Palette, Check, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { useAdminTheme, ADMIN_THEME_PRESETS, type AdminThemeId } from "@/features/admin/hooks/useAdminTheme";
import { cn } from "@/shared/lib/utils";

export function AdminThemePicker() {
  const { themeId, setAdminTheme, saving } = useAdminTheme();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          title="Ganti tema"
          className="flex items-center justify-center w-8 h-8 rounded-md text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground/90 transition-colors shrink-0 relative"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Palette className="w-4 h-4" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="end"
        sideOffset={12}
        className="w-52 p-3 z-50"
      >
        <p className="text-xs font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-primary" />
          Pilih Tema Admin
        </p>

        <div className="grid grid-cols-3 gap-2">
          {ADMIN_THEME_PRESETS.map((preset) => {
            const isActive = themeId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => setAdminTheme(preset.id as AdminThemeId)}
                title={preset.name}
                disabled={saving}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed",
                  isActive
                    ? "border-primary shadow-sm"
                    : "border-border hover:border-primary/40"
                )}
              >
                {/* Color swatch */}
                <div
                  className="w-full h-8 rounded-md shadow-sm overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${preset.previewPrimary} 50%, ${preset.previewAccent} 100%)`,
                  }}
                >
                  {isActive && (
                    <div className="w-full h-full flex items-center justify-center bg-black/20">
                      <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                    </div>
                  )}
                </div>

                <span className="text-[10px] font-medium text-foreground leading-none">
                  {preset.name}
                </span>
              </button>
            );
          })}
        </div>

        <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
          Tema disimpan otomatis dan berlaku untuk semua pengguna.
        </p>
      </PopoverContent>
    </Popover>
  );
}
