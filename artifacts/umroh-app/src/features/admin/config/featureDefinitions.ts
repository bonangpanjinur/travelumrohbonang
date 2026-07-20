import type { LucideIcon } from "lucide-react";
import {
  Ticket, Users, FileCheck, BedDouble, ShieldCheck, Backpack,
  CreditCard, Receipt, BarChart3, FileText, Wallet, MessageCircle,
  Briefcase, Trophy, Coins, BookOpen, Image, Star, GitBranch,
  AlertTriangle, Settings2, Tag,
} from "lucide-react";

export type FeatureId =
  | "bookings"
  | "jamaah"
  | "documents"
  | "room_assignment"
  | "check_in"
  | "equipment"
  | "payments"
  | "installments"
  | "refunds"
  | "coupons"
  | "reports"
  | "contracts"
  | "crm"
  | "agents"
  | "loyalty"
  | "chats"
  | "social_kit"
  | "blog"
  | "gallery"
  | "testimonials"
  | "multi_branch"
  | "incident_management";

export type FeatureCategory =
  | "Operasional"
  | "Keuangan"
  | "CRM & Marketing"
  | "Konten"
  | "Infrastruktur";

export interface FeatureDef {
  id: FeatureId;
  name: string;
  description: string;
  category: FeatureCategory;
  icon: LucideIcon;
  /** Routes that are hidden/blocked when this feature is disabled */
  routes: string[];
  /** If true, disabling this feature has significant operational impact */
  critical?: boolean;
}

