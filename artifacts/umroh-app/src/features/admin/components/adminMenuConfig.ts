import {
  Calculator,
  LayoutDashboard,
  BellRing,
  Package, 
  Calendar, 
  Users, 
  Building2, 
  Hotel, 
  Plane, 
  MapPin,
  User,
  Ticket,
  FileText,
  Settings,
  Menu,
  Image,
  HelpCircle,
  MessageCircle,
  BookOpen,
  Globe,
  Star,
  Footprints,
  Briefcase,
  CreditCard,
  BarChart3,
  FileCheck,
  Wallet,
  Languages,
  GitBranch,
  AlertTriangle,
  BarChart2,
  ArrowUpCircle,
  ClipboardList,
  Receipt,
  ShieldCheck,
  ShieldAlert,
  Trophy,
  Coins,
  KeyRound,
  Lock,
  Search,
  Tag,
  LineChart,
  Activity,
  Layers,
  Megaphone,
  Database,
  SlidersHorizontal,
  Backpack,
  BedDouble,
  ToggleRight,
  PiggyBank,
  TrendingDown,
  Scale,
  type LucideIcon

} from "lucide-react";

export interface MenuItem {
  label: string;
  labelKey: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
  premium?: boolean;
  premiumFeature?: string;
  /** featureId from featureDefinitions — item hidden when that feature is disabled */
  featureId?: string;
}

export interface MenuGroup {
  label: string;
  labelKey: string;
  icon: LucideIcon;
  items: MenuItem[];
}

export interface BrandingSettings {
  logo_url: string;
  company_name: string;
  tagline: string;
  favicon_url: string;
  display_mode: "logo_only" | "text_only" | "both";
}

export const defaultBranding: BrandingSettings = {
  logo_url: "",
  company_name: "UmrohPlus",
  tagline: "Travel & Tours",
  favicon_url: "",
  display_mode: "both",
};

// Role constants for reuse
const ALL_STAFF = ["super_admin", "admin", "branch_manager", "staff"];
const SUPER_ADMIN_ADMIN = ["super_admin", "admin"];
const SUPER_ONLY = ["super_admin"];
const OPERATIONAL = ["super_admin", "admin", "branch_manager", "staff", "agent"];
const FINANCE = ["super_admin", "admin", "branch_manager"];

