import { useState } from "react";
import { Lock, Unlock, Loader2, CheckCircle2, AlertTriangle, ToggleLeft, ToggleRight, Info } from "lucide-react";
import { useFeatureFlags } from "@/features/admin/hooks/useFeatureFlags";
import {
  FEATURE_DEFINITIONS,
  FEATURE_CATEGORIES,
  type FeatureDef,
  type FeatureId,
} from "@/features/admin/config/featureDefinitions";
import { cn } from "@/shared/lib/utils";
import { useAuth } from "@/shared/hooks/useAuth";

// ── Confirm modal for turning off critical features ───────────────────────────
function ConfirmDisableModal({
  feature,
  onConfirm,
  onCancel,
}: {
  feature: FeatureDef;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Nonaktifkan Fitur Kritis?</h3>
            <p className="text-xs text-muted-foreground">Fitur ini penting untuk operasional</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Menonaktifkan <strong className="text-foreground">{feature.name}</strong> akan
          menyembunyikan modul ini dari semua pengguna selain super admin. Yakin ingin melanjutkan?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Nonaktifkan
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Single feature card ────────────────────────────────────────────────────────
function FeatureCard({
  feature,
  enabled,
  onToggle,
  saving,
}: {
  feature: FeatureDef;
  enabled: boolean;
  onToggle: () => void;
  saving: boolean;
}) {
  const Icon = feature.icon;

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all duration-200 flex flex-col gap-3",
        enabled
          ? "bg-card border-border"
          : "bg-muted/50 border-border/50 opacity-70"
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            enabled ? "bg-primary/10" : "bg-muted"
          )}
        >
          {enabled ? (
            <Icon className="w-4 h-4 text-primary" />
          ) : (
            <Lock className="w-4 h-4 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{feature.name}</span>
            {feature.critical && enabled && (
              <span className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide shrink-0">
                Kritis
              </span>
            )}
            {!enabled && (
              <span className="text-[9px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide shrink-0">
                Dikunci
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">
            {feature.description}
          </p>
        </div>
      </div>

      {/* Footer: routes + toggle */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
        <div className="flex flex-wrap gap-1">
          {feature.routes.slice(0, 2).map((r) => (
            <span
              key={r}
              className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-mono truncate max-w-[100px]"
              title={r}
            >
              {r.replace("/admin/", "")}
            </span>
          ))}
          {feature.routes.length > 2 && (
            <span className="text-[9px] text-muted-foreground">
              +{feature.routes.length - 2}
            </span>
          )}
        </div>

        <button
          onClick={onToggle}
          disabled={saving}
          className={cn(
            "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            saving && "opacity-50 cursor-not-allowed",
            enabled
              ? "bg-primary/10 text-primary hover:bg-primary/20"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : enabled ? (
            <ToggleRight className="w-3.5 h-3.5" />
          ) : (
            <ToggleLeft className="w-3.5 h-3.5" />
          )}
          {enabled ? "Aktif" : "Nonaktif"}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FeatureManagement() {
  const { role } = useAuth();
  const { flags, loading, setFlags, saving } = useFeatureFlags();
  const [savingId, setSavingId] = useState<FeatureId | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmFeature, setConfirmFeature] = useState<FeatureDef | null>(null);

  const isSuperAdmin = role === "super_admin";

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggle = async (feature: FeatureDef) => {
    if (!isSuperAdmin) return;
    const currentlyEnabled = flags[feature.id] ?? true;

    // Ask confirmation before disabling critical features
    if (currentlyEnabled && feature.critical) {
      setConfirmFeature(feature);
      return;
    }

    await doToggle(feature, currentlyEnabled);
  };

  const doToggle = async (feature: FeatureDef, currentlyEnabled: boolean) => {
    setSavingId(feature.id);
    try {
      await setFlags({ [feature.id]: !currentlyEnabled });
      showToast(
        currentlyEnabled
          ? `${feature.name} berhasil dinonaktifkan`
          : `${feature.name} berhasil diaktifkan`
      );
    } catch {
      showToast("Gagal menyimpan perubahan. Coba lagi.", false);
    } finally {
      setSavingId(null);
    }
  };

  const enabledCount = Object.values(flags).filter(Boolean).length;
  const totalCount = FEATURE_DEFINITIONS.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Manajemen Fitur</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aktifkan atau kunci modul untuk semua pengguna admin. Fitur yang dikunci hilang
            dari sidebar pengguna non-super-admin.
          </p>
        </div>
        {/* Summary pill */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">
              {enabledCount} / {totalCount} aktif
            </span>
          </div>
        </div>
      </div>

      {/* Super-admin-only notice */}
      {!isSuperAdmin && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Hanya <strong>super admin</strong> yang dapat mengubah status fitur.
          </p>
        </div>
      )}

      {/* Categories */}
      {FEATURE_CATEGORIES.map((category) => {
        const features = FEATURE_DEFINITIONS.filter((f) => f.category === category);
        const activeInCategory = features.filter((f) => flags[f.id] ?? true).length;

        return (
          <section key={category}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-semibold text-foreground">{category}</h2>
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground tabular-nums">
                {activeInCategory}/{features.length} aktif
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {features.map((feature) => (
                <FeatureCard
                  key={feature.id}
                  feature={feature}
                  enabled={flags[feature.id] ?? true}
                  onToggle={() => handleToggle(feature)}
                  saving={savingId === feature.id}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* Toast notification */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl border text-sm font-medium transition-all animate-in slide-in-from-bottom-2",
            toast.ok
              ? "bg-card border-green-200 text-green-700 dark:border-green-800 dark:text-green-400"
              : "bg-card border-destructive/30 text-destructive"
          )}
        >
          {toast.ok ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          {toast.msg}
        </div>
      )}

      {/* Confirm modal */}
      {confirmFeature && (
        <ConfirmDisableModal
          feature={confirmFeature}
          onConfirm={async () => {
            const f = confirmFeature;
            setConfirmFeature(null);
            await doToggle(f, true);
          }}
          onCancel={() => setConfirmFeature(null)}
        />
      )}
    </div>
  );
}