export const FEATURE_DEFINITIONS: FeatureDef[] = [
  // ── Operasional ────────────────────────────────────────────────────────────
  {
    id: "bookings",
    name: "Booking & Reservasi",
    description: "Kelola semua pemesanan paket umroh dari calon jamaah.",
    category: "Operasional",
    icon: Ticket,
    routes: ["/admin/bookings"],
    critical: true,
  },
  {
    id: "jamaah",
    name: "Manajemen Jemaah",
    description: "Database jemaah, data per booking, dan manifest keberangkatan.",
    category: "Operasional",
    icon: Users,
    routes: ["/admin/pilgrims", "/admin/pilgrims-db", "/admin/manifest"],
    critical: true,
  },
  {
    id: "documents",
    name: "Dokumen Jemaah",
    description: "Upload, tracking, dan pengelolaan dokumen paspor & visa.",
    category: "Operasional",
    icon: FileCheck,
    routes: ["/admin/documents", "/admin/document-tracking"],
  },
  {
    id: "room_assignment",
    name: "Penempatan Kamar",
    description: "Atur penempatan kamar hotel untuk setiap jamaah per keberangkatan.",
    category: "Operasional",
    icon: BedDouble,
    routes: ["/admin/room-assignment"],
  },
  {
    id: "check_in",
    name: "Check-In & QR",
    description: "Proses check-in keberangkatan menggunakan QR code scanner.",
    category: "Operasional",
    icon: ShieldCheck,
    routes: ["/admin/check-in"],
  },
  {
    id: "equipment",
    name: "Perlengkapan & Manasik",
    description: "Kelola perlengkapan manasik, distribusi, dan laporan perlengkapan.",
    category: "Operasional",
    icon: Backpack,
    routes: ["/admin/manasik", "/admin/equipment", "/admin/equipment-report"],
  },
  // ── Keuangan ───────────────────────────────────────────────────────────────
  {
    id: "payments",
    name: "Pembayaran",
    description: "Verifikasi bukti bayar, riwayat transaksi, dan payment gateway.",
    category: "Keuangan",
    icon: CreditCard,
    routes: ["/admin/payments", "/admin/payment-gateway", "/admin/proof-access-logs"],
    critical: true,
  },
  {
    id: "installments",
    name: "Cicilan",
    description: "Jadwal cicilan otomatis, tagihan, dan notifikasi jatuh tempo.",
    category: "Keuangan",
    icon: Receipt,
    routes: ["/admin/installments"],
  },
  {
    id: "refunds",
    name: "Refund",
    description: "Proses pengajuan dan persetujuan refund dari jamaah.",
    category: "Keuangan",
    icon: Wallet,
    routes: ["/admin/refunds"],
  },
  {
    id: "coupons",
    name: "Kupon & Promo",
    description: "Buat dan kelola kode kupon diskon untuk jamaah.",
    category: "Keuangan",
    icon: Tag,
    routes: ["/admin/coupons"],
  },
  {
    id: "reports",
    name: "Laporan & Analitik",
    description: "Laporan keuangan, HPP, akuntansi, dan dashboard analitik bisnis.",
    category: "Keuangan",
    icon: BarChart3,
    routes: ["/admin/reports", "/admin/analytics", "/admin/accounting", "/admin/package-costs"],
  },
  {
    id: "contracts",
    name: "Kontrak Jamaah",
    description: "Buat dan kelola kontrak perjanjian antara travel dan jamaah.",
    category: "Keuangan",
    icon: FileText,
    routes: ["/admin/contracts"],
  },
  // ── CRM & Marketing ────────────────────────────────────────────────────────
  {
    id: "crm",
    name: "CRM & Pipeline",
    description: "Manajemen prospek, pipeline penjualan, dan follow-up calon jamaah.",
    category: "CRM & Marketing",
    icon: Briefcase,
    routes: ["/admin/crm"],
  },
  {
    id: "agents",
    name: "Manajemen Agen",
    description: "Portal agen, komisi, pencairan, dan leaderboard performa agen.",
    category: "CRM & Marketing",
    icon: Trophy,
    routes: ["/admin/agents", "/admin/agent-withdrawals", "/admin/leaderboard"],
  },
  {
    id: "loyalty",
    name: "Program Loyalitas",
    description: "Poin loyalitas dan reward untuk jamaah setia.",
    category: "CRM & Marketing",
    icon: Coins,
    routes: ["/admin/loyalty"],
  },
  {
    id: "chats",
    name: "Live Chat",
    description: "Komunikasi real-time antara admin dan jamaah.",
    category: "CRM & Marketing",
    icon: MessageCircle,
    routes: ["/admin/chats"],
  },
  {
    id: "social_kit",
    name: "Social Media Kit",
    description: "Generate materi promosi otomatis untuk media sosial.",
    category: "CRM & Marketing",
    icon: Star,
    routes: ["/admin/social-kit"],
  },
  // ── Konten ─────────────────────────────────────────────────────────────────
  {
    id: "blog",
    name: "Blog & Artikel",
    description: "Kelola artikel blog, panduan umroh, dan konten edukasi.",
    category: "Konten",
    icon: BookOpen,
    routes: ["/admin/blog"],
  },
  {
    id: "gallery",
    name: "Galeri & Media",
    description: "Upload dan kelola galeri foto keberangkatan.",
    category: "Konten",
    icon: Image,
    routes: ["/admin/gallery"],
  },
  {
    id: "testimonials",
    name: "Testimoni & Ulasan",
    description: "Tampilkan dan moderasi ulasan dari alumni jamaah.",
    category: "Konten",
    icon: Star,
    routes: ["/admin/testimonials", "/admin/reviews"],
  },
  // ── Infrastruktur ──────────────────────────────────────────────────────────
  {
    id: "multi_branch",
    name: "Multi-Cabang",
    description: "Kelola beberapa kantor cabang dengan akses terpisah.",
    category: "Infrastruktur",
    icon: GitBranch,
    routes: ["/admin/branches", "/admin/multi-branch"],
  },
  {
    id: "incident_management",
    name: "Manajemen Insiden",
    description: "Laporan dan penanganan insiden saat perjalanan berlangsung.",
    category: "Infrastruktur",
    icon: AlertTriangle,
    routes: ["/admin/incident-management", "/admin/incident-reports"],
  },
];

/** Feature IDs grouped by category, in display order */
export const FEATURE_CATEGORIES: FeatureCategory[] = [
  "Operasional",
  "Keuangan",
  "CRM & Marketing",
  "Konten",
  "Infrastruktur",
];

/** All feature IDs */
export const ALL_FEATURE_IDS = FEATURE_DEFINITIONS.map((f) => f.id);

/** Default state — all features enabled */
export const DEFAULT_FLAGS: Record<FeatureId, boolean> = Object.fromEntries(
  ALL_FEATURE_IDS.map((id) => [id, true])
) as Record<FeatureId, boolean>;

/** Map from route prefix → featureId (for route-level gating) */
export const ROUTE_FEATURE_MAP: Record<string, FeatureId> = Object.fromEntries(
  FEATURE_DEFINITIONS.flatMap((f) => f.routes.map((r) => [r, f.id]))
);

/** Get the featureId that guards a given pathname, or null if always accessible */
export function getFeatureForPath(pathname: string): FeatureId | null {
  for (const [route, featureId] of Object.entries(ROUTE_FEATURE_MAP)) {
    if (pathname === route || pathname.startsWith(route + "/")) {
      return featureId;
    }
  }
  return null;
}
