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
  LucideIcon
} from "lucide-react";

export interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: string[];
}

export interface MenuGroup {
  label: string;
  items: MenuItem[];
}

export interface PremiumMenuItem {
  label: string;
  feature: string;
  href: string;
}

export const menuGroups: MenuGroup[] = [
  {
    label: "Utama",
    items: [
      { label: "Website Utama", href: "/", icon: Globe },
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "Operasional",
    items: [
      { label: "Paket", href: "/admin/packages", icon: Package },
      { label: "Keberangkatan", href: "/admin/departures", icon: Calendar },
      { label: "Itinerary", href: "/admin/itineraries", icon: MapPin },
      { label: "Booking", href: "/admin/bookings", icon: Ticket },
      { label: "Pembayaran", href: "/admin/payments", icon: CreditCard },
      { label: "Jemaah", href: "/admin/pilgrims", icon: Users },
      { label: "Laporan", href: "/admin/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Mitra & Referensi",
    items: [
      { label: "Cabang", href: "/admin/branches", icon: Building2 },
      { label: "Agen", href: "/admin/agents", icon: Briefcase },
      { label: "Muthawif", href: "/admin/muthawifs", icon: User },
      { label: "Hotel", href: "/admin/hotels", icon: Hotel },
      { label: "Maskapai", href: "/admin/airlines", icon: Plane },
      { label: "Bandara", href: "/admin/airports", icon: MapPin },
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
      { label: "Navigasi", href: "/admin/navigation", icon: Menu },
      { label: "Floating Button", href: "/admin/floating-buttons", icon: MessageCircle },
      { label: "Keunggulan", href: "/admin/advantages", icon: Star },
      { label: "Langkah Panduan", href: "/admin/guide-steps", icon: Footprints },
      { label: "Layanan", href: "/admin/services", icon: Briefcase },
    ],
  },
  {
    label: "Sistem",
    items: [
      { label: "Kupon", href: "/admin/coupons", icon: Ticket },
      { label: "Manajemen User", href: "/admin/users", icon: Users },
      { label: "Pengaturan", href: "/admin/settings", icon: Settings },
    ],
  },
];

// Flatten for backward compatibility
export const menuItems: MenuItem[] = menuGroups.flatMap(g => g.items);

export const premiumMenuItems: PremiumMenuItem[] = [
  { label: "Akuntansi & Keuangan", feature: "Akuntansi & Keuangan", href: "/admin/accounting" },
  { label: "CRM & Follow-up", feature: "CRM & Follow-up Otomatis", href: "/admin/crm" },
  { label: "Payment Gateway", feature: "Integrasi Payment Gateway", href: "/admin/payment-gateway" },
  { label: "Dokumen Jemaah", feature: "Manajemen Dokumen Jemaah", href: "/admin/documents" },
  { label: "Analitik AI", feature: "Analitik AI", href: "/admin/analytics-ai" },
  { label: "Multi-Bahasa", feature: "Multi-Bahasa", href: "/admin/multi-language" },
  { label: "Multi-Cabang Dashboard", feature: "Multi-Cabang Dashboard", href: "/admin/multi-branch" },
];

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
