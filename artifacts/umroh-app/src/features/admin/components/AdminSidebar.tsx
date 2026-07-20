import { Link, useLocation } from "react-router-dom";
import { LogOut, ChevronsLeft, ChevronsRight, Globe, Search, X, Star, Clock } from "lucide-react";
import { useAuth } from "@/shared/hooks/useAuth";
import { useLanguage } from "@/shared/i18n/LanguageContext";
import LanguageSwitcher from "@/shared/components/common/LanguageSwitcher";
import ThemeToggle from "@/shared/components/common/ThemeToggle";
import AdminNotificationBell from "./AdminNotificationBell";
import { useMemo, useState, useEffect } from "react";
import { menuGroups, type BrandingSettings, type MenuItem } from "./adminMenuConfig";
import { useMenuPermissions } from "@/features/admin/hooks/useMenuPermissions";
import { useFeatureFlags } from "@/features/admin/hooks/useFeatureFlags";
import type { FeatureId } from "@/features/admin/config/featureDefinitions";
import { useAdminNotifications } from "@/features/admin/hooks/useAdminNotifications";
import { useSidebarFavorites } from "@/features/admin/hooks/useSidebarFavorites";
import { useSidebarRecent } from "@/features/admin/hooks/useSidebarRecent";
import AdminSidebarGroup from "./AdminSidebarGroup";
import { AdminThemePicker } from "./AdminThemePicker";

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
  const { isEnabled } = useFeatureFlags();
  const isSuperAdmin = role === "super_admin";
  const location = useLocation();
  const { unreadBookings, unreadPayments } = useAdminNotifications();
  const { favorites, toggleFavorite } = useSidebarFavorites();
  const showLogo = branding.display_mode === "logo_only" || branding.display_mode === "both";
  const showText = branding.display_mode === "text_only" || branding.display_mode === "both";

  const [search, setSearch] = useState("");
  const isSearching = search.trim().length > 0;

  // Permission-aware + feature-flag visibility check.
  // Super admin always sees everything; other roles are also gated by feature flags.
  const isItemVisible = (item: MenuItem) => {
    // Role/DB-permission check
    if (rolePermissions !== null) {
      const dbPerm = rolePermissions[item.labelKey];
      if (dbPerm !== undefined && !dbPerm) return false;
    }
    if (item.roles && !(!!role && item.roles.includes(role))) return false;

    // Feature flag check (super_admin bypasses — they can always see everything)
    if (!isSuperAdmin && item.featureId) {
      return isEnabled(item.featureId as FeatureId);
    }

    return true;
  };

  const labelFor = (item: MenuItem) => t(item.labelKey);

  const allKnownHrefs = useMemo(() => new Set(menuGroups.flatMap((g) => g.items.map((i) => i.href))), []);
  const flatItems = useMemo(() => menuGroups.flatMap((g) => g.items), []);
  const recentHrefs = useSidebarRecent(location.pathname, allKnownHrefs);

  // Returns true if pathname matches an item — exact match always, prefix match only when
  // the item href has ≥2 path segments (prevents "/admin" from prefix-matching "/admin/*").
  const matchesRoute = (itemHref: string, pathname: string) => {
    if (pathname === itemHref) return true;
    const segments = itemHref.split("/").filter(Boolean);
    return segments.length >= 2 && pathname.startsWith(itemHref + "/");
  };

  // Accordion: only one group (real or virtual) is open at a time. Defaults to whichever
  // group holds the active route, falling back to "Utama".
  const initialOpenGroup = useMemo(() => {
    const activeGroup = menuGroups.find((group) =>
      group.items.some((item) => matchesRoute(item.href, location.pathname))
    );
    return activeGroup?.label ?? menuGroups.find((g) => g.labelKey === "menu.group.main")?.label ?? null;
  }, []); // only on mount

  const [openGroup, setOpenGroup] = useState<string | null>(initialOpenGroup);

  const toggleGroup = (label: string) => {
    setOpenGroup((prev) => (prev === label ? null : label));
  };

  // Auto-open (and thus auto-close every other group) whenever navigation lands on a route
  // elsewhere in the group, not just on first mount.
  useEffect(() => {
    const activeGroup = menuGroups.find((group) =>
      group.items.some((item) => matchesRoute(item.href, location.pathname))
    );
    if (activeGroup) {
      setOpenGroup(activeGroup.label);
    }
  }, [location.pathname]);

  const badgeCounts: Record<string, number> = {
    "/admin/bookings": unreadBookings,
    "/admin/payments": unreadPayments,
  };

  const roleLabel = role ? role.replace(/_/g, " ") : null;
  const userInitial = (user?.email ?? branding.company_name).charAt(0).toUpperCase();

  const query = search.trim().toLowerCase();
  const matchesSearch = (item: MenuItem) => labelFor(item).toLowerCase().includes(query);

  const favoriteItems = favorites
    .map((href) => flatItems.find((i) => i.href === href))
    .filter((i): i is MenuItem => !!i && isItemVisible(i));

  const recentItems = recentHrefs
    .map((href) => flatItems.find((i) => i.href === href))
    .filter((i): i is MenuItem => !!i && isItemVisible(i));

  const visibleGroups = menuGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => isItemVisible(item) && (!isSearching || matchesSearch(item))),
  }));
  const hasAnyResults = visibleGroups.some((g) => g.items.length > 0);

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
            {showLogo &&
              (branding.logo_url ? (
                <img src={branding.logo_url} alt={branding.company_name} className="h-10 w-auto object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shadow-sm shadow-black/30 shrink-0">
                  <span className="font-display font-bold text-lg text-accent-foreground">
                    {branding.company_name.charAt(0)}
                  </span>
                </div>
              ))}
            {showText && !collapsed && (
              <div className="hidden lg:block">
                <span className="font-display text-xl font-bold text-primary-foreground">{branding.company_name}</span>
                <span className="block text-[10px] text-primary-foreground/50 tracking-widest uppercase -mt-1">
                  Dashboard
                </span>
              </div>
            )}
            {showText && (
              <div className="lg:hidden">
                <span className="font-display text-xl font-bold text-primary-foreground">{branding.company_name}</span>
                <span className="block text-[10px] text-primary-foreground/50 tracking-widest uppercase -mt-1">
                  Dashboard
                </span>
              </div>
            )}
          </Link>

          {/* User summary */}
          {user && (
            <div
              className={`hidden lg:flex items-center gap-3 px-4 py-3 border-b border-primary-foreground/10 shrink-0 ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
            >
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

          {/* Search */}
          {!collapsed && (
            <div className="px-3 pt-3 shrink-0 hidden lg:block">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary-foreground/40" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("sidebar.search_placeholder")}
                  type="search"
                  name="sidebar-menu-search"
                  autoComplete="new-password"
                  className="w-full pl-8 pr-7 py-2 rounded-lg bg-primary-foreground/10 border border-primary-foreground/10 text-sm text-primary-foreground placeholder:text-primary-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/60 transition-colors"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-primary-foreground/40 hover:text-primary-foreground/80"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto scrollbar-thin-primary p-3 pt-20 lg:pt-3 space-y-0.5">
            {!isSearching && favoriteItems.length > 0 && (
              <AdminSidebarGroup
                title={t("sidebar.favorites")}
                icon={Star}
                items={favoriteItems}
                labelFor={labelFor}
                collapsedSidebar={collapsed}
                isOpen={openGroup === "__favorites"}
                onToggleOpen={() => toggleGroup("__favorites")}
                activePathname={location.pathname}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                favoriteLabel={t("sidebar.pin")}
                unfavoriteLabel={t("sidebar.unpin")}
                badgeCounts={badgeCounts}
                onNavigate={onClose}
                showDivider={false}
              />
            )}

            {!isSearching && recentItems.length > 0 && (
              <AdminSidebarGroup
                title={t("sidebar.recent")}
                icon={Clock}
                items={recentItems}
                labelFor={labelFor}
                collapsedSidebar={collapsed}
                isOpen={openGroup === "__recent"}
                onToggleOpen={() => toggleGroup("__recent")}
                activePathname={location.pathname}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                favoriteLabel={t("sidebar.pin")}
                unfavoriteLabel={t("sidebar.unpin")}
                badgeCounts={badgeCounts}
                onNavigate={onClose}
                showDivider={favoriteItems.length > 0}
              />
            )}

            {isSearching && !hasAnyResults && (
              <p className="px-3 py-6 text-center text-sm text-primary-foreground/40">{t("sidebar.no_results")}</p>
            )}

            {visibleGroups.map((group, groupIndex) => (
              <AdminSidebarGroup
                key={group.label}
                title={t(group.labelKey)}
                icon={group.icon}
                items={group.items}
                labelFor={labelFor}
                collapsedSidebar={collapsed}
                isOpen={isSearching || openGroup === group.label}
                onToggleOpen={isSearching ? undefined : () => toggleGroup(group.label)}
                activePathname={location.pathname}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                favoriteLabel={t("sidebar.pin")}
                unfavoriteLabel={t("sidebar.unpin")}
                badgeCounts={badgeCounts}
                onNavigate={onClose}
                showDivider={groupIndex > 0 || favoriteItems.length > 0 || recentItems.length > 0}
                highlightQuery={isSearching ? query : undefined}
              />
            ))}
          </nav>

          {/* Footer — condensed into a single compact row of icon actions so the nav list above gets more room */}
          <div className={`p-2 border-t border-primary-foreground/10 shrink-0 ${collapsed ? "hidden lg:block" : ""}`}>
            <div className={`flex items-center gap-0.5 ${collapsed ? "lg:flex-col" : "justify-between"}`}>
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                title={t("menu.main_website")}
                className="flex items-center justify-center w-8 h-8 rounded-md text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground/90 transition-colors shrink-0"
              >
                <Globe className="w-4 h-4" />
              </a>
              <ThemeToggle variant="admin" />
              <AdminThemePicker />
              <AdminNotificationBell />
              {!collapsed && <LanguageSwitcher variant="admin" />}
              <button
                onClick={onLogout}
                title={t("nav.logout")}
                className="flex items-center justify-center w-8 h-8 rounded-md text-primary-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 lg:hidden animate-in fade-in duration-150" onClick={onClose} />
      )}
    </>
  );
};

export default AdminSidebar;
