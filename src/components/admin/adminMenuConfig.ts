import { 
  LayoutDashboard, 
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
  LucideIcon
} from "lucide-react";

export interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
  premium?: boolean;
  premiumFeature?: string;
}

export interface MenuGroup {
  label: string;
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
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Website Utama", href: "/", icon: Globe },
    ],
  },
  {
    label: "Operasional",
    items: [
      { label: "Paket Umroh", href: "/admin/packages", icon: Package },
      { label: "Keberangkatan", href: "/admin/departures", icon: Calendar },
      { label: "Itinerary", href: "/admin/itineraries", icon: MapPin },
      { label: "Booking", href: "/admin/bookings", icon: Ticket },
      { label: "Jemaah", href: "/admin/pilgrims", icon: Users },
      { label: "Dokumen Jemaah", href: "/admin/documents", icon: FileCheck, premium: true, premiumFeature: "Manajemen Dokumen Jemaah" },
    ],
  },
  {
    label: "Keuangan",
    items: [
      { label: "Pembayaran", href: "/admin/payments", icon: CreditCard },
      { label: "Akuntansi & Keuangan", href: "/admin/accounting", icon: BarChart3, premium: true, premiumFeature: "Akuntansi & Keuangan" },
      { label: "Payment Gateway", href: "/admin/payment-gateway", icon: Wallet, premium: true, premiumFeature: "Integrasi Payment Gateway" },
      { label: "Laporan", href: "/admin/reports", icon: FileText },
    ],
  },
  {
    label: "Pemasaran",
    items: [
      { label: "CRM & Follow-up", href: "/admin/crm", icon: MessageCircle, premium: true, premiumFeature: "CRM & Follow-up Otomatis" },
      { label: "Kupon", href: "/admin/coupons", icon: Ticket },
      { label: "Analitik AI", href: "/admin/analytics-ai", icon: BrainCircuit, premium: true, premiumFeature: "Analitik AI" },
    ],
  },
  {
    label: "Master Data",
    items: [
      { label: "Hotel", href: "/admin/hotels", icon: Hotel },
      { label: "Maskapai", href: "/admin/airlines", icon: Plane },
      { label: "Bandara", href: "/admin/airports", icon: MapPin },
      { label: "Cabang", href: "/admin/branches", icon: Building2 },
      { label: "Agen", href: "/admin/agents", icon: Briefcase },
      { label: "Muthawif", href: "/admin/muthawifs", icon: User },
    ],
  },
  {
    label: "Konten & CMS",
    items: [
      { label: "Blog", href: "/admin/blog", icon: BookOpen },
      { label: "Galeri", href: "/admin/gallery", icon: Image },
      { label: "Testimoni", href: "/admin/testimonials", icon: MessageCircle },
      { label: "FAQ", href: "/admin/faq", icon: HelpCircle },
      { label: "Halaman CMS", href: "/admin/pages", icon: FileText },
      { label: "Keunggulan", href: "/admin/advantages", icon: Star },
      { label: "Langkah Panduan", href: "/admin/guide-steps", icon: Footprints },
      { label: "Layanan", href: "/admin/services", icon: Briefcase },
    ],
  },
  {
    label: "Pengaturan",
    items: [
      { label: "Navigasi", href: "/admin/navigation", icon: Menu },
      { label: "Floating Button", href: "/admin/floating-buttons", icon: MessageCircle },
      { label: "Manajemen User", href: "/admin/users", icon: Users },
      { label: "Multi-Bahasa", href: "/admin/multi-language", icon: Languages, premium: true, premiumFeature: "Multi-Bahasa" },
      { label: "Multi-Cabang", href: "/admin/multi-branch", icon: GitBranch, premium: true, premiumFeature: "Multi-Cabang Dashboard" },
      { label: "Pengaturan Umum", href: "/admin/settings", icon: Settings },
    ],
  },
];

// Flatten for backward compatibility
export const menuItems: MenuItem[] = menuGroups.flatMap(g => g.items);
