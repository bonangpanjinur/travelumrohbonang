import { Link, useLocation } from "react-router-dom";
import { LogOut, Lock, ChevronDown, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import AdminBranding from "./AdminBranding";
import { useState } from "react";
import { 
  menuGroups, 
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
  const { role } = useAuth();
  const location = useLocation();
  const showLogo = branding.display_mode === "logo_only" || branding.display_mode === "both";
  const showText = branding.display_mode === "text_only" || branding.display_mode === "both";

  // Track collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      <aside
        className={`fixed top-0 left-0 z-40 w-64 h-screen bg-primary transition-transform lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <Link 
            to="/" 
            className="p-4 border-b border-primary-foreground/10 hidden lg:flex items-center gap-2 hover:bg-primary-foreground/5 transition-colors"
          >
            {showLogo && (
              branding.logo_url ? (
                <img 
                  src={branding.logo_url} 
                  alt={branding.company_name} 
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                  <span className="font-display font-bold text-lg text-accent-foreground">
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
                <span className="block text-[10px] text-primary-foreground/50 tracking-widest uppercase -mt-1">
                  Dashboard
                </span>
              </div>
            )}
          </Link>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 pt-20 lg:pt-3 space-y-1">
            {menuGroups.map((group) => {
              const isCollapsed = collapsedGroups[group.label] ?? false;
              const filteredItems = group.items.filter(item => {
                if (!item.roles) return true;
                return role && item.roles.includes(role.toLowerCase());
              });
              if (filteredItems.length === 0) return null;

              // Check if any item in this group is active
              const hasActiveItem = filteredItems.some(item => location.pathname === item.href);

              return (
                <div key={group.label}>
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="flex items-center justify-between w-full px-3 py-2 text-[10px] uppercase tracking-wider text-primary-foreground/40 font-semibold hover:text-primary-foreground/60 transition-colors"
                  >
                    {group.label}
                    <ChevronDown className={`w-3 h-3 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                  </button>
                  {!isCollapsed && (
                    <ul className="space-y-0.5 mb-2">
                      {filteredItems.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                          <li key={item.href}>
                            <Link
                              to={item.href}
                              onClick={onClose}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                isActive
                                  ? "bg-primary-foreground/15 text-primary-foreground"
                                  : "text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground/90"
                              }`}
                            >
                              <item.icon className="w-4 h-4 shrink-0" />
                              {item.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}

            {/* Premium Menu */}
            <div>
              <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-primary-foreground/40 font-semibold">
                Premium
              </div>
              <ul className="space-y-0.5">
                {premiumMenuItems.map((item) => {
                  const isSuperAdmin = role && ['superadmin', 'super_admin'].includes(role.toLowerCase());
                  
                  if (isSuperAdmin) {
                    const isActive = location.pathname === item.href;
                    return (
                      <li key={item.feature}>
                        <Link
                          to={item.href}
                          onClick={onClose}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-primary-foreground/15 text-primary-foreground"
                              : "text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground/90"
                          }`}
                        >
                          <Star className="w-4 h-4 shrink-0 text-amber-400" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  }
                  
                  return (
                    <li key={item.feature}>
                      <button
                        onClick={() => {
                          onClose();
                          onPremiumClick(item.feature);
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-primary-foreground/30 hover:bg-primary-foreground/5 hover:text-primary-foreground/50 transition-colors w-full"
                      >
                        <Lock className="w-4 h-4 shrink-0" />
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-primary-foreground/10">
            <button
              onClick={onLogout}
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4" />
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
