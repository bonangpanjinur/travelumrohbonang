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
      { label: "Paket Umroh", labelKey: "menu.packages", href: "/admin/packages", icon: Package },
      { label: "Keberangkatan", labelKey: "menu.departures", href: "/admin/departures", icon: Calendar },
      { label: "Itinerary", labelKey: "menu.itineraries", href: "/admin/itineraries", icon: MapPin },
      { label: "Booking", labelKey: "menu.bookings", href: "/admin/bookings", icon: Ticket },
      { label: "Jemaah", labelKey: "menu.pilgrims", href: "/admin/pilgrims", icon: Users },
      { label: "Manifest", labelKey: "menu.manifest", href: "/admin/manifest", icon: ClipboardList },
      { label: "Check-In QR", labelKey: "menu.checkin_qr", href: "/admin/check-in", icon: ShieldCheck },
      { label: "Manasik Kit", labelKey: "menu.manasik_kit", href: "/admin/manasik", icon: BookOpen },
      { label: "Dokumen Jemaah", labelKey: "menu.pilgrim_documents", href: "/admin/documents", icon: FileCheck },
    ],
  },
  {
    label: "Keuangan",
    labelKey: "menu.group.finance",
    items: [
      { label: "Pembayaran", labelKey: "menu.payments", href: "/admin/payments", icon: CreditCard },
      { label: "Cicilan", labelKey: "menu.installments", href: "/admin/installments", icon: Receipt },
      { label: "HPP & Profitabilitas", labelKey: "menu.cost_profitability", href: "/admin/package-costs", icon: Calculator },
      { label: "Akuntansi & Keuangan", labelKey: "menu.accounting", href: "/admin/accounting", icon: BarChart3 },
      { label: "Payment Gateway", labelKey: "menu.payment_gateway", href: "/admin/payment-gateway", icon: Wallet },
      { label: "Dashboard Analitik", labelKey: "menu.analytics_dashboard", href: "/admin/analytics", icon: LineChart },
      { label: "Laporan", labelKey: "menu.reports", href: "/admin/reports", icon: FileText },
      { label: "Histori Akses Bukti", labelKey: "menu.proof_access_logs", href: "/admin/proof-access-logs", icon: ShieldCheck },
      { label: "Pencairan Komisi Agen", labelKey: "menu.agent_withdrawals", href: "/admin/agent-withdrawals", icon: Wallet },
      { label: "Refund Jamaah", labelKey: "menu.refunds", href: "/admin/refunds", icon: Receipt },
    ],
  },
  {
    label: "Komunikasi",
    labelKey: "menu.group.communication",
    items: [
      { label: "Chat Jamaah", labelKey: "menu.pilgrim_chat", href: "/admin/chats", icon: MessageCircle },
    ],
  },
  {
    label: "Pemasaran",
    labelKey: "menu.group.marketing",
    items: [
      { label: "CRM & Follow-up", labelKey: "menu.crm", href: "/admin/crm", icon: MessageCircle },
      { label: "Kupon", labelKey: "menu.coupons", href: "/admin/coupons", icon: Ticket },
      { label: "Leaderboard Agen", labelKey: "menu.agent_leaderboard", href: "/admin/leaderboard", icon: Trophy },
      { label: "Ulasan Paket", labelKey: "menu.reviews", href: "/admin/reviews", icon: Star },
      { label: "Poin Loyalitas", labelKey: "menu.loyalty", href: "/admin/loyalty", icon: Coins },
      { label: "Analitik AI", labelKey: "menu.ai_analytics", href: "/admin/analytics-ai", icon: BrainCircuit },
    ],
  },
  {
    label: "Master Data",
    labelKey: "menu.group.master_data",
    items: [
      { label: "Kategori Paket", labelKey: "menu.package_categories", href: "/admin/package-categories", icon: Tag },
      { label: "Hotel", labelKey: "menu.hotels", href: "/admin/hotels", icon: Hotel },
      { label: "Maskapai", labelKey: "menu.airlines", href: "/admin/airlines", icon: Plane },
      { label: "Bandara", labelKey: "menu.airports", href: "/admin/airports", icon: MapPin },
      { label: "Cabang", labelKey: "menu.branches", href: "/admin/branches", icon: Building2 },
      { label: "Agen", labelKey: "menu.agents", href: "/admin/agents", icon: Briefcase },
      { label: "Muthawif", labelKey: "menu.muthawifs", href: "/admin/muthawifs", icon: User },
    ],
  },
  {
    label: "Konten & CMS",
    labelKey: "menu.group.content_cms",
    items: [
      { label: "Blog", labelKey: "menu.blog", href: "/admin/blog", icon: BookOpen },
      { label: "Galeri", labelKey: "menu.gallery", href: "/admin/gallery", icon: Image },
      { label: "Testimoni", labelKey: "menu.testimonials", href: "/admin/testimonials", icon: MessageCircle },
      { label: "FAQ", labelKey: "menu.faq", href: "/admin/faq", icon: HelpCircle },
      { label: "Halaman CMS", labelKey: "menu.cms_pages", href: "/admin/pages", icon: FileText },
      { label: "Keunggulan", labelKey: "menu.advantages", href: "/admin/advantages", icon: Star },
      { label: "Langkah Panduan", labelKey: "menu.guide_steps", href: "/admin/guide-steps", icon: Footprints },
      { label: "Layanan", labelKey: "menu.services", href: "/admin/services", icon: Briefcase },
    ],
  },
  {
    label: "Pengaturan",
    labelKey: "menu.group.settings",
    items: [
      { label: "Navigasi", labelKey: "menu.navigation", href: "/admin/navigation", icon: Menu },
      { label: "Floating Button", labelKey: "menu.floating_buttons", href: "/admin/floating-buttons", icon: MessageCircle },
      { label: "Manajemen User", labelKey: "menu.user_management", href: "/admin/users", icon: Users },
      { label: "Multi-Bahasa", labelKey: "menu.multi_language", href: "/admin/multi-language", icon: Languages },
      { label: "Multi-Cabang", labelKey: "menu.multi_branch", href: "/admin/multi-branch", icon: GitBranch },
      { label: "Tenant Sites", labelKey: "menu.tenant_sites", href: "/admin/tenant-sites", icon: Globe },
      { label: "Upgrade Template", labelKey: "menu.template_upgrades", href: "/admin/template-upgrades", icon: ArrowUpCircle },
      { label: "Kesehatan Sistem", labelKey: "menu.system_health", href: "/admin/system-health", icon: Activity },
      { label: "Audit Logs", labelKey: "menu.audit_logs", href: "/admin/audit-logs", icon: ShieldAlert },
      { label: "Error Tracking", labelKey: "menu.error_tracking", href: "/admin/error-logs", icon: ShieldAlert },
      { label: "Slug Redirects (SEO)", labelKey: "menu.slug_redirects", href: "/admin/slug-redirects", icon: ShieldAlert },
      { label: "Pengaturan SEO", labelKey: "menu.seo_settings", href: "/admin/seo", icon: Search },
      { label: "Manajemen Role", labelKey: "menu.role_management", href: "/admin/role-management", icon: ShieldCheck },
      { label: "Mata Uang", labelKey: "menu.currencies", href: "/admin/currencies", icon: Coins },
      { label: "Integrasi & API Keys", labelKey: "menu.integrations", href: "/admin/integrations", icon: KeyRound, roles: ["super_admin"] },
      { label: "Pengaturan Login (2FA)", labelKey: "menu.login_settings", href: "/admin/login-settings", icon: Lock },
      { label: "Pengaturan Umum", labelKey: "menu.general_settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

// Flatten for backward compatibility
export const menuItems: MenuItem[] = menuGroups.flatMap(g => g.items);
