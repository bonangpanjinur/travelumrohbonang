import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Phone, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";
import Navbar from "@/shared/components/layout/Navbar";
import Footer from "@/shared/components/layout/Footer";
import SEO from "@/shared/components/seo/SEO";
import { apiFetch } from "@/shared/lib/apiClient";

export interface PublicAgentSummary {
  id: string;
  name: string;
  phone: string | null;
  photoUrl: string | null;
  agentCode: string | null;
  publicSlug: string;
  status: string;
}

const normalize = (value: string | null | undefined) => value?.toLocaleLowerCase().replace(/\s+/g, " ").trim() ?? "";
const normalizeDigits = (value: string | null | undefined) => value?.replace(/\D/g, "") ?? "";

const AgentSkeleton = () => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Memuat daftar agen">
    {[0, 1, 2, 3, 4, 5].map((item) => (
      <div key={item} className="rounded-[1.5rem] border border-border/70 bg-card p-5 shadow-sm" data-testid={`skeleton-agent-${item}`}>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 animate-pulse rounded-2xl bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="mt-6 h-10 animate-pulse rounded-xl bg-muted" />
      </div>
    ))}
  </div>
);

const AgentAvatar = ({ agent }: { agent: PublicAgentSummary }) => {
  const initials = agent.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  if (agent.photoUrl) {
    return (
      <img
        src={agent.photoUrl}
        alt={`Foto ${agent.name}`}
        width={72}
        height={72}
        loading="lazy"
        className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-2xl object-cover ring-1 ring-primary/10"
        data-testid={`img-agent-photo-${agent.id}`}
      />
    );
  }

  return (
    <div
      className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-gold"
      aria-label={`Inisial ${agent.name}`}
      data-testid={`avatar-agent-${agent.id}`}
    >
      {initials || "A"}
    </div>
  );
};

const AgentCard = ({ agent }: { agent: PublicAgentSummary }) => (
  <article
    className="group flex min-h-[17.5rem] flex-col rounded-[1.5rem] border border-border/75 bg-card p-5 shadow-[0_10px_32px_hsl(var(--primary)/0.05)] transition-transform duration-300 hover:-translate-y-1 hover:border-gold/60 hover:shadow-[0_18px_45px_hsl(var(--primary)/0.1)] sm:p-6"
    data-testid={`card-agent-${agent.id}`}
  >
    <div className="flex items-start gap-4">
      <AgentAvatar agent={agent} />
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-gold-dark" aria-hidden="true" />
          Agen resmi
        </div>
        <h2 className="mt-2 truncate font-display text-xl font-bold leading-tight text-foreground" data-testid={`text-agent-name-${agent.id}`}>
          {agent.name}
        </h2>
        {agent.agentCode && (
          <p className="mt-1 font-mono text-xs tracking-wide text-muted-foreground" data-testid={`text-agent-code-${agent.id}`}>
            ID {agent.agentCode}
          </p>
        )}
      </div>
    </div>

    <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Kontak</p>
        <p className="mt-1 flex items-center gap-1.5 truncate text-sm font-medium text-foreground" data-testid={`text-agent-phone-${agent.id}`}>
          <Phone className="h-3.5 w-3.5 shrink-0 text-gold-dark" aria-hidden="true" />
          {agent.phone || "Hubungi melalui profil"}
        </p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-success" data-testid={`status-agent-${agent.id}`}>
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        {agent.status || "Aktif"}
      </span>
    </div>

    <Link
      to={`/agen/${encodeURIComponent(agent.publicSlug)}`}
      className="mt-auto flex min-h-11 items-center justify-between rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-elegant-black-dark focus-visible:bg-elegant-black-dark"
      data-testid={`link-agent-profile-${agent.id}`}
      aria-label={`Buka profil ${agent.name}`}
    >
      Lihat profil agen
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
    </Link>
  </article>
);

