import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, ServerCrash, ShieldOff, WifiOff } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { logError } from "@/shared/lib/errorLogger";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  errorInfo: string | null;
}

// ── Classify the error so we can show a helpful message ─────────────────────

type ErrorKind =
  | "permission"   // 403 / RLS policy
  | "not_found"    // 404 / table or row missing
  | "bad_request"  // 400 / bad query / schema mismatch
  | "network"      // offline / DNS
  | "realtime"     // supabase realtime channel error
  | "unknown";

function classify(err: Error): ErrorKind {
  const msg = (err?.message ?? "").toLowerCase();
  const stack = (err?.stack ?? "").toLowerCase();

  if (
    msg.includes("permission denied") ||
    msg.includes("row-level security") ||
    msg.includes("policy") ||
    msg.includes("403")
  ) return "permission";

  if (
    msg.includes("does not exist") ||
    msg.includes("not found") ||
    msg.includes("404")
  ) return "not_found";

  if (
    msg.includes("400") ||
    msg.includes("bad request") ||
    msg.includes("json object requested") ||
    msg.includes("multiple") ||
    msg.includes("schema")
  ) return "bad_request";

  if (
    msg.includes("networkerror") ||
    msg.includes("failed to fetch") ||
    msg.includes("err_name_not_resolved") ||
    msg.includes("net::err")
  ) return "network";

  if (
    msg.includes("postgres_changes") ||
    msg.includes("realtime") ||
    stack.includes("realtime")
  ) return "realtime";

  return "unknown";
}

interface ErrorMeta {
  icon: ReactNode;
  title: string;
  description: string;
  canRetry: boolean;
}

function getMeta(kind: ErrorKind, err: Error): ErrorMeta {
  switch (kind) {
    case "permission":
      return {
        icon: <ShieldOff className="w-8 h-8 text-amber-500" />,
        title: "Akses Ditolak",
        description:
          "Anda tidak memiliki izin untuk melihat data ini. Pastikan akun Anda memiliki role yang sesuai.",
        canRetry: false,
      };
    case "not_found":
      return {
        icon: <ServerCrash className="w-8 h-8 text-blue-500" />,
        title: "Data Tidak Ditemukan",
        description:
          "Tabel atau resource yang diminta tidak tersedia. Mungkin schema database belum dimigrasi atau nama tabel berubah.",
        canRetry: true,
      };
    case "bad_request":
      return {
        icon: <AlertTriangle className="w-8 h-8 text-orange-500" />,
        title: "Permintaan Tidak Valid (400)",
        description:
          "Query ke database gagal — kemungkinan ada kolom baru atau perubahan schema yang belum diterapkan.",
        canRetry: true,
      };
    case "network":
      return {
        icon: <WifiOff className="w-8 h-8 text-red-500" />,
        title: "Tidak Dapat Terhubung",
        description:
          "Gagal terhubung ke server. Periksa koneksi internet Anda atau coba lagi beberapa saat.",
        canRetry: true,
      };
    case "realtime":
      return {
        icon: <RefreshCw className="w-8 h-8 text-purple-500" />,
        title: "Koneksi Real-time Terganggu",
        description:
          "Langganan real-time ke database terputus. Ini bisa terjadi karena refresh cepat atau koneksi tidak stabil.",
        canRetry: true,
      };
    default:
      return {
        icon: <AlertTriangle className="w-8 h-8 text-red-500" />,
        title: "Terjadi Kesalahan",
        description:
          err.message || "Komponen ini mengalami error tak terduga. Coba muat ulang halaman.",
        canRetry: true,
      };
  }
}

// ── The boundary component ───────────────────────────────────────────────────

export class AdminQueryErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error, errorInfo: error.message };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    logError({
      message: error.message,
      stack: error.stack,
      error,
      context: {
        componentStack: info.componentStack.slice(0, 2000),
        location: typeof window !== "undefined" ? window.location.href : "",
        boundary: "AdminQueryErrorBoundary",
      },
    });
  }

  handleRetry = () => {
    this.setState({ error: null, errorInfo: null });
  };

  render() {
    const { error } = this.state;

    if (!error) return this.props.children;

    const kind = classify(error);
    const meta = getMeta(kind, error);

    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="w-full max-w-md rounded-xl border bg-card shadow-sm p-8 space-y-5 text-center">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              {meta.icon}
            </div>
          </div>

          {/* Title & description */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">{meta.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {meta.description}
            </p>
          </div>

          {/* Error detail (collapsed) */}
          <details className="text-left text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors select-none">
              Detail teknis
            </summary>
            <pre className="mt-2 p-3 bg-muted rounded-md overflow-auto max-h-32 text-muted-foreground whitespace-pre-wrap break-all">
              {error.message}
            </pre>
          </details>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
            {meta.canRetry && (
              <Button
                onClick={this.handleRetry}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Coba Lagi
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Muat Ulang Halaman
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