export const menuGroups: MenuGroup[] = [
  {
    label: "Utama",
    labelKey: "menu.group.main",
    icon: LayoutDashboard,
    items: [
      { label: "Dashboard", labelKey: "menu.dashboard", href: "/admin", icon: LayoutDashboard, roles: OPERATIONAL },
      { label: "Notifikasi", labelKey: "menu.notifications", href: "/admin/notifications", icon: BellRing, roles: OPERATIONAL },
    ],
  },
  {
    label: "Operasional",
    labelKey: "menu.group.operations",
    icon: Package,
    items: [
      { label: "Paket", labelKey: "menu.packages", href: "/admin/packages", icon: Package, roles: ALL_STAFF },
      { label: "Jadwal Keberangkatan", labelKey: "menu.departures", href: "/admin/departures", icon: Calendar, roles: ALL_STAFF },
      { label: "Itinerary Perjalanan", labelKey: "menu.itineraries", href: "/admin/itineraries", icon: MapPin, roles: ALL_STAFF },
      { label: "Booking", labelKey: "menu.bookings", href: "/admin/bookings", icon: Ticket, roles: OPERATIONAL, featureId: "bookings" },
      { label: "Jemaah per Booking", labelKey: "menu.pilgrims", href: "/admin/pilgrims", icon: Users, roles: ALL_STAFF, featureId: "jamaah" },
      { label: "Data Induk Jemaah", labelKey: "menu.pilgrims_db", href: "/admin/pilgrims-db", icon: Database, roles: ALL_STAFF, featureId: "jamaah" },
      { label: "Manifest Keberangkatan", labelKey: "menu.manifest", href: "/admin/manifest", icon: ClipboardList, roles: ALL_STAFF, featureId: "jamaah" },
      { label: "Penempatan Kamar", labelKey: "menu.room_assignment", href: "/admin/room-assignment", icon: BedDouble, roles: ALL_STAFF, featureId: "room_assignment" },
      { label: "Check-In Keberangkatan", labelKey: "menu.checkin_qr", href: "/admin/check-in", icon: ShieldCheck, roles: ALL_STAFF, featureId: "check_in" },
      { label: "Perlengkapan Manasik", labelKey: "menu.manasik_kit", href: "/admin/manasik", icon: BookOpen, roles: SUPER_ADMIN_ADMIN, featureId: "equipment" },
      { label: "Dokumen Jemaah", labelKey: "menu.pilgrim_documents", href: "/admin/documents", icon: FileCheck, roles: OPERATIONAL, featureId: "documents" },
      { label: "Tracking Dokumen", labelKey: "menu.document_tracking", href: "/admin/document-tracking", icon: BarChart2, roles: ALL_STAFF, featureId: "documents" },
      { label: "Laporan Perlengkapan", labelKey: "menu.equipment_report", href: "/admin/equipment-report", icon: Backpack, roles: ALL_STAFF, featureId: "equipment" },
      { label: "Laporan Insiden", labelKey: "menu.incident_management", href: "/admin/incident-management", icon: AlertTriangle, roles: OPERATIONAL, featureId: "incident_management" },
      // ── O-8/9/10/11 ───────────────────────────────────────────────────────────
      { label: "Distribusi Perlengkapan", labelKey: "menu.equipment_distribution", href: "/admin/equipment-distribution", icon: Backpack, roles: SUPER_ADMIN_ADMIN, featureId: "equipment" },
      { label: "Tracking Visa", labelKey: "menu.visa_tracking", href: "/admin/visa-tracking", icon: FileCheck, roles: OPERATIONAL },
      { label: "Assignment Kursi", labelKey: "menu.seat_assignment", href: "/admin/seat-assignment", icon: ClipboardList, roles: OPERATIONAL },
      { label: "Checklist Keberangkatan", labelKey: "menu.departure_checklist", href: "/admin/departure-checklist", icon: ClipboardList, roles: ALL_STAFF },
    ],
  },
  {
    label: "Keuangan",
    labelKey: "menu.group.finance",
    icon: Wallet,
    items: [
      // ── Ringkasan ──────────────────────────────────────────────────────────
      { label: "Dashboard Keuangan",       labelKey: "menu.finance_dashboard",   href: "/admin/finance-dashboard",  icon: LayoutDashboard, roles: FINANCE, featureId: "reports" },
      { label: "Keuangan Keberangkatan",   labelKey: "menu.departure_finance",   href: "/admin/departure-finance",  icon: BarChart3, roles: FINANCE, featureId: "reports" },
      // ── Penerimaan ─────────────────────────────────────────────────────────
      { label: "Pembayaran Jemaah",        labelKey: "menu.payments",             href: "/admin/payments",           icon: CreditCard, roles: OPERATIONAL, featureId: "payments" },
      { label: "Cicilan",                  labelKey: "menu.installments",         href: "/admin/installments",       icon: Receipt, roles: FINANCE, featureId: "installments" },
      { label: "Tabungan Umroh",           labelKey: "menu.savings",              href: "/admin/savings",            icon: PiggyBank, roles: FINANCE },
      // ── Piutang ────────────────────────────────────────────────────────────
      { label: "Piutang Jemaah",           labelKey: "menu.piutang",              href: "/admin/piutang",            icon: TrendingDown, roles: FINANCE, featureId: "payments" },
      { label: "Refund Jamaah",            labelKey: "menu.refunds",              href: "/admin/refunds",            icon: Receipt, roles: SUPER_ADMIN_ADMIN, featureId: "refunds" },
      // ── Keuangan Paket ─────────────────────────────────────────────────────
      { label: "HPP & Profitabilitas",     labelKey: "menu.cost_profitability",   href: "/admin/package-costs",      icon: Calculator, roles: SUPER_ADMIN_ADMIN, featureId: "reports" },
      // ── Pembukuan ──────────────────────────────────────────────────────────
      { label: "Akuntansi & Keuangan",     labelKey: "menu.accounting",           href: "/admin/accounting",         icon: BarChart3, roles: SUPER_ADMIN_ADMIN, featureId: "reports" },
      // ── F-7/8/10 ──────────────────────────────────────────────────────────────
      { label: "Chart of Accounts",        labelKey: "menu.coa",                  href: "/admin/chart-of-accounts",  icon: BarChart3, roles: SUPER_ADMIN_ADMIN, featureId: "reports" },
      { label: "Buku Besar",               labelKey: "menu.general_ledger",       href: "/admin/general-ledger",     icon: BookOpen, roles: FINANCE, featureId: "reports" },
      { label: "Neraca Saldo",             labelKey: "menu.trial_balance",        href: "/admin/trial-balance",      icon: Scale, roles: FINANCE, featureId: "reports" },
      { label: "Laporan Keuangan",         labelKey: "menu.financial_reports",    href: "/admin/financial-reports",  icon: FileText, roles: FINANCE, featureId: "reports" },
      { label: "Rekonsiliasi Bank",        labelKey: "menu.bank_reconciliation",  href: "/admin/bank-reconciliation", icon: CreditCard, roles: FINANCE, featureId: "reports" },
      // ── Existing ──────────────────────────────────────────────────────────────
      { label: "Dashboard Analitik",       labelKey: "menu.analytics_dashboard",  href: "/admin/analytics",          icon: LineChart, roles: FINANCE, featureId: "reports" },
      { label: "Laporan",                  labelKey: "menu.reports",              href: "/admin/reports",            icon: FileText, roles: FINANCE, featureId: "reports" },
      // ── Konfigurasi Keuangan ───────────────────────────────────────────────
      { label: "Pencairan Komisi Agen",    labelKey: "menu.agent_withdrawals",    href: "/admin/agent-withdrawals",  icon: Wallet, roles: SUPER_ADMIN_ADMIN, featureId: "agents" },
      { label: "Payment Gateway",          labelKey: "menu.payment_gateway",      href: "/admin/payment-gateway",    icon: Wallet, roles: SUPER_ADMIN_ADMIN, featureId: "payments" },
      { label: "Kontrak Jamaah",           labelKey: "menu.contracts",            href: "/admin/contracts",          icon: FileCheck, roles: ALL_STAFF, featureId: "contracts" },
      { label: "Histori Akses Bukti",      labelKey: "menu.proof_access_logs",    href: "/admin/proof-access-logs",  icon: ShieldCheck, roles: SUPER_ADMIN_ADMIN, featureId: "payments" },
    ],
  },
  {
    label: "Komunikasi",
    labelKey: "menu.group.communication",
    icon: MessageCircle,
    items: [
      { label: "Chat Jamaah", labelKey: "menu.pilgrim_chat", href: "/admin/chats", icon: MessageCircle, roles: ALL_STAFF, featureId: "chats" },
    ],
  },
  {
    label: "Pemasaran",
    labelKey: "menu.group.marketing",
    icon: Megaphone,
    items: [
      { label: "CRM & Pipeline", labelKey: "menu.crm", href: "/admin/crm", icon: MessageCircle, roles: SUPER_ADMIN_ADMIN, featureId: "crm" },
      { label: "Social Media Kit", labelKey: "menu.social_kit", href: "/admin/social-kit", icon: Megaphone, roles: SUPER_ADMIN_ADMIN, featureId: "social_kit" },
      { label: "Kupon", labelKey: "menu.coupons", href: "/admin/coupons", icon: Ticket, roles: SUPER_ADMIN_ADMIN, featureId: "coupons" },
      { label: "Leaderboard Agen", labelKey: "menu.agent_leaderboard", href: "/admin/leaderboard", icon: Trophy, roles: [...SUPER_ADMIN_ADMIN, "branch_manager", "agent"], featureId: "agents" },
      { label: "Ulasan Paket", labelKey: "menu.reviews", href: "/admin/reviews", icon: Star, roles: SUPER_ADMIN_ADMIN, featureId: "testimonials" },
      { label: "Poin Loyalitas", labelKey: "menu.loyalty", href: "/admin/loyalty", icon: Coins, roles: SUPER_ADMIN_ADMIN, featureId: "loyalty" },
      // "Analitik AI" disembunyikan sementara — halaman ini memanggil Supabase Edge Function
      // yang belum ada di project ini (lihat docs/BUG_TRACKER.md B10). Aktifkan kembali
      // setelah backend AI-nya dibangun.
    ],
  },
  {
    label: "Master Data",
    labelKey: "menu.group.master_data",
    icon: Database,
    items: [
      { label: "Kategori Paket", labelKey: "menu.package_categories", href: "/admin/package-categories", icon: Tag, roles: SUPER_ADMIN_ADMIN },
      { label: "Hotel", labelKey: "menu.hotels", href: "/admin/hotels", icon: Hotel, roles: SUPER_ADMIN_ADMIN },
      { label: "Maskapai", labelKey: "menu.airlines", href: "/admin/airlines", icon: Plane, roles: SUPER_ADMIN_ADMIN },
      { label: "Bandara", labelKey: "menu.airports", href: "/admin/airports", icon: MapPin, roles: SUPER_ADMIN_ADMIN },
      { label: "Cabang", labelKey: "menu.branches", href: "/admin/branches", icon: Building2, roles: [...SUPER_ADMIN_ADMIN, "branch_manager"], featureId: "multi_branch" },
      { label: "Agen", labelKey: "menu.agents", href: "/admin/agents", icon: Briefcase, roles: SUPER_ADMIN_ADMIN, featureId: "agents" },
      { label: "Muthawif", labelKey: "menu.muthawifs", href: "/admin/muthawifs", icon: User, roles: SUPER_ADMIN_ADMIN },
      { label: "Perlengkapan", labelKey: "menu.equipment", href: "/admin/equipment", icon: Backpack, roles: SUPER_ADMIN_ADMIN },
    ],
  },
  {
    label: "Konten & CMS",
    labelKey: "menu.group.content_cms",
    icon: Image,
    items: [
      { label: "Blog", labelKey: "menu.blog", href: "/admin/blog", icon: BookOpen, roles: SUPER_ADMIN_ADMIN, featureId: "blog" },
      { label: "Galeri", labelKey: "menu.gallery", href: "/admin/gallery", icon: Image, roles: SUPER_ADMIN_ADMIN, featureId: "gallery" },
      { label: "Testimoni", labelKey: "menu.testimonials", href: "/admin/testimonials", icon: MessageCircle, roles: SUPER_ADMIN_ADMIN, featureId: "testimonials" },
      { label: "FAQ", labelKey: "menu.faq", href: "/admin/faq", icon: HelpCircle, roles: SUPER_ADMIN_ADMIN },
      { label: "Halaman CMS", labelKey: "menu.cms_pages", href: "/admin/pages", icon: FileText, roles: SUPER_ADMIN_ADMIN },
      { label: "Keunggulan", labelKey: "menu.advantages", href: "/admin/advantages", icon: Star, roles: SUPER_ADMIN_ADMIN },
      { label: "Langkah Panduan", labelKey: "menu.guide_steps", href: "/admin/guide-steps", icon: Footprints, roles: SUPER_ADMIN_ADMIN },
      { label: "Layanan", labelKey: "menu.services", href: "/admin/services", icon: Briefcase, roles: SUPER_ADMIN_ADMIN },
    ],
  },
  {
    label: "Pengaturan",
    labelKey: "menu.group.settings",
    icon: SlidersHorizontal,
    items: [
      { label: "Navigasi", labelKey: "menu.navigation", href: "/admin/navigation", icon: Menu, roles: SUPER_ADMIN_ADMIN },
      { label: "Floating Button", labelKey: "menu.floating_buttons", href: "/admin/floating-buttons", icon: MessageCircle, roles: SUPER_ADMIN_ADMIN },
      { label: "Manajemen User", labelKey: "menu.user_management", href: "/admin/users", icon: Users, roles: SUPER_ADMIN_ADMIN },
      { label: "Multi-Bahasa", labelKey: "menu.multi_language", href: "/admin/multi-language", icon: Languages, roles: SUPER_ADMIN_ADMIN },
      { label: "Multi-Cabang", labelKey: "menu.multi_branch", href: "/admin/multi-branch", icon: GitBranch, roles: SUPER_ADMIN_ADMIN, featureId: "multi_branch" },
      { label: "Tenant Sites", labelKey: "menu.tenant_sites", href: "/admin/tenant-sites", icon: Globe, roles: SUPER_ADMIN_ADMIN, featureId: "multi_branch" },
      { label: "Upgrade Template", labelKey: "menu.template_upgrades", href: "/admin/template-upgrades", icon: ArrowUpCircle, roles: SUPER_ADMIN_ADMIN },
      { label: "Kesehatan Sistem", labelKey: "menu.system_health", href: "/admin/system-health", icon: Activity, roles: SUPER_ADMIN_ADMIN },
      { label: "Audit Logs", labelKey: "menu.audit_logs", href: "/admin/audit-logs", icon: ShieldAlert, roles: SUPER_ADMIN_ADMIN },
      { label: "Error Tracking", labelKey: "menu.error_tracking", href: "/admin/error-logs", icon: ShieldAlert, roles: SUPER_ADMIN_ADMIN },
      { label: "Live REST Diagnostics", labelKey: "menu.rest_diag", href: "/admin/rest-diag", icon: ShieldAlert, roles: SUPER_ADMIN_ADMIN },
      { label: "Slug Redirects (SEO)", labelKey: "menu.slug_redirects", href: "/admin/slug-redirects", icon: ShieldAlert, roles: SUPER_ADMIN_ADMIN },
      { label: "Pengaturan SEO", labelKey: "menu.seo_settings", href: "/admin/seo", icon: Search, roles: SUPER_ADMIN_ADMIN },
      { label: "Manajemen Role", labelKey: "menu.role_management", href: "/admin/role-management", icon: ShieldCheck, roles: SUPER_ONLY },
      { label: "Izin Menu per Role", labelKey: "menu.menu_permissions", href: "/admin/menu-permissions", icon: Layers, roles: OPERATIONAL },
      { label: "Manajemen Fitur", labelKey: "menu.feature_management", href: "/admin/feature-management", icon: ToggleRight, roles: SUPER_ONLY },
      { label: "Mata Uang", labelKey: "menu.currencies", href: "/admin/currencies", icon: Coins, roles: SUPER_ADMIN_ADMIN },
      { label: "Integrasi & API Keys", labelKey: "menu.integrations", href: "/admin/integrations", icon: KeyRound, roles: SUPER_ONLY },
      { label: "Pengaturan Login (2FA)", labelKey: "menu.login_settings", href: "/admin/login-settings", icon: Lock, roles: SUPER_ADMIN_ADMIN },
      { label: "Pengaturan Umum", labelKey: "menu.general_settings", href: "/admin/settings", icon: Settings, roles: SUPER_ADMIN_ADMIN },
    ],
  },
];

// Flatten for backward compatibility
export const menuItems: MenuItem[] = menuGroups.flatMap(g => g.items);
