import { Link, useLocation } from "react-router-dom";
import { LogOut, Lock } from "lucide-react";
import AdminBranding from "./AdminBranding";
import { 
  menuItems, 
  premiumMenuItems, 
  BrandingSettings 
} from "./adminMenuConfig";

interface AdminSidebarProps {
  branding: BrandingSettings;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  onPremiumClick: (feature: string) => void;
}

const AdminSidebar = ({ 
  branding, 
  isOpen, 
  onClose, 
  onLogout, 
  onPremiumClick 
}: AdminSidebarProps) => {
  const location = useLocation();
  const showLogo = branding.display_mode === "logo_only" || branding.display_mode === "both";
  const showText = branding.display_mode === "text_only" || branding.display_mode === "both";

  return (
    <>
      <aside
        className={`fixed top-0 left-0 z-40 w-64 h-screen bg-primary transition-transform lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
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
                <span className="font-display text-xl font-bold text-primary-foreground">
                  {branding.company_name}
                </span>
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
                      onClick={onClose}
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
                <span className="px-4 text-[10px] uppercase tracking-wider text-gold-light font-semibold">
                  Premium
                </span>
              </li>
              {premiumMenuItems.map((item) => (
                <li key={item.feature}>
                  <button
                    onClick={() => {
                      onClose();
                      onPremiumClick(item.feature);
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
              onClick={onLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-sm font-medium text-primary-foreground/70 hover:bg-emerald-light/20 hover:text-destructive transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
};

export default AdminSidebar;