const PublicAgentDirectory = () => {
  const [agents, setAgents] = useState<PublicAgentSummary[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await apiFetch<{ data: PublicAgentSummary[] }>("/api/agents");
      setAgents(Array.isArray(result?.data) ? result.data : []);
    } catch {
      setError(true);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const filteredAgents = useMemo(() => {
    const normalizedQuery = normalize(query);
    const digitQuery = normalizeDigits(query);
    if (!normalizedQuery) return agents;

    return agents.filter((agent) => {
      const textFields = [agent.name, agent.agentCode, agent.id, agent.phone]
        .map(normalize)
        .join(" ");
      const phoneDigits = normalizeDigits(agent.phone);
      return textFields.includes(normalizedQuery) || (digitQuery.length > 0 && phoneDigits.includes(digitQuery));
    });
  }, [agents, query]);

  const hasQuery = query.trim().length > 0;

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-background">
      <SEO
        title="Agen Resmi Vins Tour Travel"
        description="Temukan agen resmi Vins Tour Travel untuk mendapatkan informasi dan pendampingan perjalanan ibadah umroh."
      />
      <Navbar />

      <main>
        <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
          <div className="islamic-pattern absolute inset-0 opacity-60" aria-hidden="true" />
          <div className="absolute -right-28 -top-40 h-[28rem] w-[28rem] rounded-full border border-gold/20" aria-hidden="true" />
          <div className="absolute -right-12 -top-24 h-72 w-72 rounded-full border border-gold/10" aria-hidden="true" />
          <div className="container-custom relative px-4 pb-24 pt-32 sm:px-6 sm:pt-36 lg:px-8">
            <div className="max-w-3xl">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-gold-light" data-testid="text-directory-eyebrow">
                <span className="h-px w-8 bg-gold" aria-hidden="true" />
                Jaringan mitra resmi
              </p>
              <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.06] tracking-tight sm:text-5xl md:text-6xl" data-testid="heading-agent-directory">
                Temukan agen yang mendampingi perjalanan Anda.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-primary-foreground/75 sm:text-base" data-testid="text-directory-intro">
                Pilih agen resmi Vins Tour Travel untuk mendapatkan informasi paket umroh dan bantuan yang lebih dekat dengan kebutuhan Anda.
              </p>
            </div>

            <div className="relative mt-9 max-w-2xl">
              <label htmlFor="agent-search" className="sr-only">Cari nama, ID agen, atau nomor telepon</label>
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-primary/60" aria-hidden="true" />
              <input
                id="agent-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama, ID agen, atau nomor telepon"
                className="min-h-14 w-full rounded-2xl border border-white/20 bg-cream pl-14 pr-12 text-sm text-foreground shadow-xl shadow-black/10 outline-none placeholder:text-muted-foreground/80 focus:border-gold focus:ring-2 focus:ring-gold/40"
                data-testid="input-agent-search"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="touch-target absolute right-2 top-1/2 -translate-y-1/2 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  aria-label="Hapus pencarian"
                  data-testid="button-clear-agent-search"
                >
                  <span aria-hidden="true" className="text-xl leading-none">×</span>
                </button>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-primary-foreground/65">
              <span className="inline-flex items-center gap-2" data-testid="text-directory-trust">
                <ShieldCheck className="h-4 w-4 text-gold" aria-hidden="true" />
                Agen terverifikasi perusahaan
              </span>
              <span className="inline-flex items-center gap-2" data-testid="text-directory-privacy">
                <Users className="h-4 w-4 text-gold" aria-hidden="true" />
                Tanpa menampilkan alamat pribadi
              </span>
            </div>
          </div>
        </section>

        <section className="container-custom px-4 py-12 sm:px-6 sm:py-16 lg:px-8" aria-labelledby="agent-results-heading">
          <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Daftar agen</p>
              <h2 id="agent-results-heading" className="mt-2 text-3xl font-bold sm:text-4xl">Agen resmi Vins Tour Travel</h2>
            </div>
            {!loading && !error && agents.length > 0 && (
              <p className="text-sm text-muted-foreground" data-testid="text-agent-result-count">
                {filteredAgents.length} {filteredAgents.length === 1 ? "agen" : "agen"} ditemukan
              </p>
            )}
          </div>

          {loading && <AgentSkeleton />}

          {!loading && error && (
            <div className="rounded-[1.5rem] border border-destructive/20 bg-destructive/5 px-6 py-12 text-center" role="alert" data-testid="state-agent-error">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                <RefreshCw className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-2xl font-bold">Daftar agen belum dapat dimuat</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Periksa koneksi Anda, lalu coba muat kembali halaman ini.</p>
              <button
                type="button"
                onClick={loadAgents}
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-elegant-black-dark"
                data-testid="button-retry-agents"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Coba lagi
              </button>
            </div>
          )}

          {!loading && !error && agents.length === 0 && (
            <div className="rounded-[1.5rem] border border-border/75 bg-card px-6 py-14 text-center shadow-sm" data-testid="state-agent-empty">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark">
                <Users className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-2xl font-bold">Belum ada agen yang tampil</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Daftar agen resmi sedang dipersiapkan. Silakan kembali lagi dalam waktu dekat.</p>
            </div>
          )}

          {!loading && !error && agents.length > 0 && filteredAgents.length === 0 && (
            <div className="rounded-[1.5rem] border border-border/75 bg-card px-6 py-14 text-center shadow-sm" data-testid="state-agent-zero-results">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark">
                <Search className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-2xl font-bold">Agen tidak ditemukan</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Tidak ada agen yang cocok dengan “{query}”. Coba cari menggunakan nama, ID agen, atau nomor telepon lain.
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-primary/20 px-5 py-3 text-sm font-semibold text-primary hover:bg-primary/5"
                data-testid="button-reset-agent-search"
              >
                Tampilkan semua agen
              </button>
            </div>
          )}

          {!loading && !error && filteredAgents.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="list-agent-results">
              {filteredAgents.map((agent) => <AgentCard key={agent.id} agent={agent} />)}
            </div>
          )}

          {!loading && !error && agents.length > 0 && (
            <p className="mt-10 text-center text-xs leading-5 text-muted-foreground" data-testid="text-directory-disclaimer">
              Profil pada halaman ini merupakan agen yang telah dipublikasikan dan diaktifkan oleh Vins Tour Travel.
            </p>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PublicAgentDirectory;