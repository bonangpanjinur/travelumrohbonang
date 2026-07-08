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
  BrainCircuit,
  Languages,
  GitBranch,
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
}

export interface MenuGroup {
  label: string;
  labelKey: string;
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
    items: [
      { label: "Dashboard", labelKey: "menu.dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Notifikasi", labelKey: "menu.notifications", href: "/admin/notifications", icon: BellRing },
      { label: "Website Utama", labelKey: "menu.main_website", href: "/", icon: Globe },
    ],
  },
  {
    label: "Operasional",
    labelKey: "menu.group.operations",
    items: [
      { label: "Paket Umroh", labelKey: "menu.packages", href: "/admin/packages", icon: Package, roles: OPERATIONAL },
      { label: "Keberangkatan", labelKey: "menu.departures", href: "/admin/departures", icon: Calendar, roles: ALL_STAFF },
      { label: "Itinerary", labelKey: "menu.itineraries", href: "/admin/itineraries", icon: MapPin, roles: ALL_STAFF },
      { label: "Booking", labelKey: "menu.bookings", href: "/admin/bookings", icon: Ticket, roles: OPERATIONAL },
      { label: "Jemaah", labelKey: "menu.pilgrims", href: "/admin/pilgrims", icon: Users, roles: ALL_STAFF },
      { label: "Manifest", labelKey: "menu.manifest", href: "/admin/manifest", icon: ClipboardList, roles: ALL_STAFF },
      { label: "Check-In QR", labelKey: "menu.checkin_qr", href: "/admin/check-in", icon: ShieldCheck, roles: ALL_STAFF },
      { label: "Manasik Kit", labelKey: "menu.manasik_kit", href: "/admin/manasik", icon: BookOpen, roles: ALL_STAFF },
      { label: "Dokumen Jemaah", labelKey: "menu.pilgrim_documents", href: "/admin/documents", icon: FileCheck, roles: ALL_STAFF },
    ],
  },
  {
    label: "Keuangan",
    labelKey: "menu.group.finance",
    items: [
      { label: "Pembayaran", labelKey: "menu.payments", href: "/admin/payments", icon: CreditCard, roles: FINANCE },
      { label: "Cicilan", labelKey: "menu.installments", href: "/admin/installments", icon: Receipt, roles: FINANCE },
      { label: "HPP & Profitabilitas", labelKey: "menu.cost_profitability", href: "/admin/package-costs", icon: Calculator, roles: SUPER_ADMIN_ADMIN },
      { label: "Akuntansi & Keuangan", labelKey: "menu.accounting", href: "/admin/accounting", icon: BarChart3, roles: SUPER_ADMIN_ADMIN },
      { label: "Payment Gateway", labelKey: "menu.payment_gateway", href: "/admin/payment-gateway", icon: Wallet, roles: SUPER_ADMIN_ADMIN },
      { label: "Dashboard Analitik", labelKey: "menu.analytics_dashboard", href: "/admin/analytics", icon: LineChart, roles: FINANCE },
      { label: "Laporan", labelKey: "menu.reports", href: "/admin/reports", icon: FileText, roles: FINANCE },
      { label: "Histori Akses Bukti", labelKey: "menu.proof_access_logs", href: "/admin/proof-access-logs", icon: ShieldCheck, roles: SUPER_ADMIN_ADMIN },
      { label: "Pencairan Komisi Agen", labelKey: "menu.agent_withdrawals", href: "/admin/agent-withdrawals", icon: Wallet, roles: SUPER_ADMIN_ADMIN },
      { label: "Refund Jamaah", labelKey: "menu.refunds", href: "/admin/refunds", icon: Receipt, roles: FINANCE },
    ],
  },
  {
    label: "Komunikasi",
    labelKey: "menu.group.communication",
    items: [
      { label: "Chat Jamaah", labelKey: "menu.pilgrim_chat", href: "/admin/chats", icon: MessageCircle, roles: ALL_STAFF },
    ],
  },
  {
    label: "Pemasaran",
    labelKey: "menu.group.marketing",
    items: [
      { label: "CRM & Follow-up", labelKey: "menu.crm", href: "/admin/crm", icon: MessageCircle, roles: SUPER_ADMIN_ADMIN },
      { label: "Kupon", labelKey: "menu.coupons", href: "/admin/coupons", icon: Ticket, roles: SUPER_ADMIN_ADMIN },
      { label: "Leaderboard Agen", labelKey: "menu.agent_leaderboard", href: "/admin/leaderboard", icon: Trophy, roles: [...SUPER_ADMIN_ADMIN, "branch_manager", "agent"] },
      { label: "Ulasan Paket", labelKey: "menu.reviews", href: "/admin/reviews", icon: Star, roles: SUPER_ADMIN_ADMIN },
      { label: "Poin Loyalitas", labelKey: "menu.loyalty", href: "/admin/loyalty", icon: Coins, roles: SUPER_ADMIN_ADMIN },
      { label: "Analitik AI", labelKey: "menu.ai_analytics", href: "/admin/analytics-ai", icon: BrainCircuit, roles: SUPER_ADMIN_ADMIN },
    ],
  },
  {
    label: "Master Data",
    labelKey: "menu.group.master_data",
    items: [
      { label: "Kategori Paket", labelKey: "menu.package_categories", href: "/admin/package-categories", icon: Tag, roles: SUPER_ADMIN_ADMIN },
      { label: "Hotel", labelKey: "menu.hotels", href: "/admin/hotels", icon: Hotel, roles: SUPER_ADMIN_ADMIN },
      { label: "Maskapai", labelKey: "menu.airlines", href: "/admin/airlines", icon: Plane, roles: SUPER_ADMIN_ADMIN },
      { label: "Bandara", labelKey: "menu.airports", href: "/admin/airports", icon: MapPin, roles: SUPER_ADMIN_ADMIN },
      { label: "Cabang", labelKey: "menu.branches", href: "/admin/branches", icon: Building2, roles: [...SUPER_ADMIN_ADMIN, "branch_manager"] },
      { label: "Agen", labelKey: "menu.agents", href: "/admin/agents", icon: Briefcase, roles: [...SUPER_ADMIN_ADMIN, "branch_manager"] },
      { label: "Muthawif", labelKey: "menu.muthawifs", href: "/admin/muthawifs", icon: User, roles: SUPER_ADMIN_ADMIN },
    ],
  },
  {
    label: "Konten & CMS",
    labelKey: "menu.group.content_cms",
    items: [
      { label: "Blog", labelKey: "menu.blog", href: "/admin/blog", icon: BookOpen, roles: SUPER_ADMIN_ADMIN },
      { label: "Galeri", labelKey: "menu.gallery", href: "/admin/gallery", icon: Image, roles: SUPER_ADMIN_ADMIN },
      { label: "Testimoni", labelKey: "menu.testimonials", href: "/admin/testimonials", icon: MessageCircle, roles: SUPER_ADMIN_ADMIN },
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
    items: [
      { label: "Navigasi", labelKey: "menu.navigation", href: "/admin/navigation", icon: Menu, roles: SUPER_ADMIN_ADMIN },
      { label: "Floating Button", labelKey: "menu.floating_buttons", href: "/admin/floating-buttons", icon: MessageCircle, roles: SUPER_ADMIN_ADMIN },
      { label: "Manajemen User", labelKey: "menu.user_management", href: "/admin/users", icon: Users, roles: SUPER_ADMIN_ADMIN },
      { label: "Multi-Bahasa", labelKey: "menu.multi_language", href: "/admin/multi-language", icon: Languages, roles: SUPER_ADMIN_ADMIN },
      { label: "Multi-Cabang", labelKey: "menu.multi_branch", href: "/admin/multi-branch", icon: GitBranch, roles: SUPER_ADMIN_ADMIN },
      { label: "Tenant Sites", labelKey: "menu.tenant_sites", href: "/admin/tenant-sites", icon: Globe, roles: SUPER_ADMIN_ADMIN },
      { label: "Upgrade Template", labelKey: "menu.template_upgrades", href: "/admin/template-upgrades", icon: ArrowUpCircle, roles: SUPER_ADMIN_ADMIN },
      { label: "Kesehatan Sistem", labelKey: "menu.system_health", href: "/admin/system-health", icon: Activity, roles: SUPER_ADMIN_ADMIN },
      { label: "Audit Logs", labelKey: "menu.audit_logs", href: "/admin/audit-logs", icon: ShieldAlert, roles: SUPER_ADMIN_ADMIN },
      { label: "Error Tracking", labelKey: "menu.error_tracking", href: "/admin/error-logs", icon: ShieldAlert, roles: SUPER_ADMIN_ADMIN },
      { label: "Slug Redirects (SEO)", labelKey: "menu.slug_redirects", href: "/admin/slug-redirects", icon: ShieldAlert, roles: SUPER_ADMIN_ADMIN },
      { label: "Pengaturan SEO", labelKey: "menu.seo_settings", href: "/admin/seo", icon: Search, roles: SUPER_ADMIN_ADMIN },
      { label: "Manajemen Role", labelKey: "menu.role_management", href: "/admin/role-management", icon: ShieldCheck, roles: SUPER_ONLY },
      { label: "Izin Menu per Role", labelKey: "menu.menu_permissions", href: "/admin/menu-permissions", icon: Layers, roles: SUPER_ONLY },
      { label: "Mata Uang", labelKey: "menu.currencies", href: "/admin/currencies", icon: Coins, roles: SUPER_ADMIN_ADMIN },
      { label: "Integrasi & API Keys", labelKey: "menu.integrations", href: "/admin/integrations", icon: KeyRound, roles: SUPER_ONLY },
      { label: "Pengaturan Login (2FA)", labelKey: "menu.login_settings", href: "/admin/login-settings", icon: Lock, roles: SUPER_ADMIN_ADMIN },
      { label: "Pengaturan Umum", labelKey: "menu.general_settings", href: "/admin/settings", icon: Settings, roles: SUPER_ADMIN_ADMIN },
    ],
  },
];

// Flatten for backward compatibility
export const menuItems: MenuItem[] = menuGroups.flatMap(g => g.items);
