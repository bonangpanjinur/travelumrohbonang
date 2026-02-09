import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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
  LogOut,
  Menu,
  Image,
  HelpCircle,
  MessageCircle,
  BookOpen,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import UpgradeDialog from "@/components/admin/UpgradeDialog";

interface BrandingSettings {
  logo_url: string;
  company_name: string;
  tagline: string;
  favicon_url: string;
  display_mode: "logo_only" | "text_only" | "both";
}

const defaultBranding: BrandingSettings = {
  logo_url: "",
  company_name: "UmrohPlus",
  tagline: "Travel & Tours",
  favicon_url: "",
  display_mode: "both",
};

const menuItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Paket", href: "/admin/packages", icon: Package },
  { label: "Keberangkatan", href: "/admin/departures", icon: Calendar },
  { label: "Itinerary", href: "/admin/itineraries", icon: MapPin },
  { label: "Booking", href: "/admin/bookings", icon: Ticket },
  { label: "Pembayaran", href: "/admin/payments", icon: Ticket },
  { label: "Laporan", href: "/admin/reports", icon: FileText },
  { label: "Jemaah", href: "/admin/pilgrims", icon: Users },
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

const premiumMenuItems = [
  { label: "Akuntansi & Keuangan", feature: "Akuntansi & Keuangan" },
  { label: "CRM & Follow-up", feature: "CRM & Follow-up Otomatis" },
  { label: "Payment Gateway", feature: "Integrasi Payment Gateway" },
  { label: "Dokumen Jemaah", feature: "Manajemen Dokumen Jemaah" },
  { label: "Analitik AI", feature: "Analitik AI" },
  { label: "Multi-Bahasa", feature: "Multi-Bahasa" },
  { label: "Multi-Cabang Dashboard", feature: "Multi-Cabang Dashboard" },
];

const AdminLayout = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [upgradeDialog, setUpgradeDialog] = useState({ open: false, feature: "" });

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/auth");
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    const fetchBranding = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "branding")
        .eq("category", "general")
        .single();

      if (data?.value && typeof data.value === 'object') {
        setBranding({ ...defaultBranding, ...(data.value as object) });
      }
    };
    fetchBranding();
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const showLogo = branding.display_mode === "logo_only" || branding.display_mode === "both";
  const showText = branding.display_mode === "text_only" || branding.display_mode === "both";

  const renderBrand = (isMobile = false) => {
    const logoSize = isMobile ? "w-8 h-8" : "w-10 h-10";
    const textSize = isMobile ? "text-lg" : "text-xl";

    return (
      <Link to="/" className="flex items-center gap-2">
        {showLogo && (
          branding.logo_url ? (
            <img 
              src={branding.logo_url} 
              alt={branding.company_name} 
              className={`${isMobile ? "h-8" : "h-10"} w-auto object-contain`}
            />
          ) : (
            <div className={`${logoSize} rounded-full gradient-gold flex items-center justify-center`}>
              <span className={`font-display font-bold ${isMobile ? "text-sm" : "text-lg"} text-primary`}>
                {branding.company_name.charAt(0)}
              </span>
            </div>
          )
        )}
        {showText && (
          <div>
            <span className={`font-display ${textSize} font-bold text-primary-foreground`}>
              {isMobile ? "Admin" : branding.company_name}
            </span>
            <span className="block text-[10px] text-gold-light tracking-widest uppercase -mt-1">
              {isMobile ? "" : "Dashboard"}
            </span>
          </div>
        )}
        {!showText && isMobile && (
          <span className="font-display text-lg font-bold text-primary-foreground">Admin</span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-muted">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-primary h-16 flex items-center justify-between px-4">
        {renderBrand(true)}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-primary-foreground">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 w-64 h-screen bg-primary transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-4 border-b border-emerald-light/20 hidden lg:flex items-center gap-2">
            {showLogo && (
              branding.logo_url ? (
                <img 
                  src={branding.logo_url} 
                  alt={branding.company_name} 
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center">
                  <span className="font-display font-bold text-lg text-primary">
                    {branding.company_name.charAt(0)}
                  </span>
                </div>
              )
            )}
            {showText && (
              <div>
                <span className="font-display text-xl font-bold text-primary-foreground">{branding.company_name}</span>
                <span className="block text-[10px] text-gold-light tracking-widest uppercase -mt-1">
                  Dashboard
                </span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 pt-20 lg:pt-4">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-emerald-light/30 text-gold"
                          : "text-primary-foreground/70 hover:bg-emerald-light/20 hover:text-gold"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              {/* Premium Menu */}
              <li className="pt-4 mt-4 border-t border-emerald-light/20">
                <span className="px-4 text-[10px] uppercase tracking-wider text-gold-light font-semibold">Premium</span>
              </li>
              {premiumMenuItems.map((item) => (
                <li key={item.feature}>
                  <button
                    onClick={() => {
                      setSidebarOpen(false);
                      setUpgradeDialog({ open: true, feature: item.feature });
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-primary-foreground/40 hover:bg-emerald-light/10 hover:text-primary-foreground/60 transition-colors w-full"
                  >
                    <Lock className="w-4 h-4" />
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-emerald-light/20">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-primary-foreground/70 hover:bg-emerald-light/20 hover:text-destructive transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
      <UpgradeDialog
        open={upgradeDialog.open}
        onOpenChange={(open) => setUpgradeDialog({ ...upgradeDialog, open })}
        featureName={upgradeDialog.feature}
      />
    </div>
  );
};

export default AdminLayout;
