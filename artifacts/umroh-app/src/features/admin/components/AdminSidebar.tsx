import { Link, useLocation } from "react-router-dom";
import { LogOut, ChevronDown, ChevronsLeft, ChevronsRight, Globe } from "lucide-react";
import { useAuth } from "@/shared/hooks/useAuth";
import { useLanguage } from "@/shared/i18n/LanguageContext";
import AdminBranding from "./AdminBranding";
import LanguageSwitcher from "@/shared/components/common/LanguageSwitcher";
import ThemeToggle from "@/shared/components/common/ThemeToggle";
import AdminNotificationBell from "./AdminNotificationBell";
import { useState, useMemo } from "react";
import { menuGroups, type BrandingSettings } from "./adminMenuConfig";
import { useMenuPermissions } from "@/features/admin/hooks/useMenuPermissions";

interface AdminSidebarProps {
  branding: BrandingSettings;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

const AdminSidebar = ({ 
  branding, 
  isOpen, 
  onClose, 
  onLogout, 
  collapsed,
  onToggleCollapsed,
}: AdminSidebarProps) => {
  const { role, user } = useAuth();
  const { t } = useLanguage();
  const rolePermissions = useMenuPermissions();
  const location = useLocation();
  const showLogo = branding.display_mode === "logo_only" || branding.display_mode === "both";
  const showText = branding.display_mode === "text_only" || branding.display_mode === "both";

  // Auto-collapse: only "Utama" and group with active route are open by default
  const initialCollapsed = useMemo(() => {
    const map: Record<string, boolean> = {};
    menuGroups.forEach((group) => {
      const hasActive = group.items.some(item => location.pathname === item.href);
      if (group.labelKey === "menu.group.main" || hasActive) {
        map[group.label] = false;
      } else {
        map[group.label] = true;
      }
    });
    return map;
  }, []); // only on mount

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(initialCollapsed);

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const roleLabel = role ? role.replace(/_/g, " ") : null;
  const userInitial = (user?.email ?? branding.company_name).charAt(0).toUpperCase();

  return (
    <>
      <aside
        className={`fixed top-0 left-0 z-40 h-screen bg-primary shadow-xl shadow-black/20 transition-[transform,width] duration-200 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "w-64 lg:w-16" : "w-64"}`}
      >
        <div className="h-full flex flex-col relative">
          {/* Collapse toggle (desktop only) */}
          <button
            onClick={onToggleCollapsed}
            title={collapsed ? "Buka sidebar" : "Tutup sidebar"}
            className="hidden lg:flex absolute -right-3 top-6 z-10 items-center justify-center w-6 h-6 rounded-full bg-accent text-accent-foreground shadow-md shadow-black/30 hover:brightness-110 transition-all"
          >
            {collapsed ? <ChevronsRight className="w-3.5 h-3.5" /> : <ChevronsLeft className="w-3.5 h-3.5" />}
          </button>

          {/* Logo */}
          <Link
            to="/"
            className={`p-4 border-b border-primary-foreground/10 hidden lg:flex items-center gap-2 hover:bg-primary-foreground/5 transition-colors shrink-0 ${collapsed ? "lg:justify-center" : ""}`}
          >
            {showLogo && (
              branding.logo_url ? (
                <img
                  src={branding.logo_url}
                  alt={branding.company_name}
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shadow-sm shadow-black/30 shrink-0">
                  <span className="font-display font-bold text-lg text-accent-foreground">
                    {branding.company_name.charAt(0)}
                  </span>
                </div>
              )
            )}
            {showText && !collapsed && (
              <div className="hidden lg:block">
                <span className="font-display text-xl font-bold text-primary-foreground">
                  {branding.company_name}
                </span>
                <span className="block text-[10px] text-primary-foreground/50 tracking-widest uppercase -mt-1">
                  Dashboard
                </span>
              </div>
            )}
            {showText && (
              <div className="lg:hidden">
                <span className="font-display text-xl font-bold text-primary-foreground">
                  {branding.company_name}
                </span>
                <span className="block text-[10px] text-primary-foreground/50 tracking-widest uppercase -mt-1">
                  Dashboard
                </span>
              </div>
            )}
          </Link>

          {/* User summary */}
          {user && (
            <div className={`hidden lg:flex items-center gap-3 px-4 py-3 border-b border-primary-foreground/10 shrink-0 ${collapsed ? "lg:justify-center lg:px-2" : ""}`}>
              <div className="w-9 h-9 rounded-full bg-primary-foreground/10 border border-primary-foreground/15 flex items-center justify-center shrink-0">
                <span className="text-sm font-semibold text-primary-foreground/90">{userInitial}</span>
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-primary-foreground/90 truncate">{user.email}</p>
                  {roleLabel && (
                    <span className="inline-flex items-center mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-accent/20 text-accent">
                      {roleLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin-primary p-3 pt-20 lg:pt-3 space-y-0.5">
            {menuGroups.map((group, groupIndex) => {
              const isGroupCollapsed = collapsedGroups[group.label] ?? false;
              const filteredItems = group.items.filter(item => {
                // DB permissions override static config (if a row exists for this role+menuKey)
                if (rolePermissions !== null) {
                  const dbPerm = rolePermissions[item.labelKey];
                  if (dbPerm !== undefined) return dbPerm;
                }
                // Fallback: static roles array from adminMenuConfig
                if (!item.roles) return true;
                return !!role && item.roles.includes(role);
              });
              if (filteredItems.length === 0) return null;

              return (
                <div
                  key={group.label}
                  className={groupIndex > 0 ? "pt-2 mt-2 border-t border-primary-foreground/10" : ""}
                >
                  {!collapsed && (
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className="flex items-center justify-between w-full px-3 py-2 rounded-md text-[10px] uppercase tracking-wider text-primary-foreground/40 font-semibold hover:text-primary-foreground/70 hover:bg-primary-foreground/5 transition-colors"
                    >
                      {t(group.labelKey)}
                      <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isGroupCollapsed ? "-rotate-90" : ""}`} />
                    </button>
                  )}
                  {(collapsed || !isGroupCollapsed) && (
                    <ul className="space-y-0.5 mb-1">
                      {filteredItems.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                          <li key={item.href}>
                            <Link
                              to={item.href}
                              onClick={onClose}
                              title={collapsed ? t(item.labelKey) : undefined}
                              className={`group relative flex items-center gap-3 py-2.5 rounded-lg text-sm transition-all ${
                                collapsed ? "lg:justify-center lg:px-0 pl-4 pr-3" : "pl-4 pr-3"
                              } ${
                                isActive
                                  ? "bg-primary-foreground/15 text-primary-foreground font-semibold"
                                  : "text-primary-foreground/60 font-medium hover:bg-primary-foreground/10 hover:text-primary-foreground/90 hover:translate-x-0.5"
                              }`}
                            >
                              <span
                                className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-accent transition-opacity ${
                                  isActive ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              <span
                                className={`flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-colors ${
                                  isActive
                                    ? "bg-accent/20 text-accent"
                                    : "text-primary-foreground/50 group-hover:text-primary-foreground/80"
                                }`}
                              >
                                <item.icon className="w-4 h-4" />
                              </span>
                              <span className={`flex-1 truncate ${collapsed ? "lg:hidden" : ""}`}>{t(item.labelKey)}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-primary-foreground/10 space-y-2 shrink-0">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              title={collapsed ? "Kunjungi Website" : undefined}
              className={`flex items-center gap-3 py-2.5 w-full rounded-lg text-sm font-medium text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground/90 transition-colors ${
                collapsed ? "lg:justify-center lg:px-0 px-3" : "px-3"
              }`}
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-md shrink-0">
                <Globe className="w-4 h-4" />
              </span>
              <span className={collapsed ? "lg:hidden" : ""}>{t("menu.main_website")}</span>
            </a>
            {!collapsed && (
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] text-primary-foreground/40 uppercase tracking-wider font-semibold">{t("common.language")}</span>
                <div className="flex items-center gap-1">
                  <ThemeToggle variant="admin" />
                  <AdminNotificationBell />
                  <LanguageSwitcher variant="admin" />
                </div>
              </div>
            )}
            {collapsed && (
              <div className="hidden lg:flex flex-col items-center gap-1">
                <ThemeToggle variant="admin" />
                <AdminNotificationBell />
              </div>
            )}
            <button
              onClick={onLogout}
              title={collapsed ? t("nav.logout") : undefined}
              className={`flex items-center gap-3 py-2.5 w-full rounded-lg text-sm font-medium text-primary-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors ${
                collapsed ? "lg:justify-center lg:px-0 px-3" : "px-3"
              }`}
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-md shrink-0">
                <LogOut className="w-4 h-4" />
              </span>
              <span className={collapsed ? "lg:hidden" : ""}>{t("nav.logout")}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden animate-in fade-in duration-150"
          onClick={onClose}
        />
      )}
    </>
  );
};

export default AdminSidebar;
