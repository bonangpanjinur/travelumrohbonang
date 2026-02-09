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
  LucideIcon
} from "lucide-react";

export interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface PremiumMenuItem {
  label: string;
  feature: string;
}

export const menuItems: MenuItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Paket", href: "/admin/packages", icon: Package },
  { label: "Keberangkatan", href: "/admin/departures", icon: Calendar },
  { label: "Itinerary", href: "/admin/itineraries", icon: MapPin },
  { label: "Booking", href: "/admin/bookings", icon: Ticket },
  { label: "Pembayaran", href: "/admin/payments", icon: Ticket },
  { label: "Laporan", href: "/admin/reports", icon: FileText },
  { label: "Jemaah", href: "/admin/pilgrims", icon: Users },
  { label: "Muthawif", href: "/admin/muthawifs", icon: User },
  { label: "Cabang", href: "/admin/branches", icon: Building2 },
  { label: "Agen", href: "/admin/agents", icon: User },
  { label: "Hotel", href: "/admin/hotels", icon: Hotel },
  { label: "Maskapai", href: "/admin/airlines", icon: Plane },
  { label: "Bandara", href: "/admin/airports", icon: MapPin },
  { label: "Galeri", href: "/admin/gallery", icon: Image },
  { label: "Testimoni", href: "/admin/testimonials", icon: FileText },
  { label: "FAQ", href: "/admin/faq", icon: HelpCircle },
  { label: "Floating Button", href: "/admin/floating-buttons", icon: MessageCircle },
  { label: "Blog", href: "/admin/blog", icon: BookOpen },
  { label: "Halaman CMS", href: "/admin/pages", icon: FileText },
  { label: "Navigasi & Kategori", href: "/admin/navigation", icon: Menu },
  { label: "Pengaturan", href: "/admin/settings", icon: Settings },
];

export const premiumMenuItems: PremiumMenuItem[] = [
  { label: "Akuntansi & Keuangan", feature: "Akuntansi & Keuangan" },
  { label: "CRM & Follow-up", feature: "CRM & Follow-up Otomatis" },
  { label: "Payment Gateway", feature: "Integrasi Payment Gateway" },
  { label: "Dokumen Jemaah", feature: "Manajemen Dokumen Jemaah" },
  { label: "Analitik AI", feature: "Analitik AI" },
  { label: "Multi-Bahasa", feature: "Multi-Bahasa" },
  { label: "Multi-Cabang Dashboard", feature: "Multi-Cabang Dashboard" },
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
