import { useState } from "react";
import { Palette, Check, Loader2, X } from "lucide-react";
import { useAdminTheme, ADMIN_THEME_PRESETS, type AdminThemeId } from "@/features/admin/hooks/useAdminTheme";
import { cn } from "@/shared/lib/utils";

/** Mini visual mockup of an admin layout for the given theme */
function ThemeMockup({
  previewSidebar,
  previewAccent,
  previewBg,
  previewCard,
  radius,
  active,
}: {
  previewSidebar: string;
  previewAccent: string;
  previewBg: string;
  previewCard: string;
  radius: string;
  active: boolean;
}) {
  // Scale the radius down for the tiny mockup
  const r = Math.min(parseFloat(radius) * 6, 4);
  return (
    <div
      className="w-full h-16 flex overflow-hidden border border-border"
      style={{ borderRadius: `${r}px`, background: previewBg }}
    >
      {/* Sidebar strip */}
      <div
        className="w-7 h-full flex flex-col items-center pt-1.5 gap-1 shrink-0"
        style={{ background: previewSidebar }}
      >
        {/* Logo dot */}
        <div className="w-3 h-3 rounded-full" style={{ background: previewAccent }} />
        {/* Nav items */}
        {[1, 0.5, 0.5, 0.5].map((o, i) => (
          <div
            key={i}
            className="w-4 h-1 rounded-full"
            style={{ background: previewAccent, opacity: o }}
          />
        ))}
      </div>
      {/* Content area */}
      <div className="flex-1 p-1.5 flex flex-col gap-1">
        {/* Header bar */}
        <div
          className="w-full h-2 rounded-sm"
          style={{ background: previewCard, borderRadius: `${r * 0.5}px` }}
        />
        {/* Cards grid */}
        <div className="flex gap-1 flex-1">
          {[1, 1, 1].map((_, i) => (
            <div
              key={i}
              className="flex-1 h-full flex flex-col gap-0.5 p-1"
              style={{
                background: previewCard,
                borderRadius: `${r * 0.6}px`,
              }}
            >
              <div
                className="w-full h-1.5"
                style={{
                  background: i === 0 ? previewAccent : previewSidebar,
                  opacity: i === 0 ? 0.8 : 0.3,
                  borderRadius: `${r * 0.3}px`,
                }}
              />
              <div
                className="w-3/4 h-1"
                style={{
                  background: previewSidebar,
                  opacity: 0.2,
                  borderRadius: `${r * 0.3}px`,
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminThemePicker() {
  const { themeId, setAdminTheme, saving } = useAdminTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        title="Ganti tema dashboard"
        className="flex items-center justify-center w-8 h-8 rounded-md text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground/90 transition-colors shrink-0"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Palette className="w-4 h-4" />
        )}
      </button>

      {/* Fullscreen overlay panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary" />
                <div>
                  <h2 className="font-semibold text-sm text-foreground">Pilih Tampilan Admin</h2>
                  <p className="text-xs text-muted-foreground">
                    Setiap tema berbeda di warna, sudut, dan tipografi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Theme grid */}
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ADMIN_THEME_PRESETS.map((preset) => {
                const isActive = themeId === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={async () => {
                      await setAdminTheme(preset.id as AdminThemeId);
                      setOpen(false);
                    }}
                    disabled={saving}
                    className={cn(
                      "relative text-left rounded-xl border-2 p-2 transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed group",
                      isActive
                        ? "border-primary shadow-md"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {/* Active checkmark */}
                    {isActive && (
                      <div
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center shadow z-10"
                        style={{ background: preset.previewAccent }}
                      >
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}

                    {/* Mini mockup */}
                    <ThemeMockup
                      previewSidebar={preset.previewSidebar}
                      previewAccent={preset.previewAccent}
                      previewBg={preset.previewBg}
                      previewCard={preset.previewCard}
                      radius={preset.radius}
                      active={isActive}
                    />

                    {/* Label */}
                    <div className="mt-2 px-0.5">
                      <div className="flex items-center gap-1.5">
                        {/* Color dots */}
                        <div
                          className="w-3 h-3 rounded-full border border-white shadow-sm shrink-0"
                          style={{ background: preset.previewSidebar }}
                        />
                        <div
                          className="w-3 h-3 rounded-full border border-white shadow-sm shrink-0"
                          style={{ background: preset.previewAccent }}
                        />
                        <span className="text-xs font-semibold text-foreground leading-none">
                          {preset.name}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                        {preset.description}
                      </p>
                      {/* Radius & font hint */}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full leading-none">
                          r={preset.radius}
                        </span>
                        <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full leading-none truncate max-w-[70px]">
                          {preset.fontDisplay.split("'")[1]?.split(",")[0] ?? "Sans"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 pb-4 text-xs text-muted-foreground text-center">
              Tema langsung diterapkan dan disimpan untuk semua pengguna.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
