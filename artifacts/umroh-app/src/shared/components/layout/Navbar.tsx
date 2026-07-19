import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut, ChevronDown, LayoutDashboard, Ticket, UserCircle, LayoutGrid } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/shared/hooks/useAuth";
import { useLanguage } from "@/shared/i18n/LanguageContext";
import { apiFetch } from "@/shared/lib/apiClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import NotificationBell from "@/shared/components/notifications/NotificationBell";
import LanguageSwitcher from "@/shared/components/common/LanguageSwitcher";
import ThemeToggle from "@/shared/components/common/ThemeToggle";
import { CurrencySwitcher } from "@/shared/components/common/CurrencySwitcher";

interface NavItem {
  id: string;
  label: string;
  url: string;
  parent_id: string | null;
  sort_order: number;
  open_in_new_tab: boolean;
  children?: NavItem[];
}

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

// Module-level cache — survives React re-mounts on route changes so the
// nav never flickers back to defaults after the first successful fetch.
let _cachedNavItems: NavItem[] | null = null;
let _cachedBranding: BrandingSettings | null = null;
let _cachedDynamicPages: { title: string; slug: string }[] | null = null;

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  // Initialise from module-level cache so re-mounts never flash back to defaults
  const [navItems, setNavItems] = useState<NavItem[]>(_cachedNavItems ?? []);
  const [dynamicPages, setDynamicPages] = useState<{title: string, slug: string}[]>(_cachedDynamicPages ?? []);
  const [branding, setBranding] = useState<BrandingSettings>(_cachedBranding ?? defaultBranding);
  const [navLoaded, setNavLoaded] = useState(_cachedNavItems !== null);
  const [userProfile, setUserProfile] = useState<{ name: string; avatar_url: string } | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, role, signOut } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    // Skip fetches if all data already loaded from cache
    if (_cachedNavItems !== null && _cachedBranding !== null && _cachedDynamicPages !== null) return;

    const fetchNavItems = async () => {
      if (_cachedNavItems !== null) return;
      try {
        const result = await apiFetch<{ data: NavItem[] }>("/api/cms/navigation-items");
        if (result?.data) {
          const items = result.data;
          const parentItems = items.filter(item => !item.parent_id);
          const childItems = items.filter(item => item.parent_id);
          const hierarchy = parentItems.map(parent => ({
            ...parent,
            children: childItems.filter(child => child.parent_id === parent.id),
          }));
          _cachedNavItems = hierarchy;
          setNavItems(hierarchy);
          setNavLoaded(true);
        }
      } catch (err) {
        console.error("Error fetching navigation:", err);
        setNavLoaded(true); // show defaults on error
      }
    };

    const fetchBranding = async () => {
      if (_cachedBranding !== null) return;
      try {
        const result = await apiFetch<{ data: Array<{ key: string; value: unknown }> }>("/api/cms/site-settings");
        const brandingSetting = result?.data?.find((s) => s.key === "branding");
        if (brandingSetting?.value && typeof brandingSetting.value === "object") {
          const merged = { ...defaultBranding, ...(brandingSetting.value as object) };
          _cachedBranding = merged;
          setBranding(merged);
        }
      } catch (err) {
        console.error("Error fetching branding:", err);
      }
    };

    const fetchDynamicPages = async () => {
      if (_cachedDynamicPages !== null) return;
      try {
        const result = await apiFetch<{ data: { title: string; slug: string }[] }>("/api/cms/pages");
        if (result?.data) {
          _cachedDynamicPages = result.data;
          setDynamicPages(result.data);
        }
      } catch (err) {
        console.error("Error fetching dynamic pages:", err);
      }
    };

    fetchNavItems();
    fetchBranding();
    fetchDynamicPages();
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setUserProfile(null);
        return;
      }

      try {
        const result = await apiFetch<{ name: string; avatar_url: string } | null>(`/api/profile/${user.id}`).catch(() => null);
        if (result) {
          setUserProfile({ name: result.name ?? "", avatar_url: result.avatar_url ?? "" });
        } else {
          setUserProfile({ name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "", avatar_url: "" });
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setUserProfile({ name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "", avatar_url: "" });
      }
    };

    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      setIsOpen(false);
      await signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

    const defaultLinks: NavItem[] = [
    { id: "1", label: t("nav.home"), url: "/", parent_id: null, sort_order: 1, open_in_new_tab: false },
    { id: "2", label: t("nav.packages"), url: "/paket", parent_id: null, sort_order: 2, open_in_new_tab: false },
    { id: "3", label: t("nav.gallery"), url: "/galeri", parent_id: null, sort_order: 3, open_in_new_tab: false },
    { id: "4", label: t("nav.blog"), url: "/blog", parent_id: null, sort_order: 4, open_in_new_tab: false },
    ...dynamicPages.map((page, index): NavItem => ({
      id: `dynamic-${index}`,
      label: page.title || page.slug,
      url: `/${page.slug}`,
      parent_id: null,
      sort_order: 100 + index,
      open_in_new_tab: false
    }))
  ];

  // Use CMS nav if loaded & non-empty; fall back to hardcoded defaults only after
  // the fetch has completed (navLoaded=true) and returned nothing.
  const displayLinks: NavItem[] = (navLoaded && navItems.length === 0) ? defaultLinks : navItems.length > 0 ? navItems : defaultLinks;

  const renderLogo = () => {
    const showLogo = branding.display_mode === "logo_only" || branding.display_mode === "both";
    const showText = branding.display_mode === "text_only" || branding.display_mode === "both";

    return (
      <Link to="/" className="flex items-center gap-2.5 group shrink-0">
        {showLogo && (
          branding.logo_url ? (
            <img 
              src={branding.logo_url} 
              alt={branding.company_name} 
              className="h-9 md:h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="relative w-9 h-9 md:w-10 md:h-10 rounded-full gradient-gold flex items-center justify-center shadow-[0_0_0_3px_rgba(255,255,255,0.06)] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
              <span className="font-display font-bold text-lg text-primary">
                {branding.company_name.charAt(0)}
              </span>
            </div>
          )
        )}
        {showText && (
          <div className="leading-none">
            <span className="font-display text-lg md:text-xl font-bold text-primary-foreground tracking-tight">
              {branding.company_name}
            </span>
            <span className="block text-[9px] md:text-[10px] text-gold-light/90 tracking-[0.2em] uppercase mt-0.5">
              {branding.tagline}
            </span>
          </div>
        )}
      </Link>
    );
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
        isScrolled
          ? "bg-primary/98 backdrop-blur-md shadow-lg shadow-black/10 border-b border-primary-foreground/10"
          : "bg-primary/90 backdrop-blur-sm border-b border-transparent"
      }`}
    >
      <div
        className={`container-custom flex items-center justify-between px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
          isScrolled ? "h-14 md:h-16" : "h-16 md:h-20"
        }`}
      >
        {renderLogo()}

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-0.5 bg-primary-foreground/[0.04] rounded-full px-1 py-1">
          {displayLinks.map((link) => {
            const isActive = location.pathname === link.url;
            return (
              <div key={link.id} className="relative group">
                <Link
                  to={link.url}
                  target={link.open_in_new_tab ? "_blank" : undefined}
                  className={`relative z-10 px-4 py-2 text-sm font-medium rounded-full transition-colors inline-flex items-center gap-1 ${
                    isActive
                      ? "text-primary"
                      : "text-primary-foreground/75 hover:text-gold"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-gold"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{link.label}</span>
                  {link.children && link.children.length > 0 && (
                    <ChevronDown className="relative z-10 w-3 h-3" />
                  )}
                </Link>
                
                {link.children && link.children.length > 0 && (
                  <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[110]">
                    <div className="bg-card border border-border rounded-lg shadow-xl py-2 min-w-[160px]">
                      {link.children.map((child) => (
                        <Link
                          key={child.id}
                          to={child.url}
                          target={child.open_in_new_tab ? "_blank" : undefined}
                          className="block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="hidden lg:flex items-center">
          <div className="flex items-center gap-0.5 bg-primary-foreground/[0.04] rounded-full px-1.5 py-1">
            <LanguageSwitcher variant="navbar" />
            <span className="w-px h-4 bg-primary-foreground/15" />
            <CurrencySwitcher />
            <span className="w-px h-4 bg-primary-foreground/15" />
            <ThemeToggle variant="navbar" />

            {user && (
              <>
                <span className="w-px h-4 bg-primary-foreground/15" />
                <NotificationBell />
              </>
            )}

            {user ? (
              <>
                <span className="w-px h-4 bg-primary-foreground/15" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-1.5 text-primary-foreground/80 hover:text-gold hover:bg-primary-foreground/10 rounded-full p-1 pr-2">
                      <Avatar className="w-7 h-7 ring-2 ring-primary-foreground/10 group-hover:ring-gold/40 transition-all">
                        <AvatarImage src={userProfile?.avatar_url} alt={userProfile?.name} />
                        <AvatarFallback className="bg-gold/20 text-gold text-sm font-semibold">
                          {userProfile?.name?.charAt(0)?.toUpperCase() || <User className="w-4 h-4" />}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                    </Button>
                  </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-border z-[120]">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium text-muted-foreground px-2 py-1 uppercase tracking-wider">{t("nav.my_account")}</p>
                  {userProfile?.name && (
                    <p className="px-2 text-sm font-medium text-foreground truncate">{userProfile.name}</p>
                  )}
                  {role && (
                    <span className={`mx-2 mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                      isAdmin ? "bg-gold/15 text-gold" : "bg-muted text-muted-foreground"
                    }`}>
                      {t(`nav.role.${role}`)}
                    </span>
                  )}
                </div>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="flex items-center gap-2 cursor-pointer">
                    <LayoutDashboard className="w-4 h-4" />
                    {t("nav.my_dashboard")}
                  </Link>
                </DropdownMenuItem>
                
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <p className="text-xs font-medium text-gold px-2 py-1 uppercase tracking-wider">{t("nav.admin")}</p>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2 cursor-pointer font-medium text-gold hover:text-gold">
                        <LayoutDashboard className="w-4 h-4" />
                        {t("nav.admin_dashboard")}
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                  {t("nav.logout")}
                </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link to="/auth" className="ml-1">
                <Button className="gradient-gold text-primary font-semibold hover:opacity-90 transition-opacity">
                  {t("nav.login")}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden text-primary-foreground min-w-11 min-h-11 flex items-center justify-center"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-primary border-t border-primary-foreground/10 overflow-hidden z-[100]"
          >
            <div className="px-4 py-4 space-y-1 max-h-[80vh] overflow-y-auto">
              {displayLinks.map((link) => (
                <div key={link.id}>
                  <Link
                    to={link.url}
                    onClick={() => setIsOpen(false)}
                    className="block px-4 py-3 text-sm font-medium text-primary-foreground/80 hover:text-gold hover:bg-primary-foreground/10 rounded-lg transition-colors"
                  >
                    {link.label}
                  </Link>
                  {link.children && link.children.map((child) => (
                    <Link
                      key={child.id}
                      to={child.url}
                      onClick={() => setIsOpen(false)}
                      className="block px-8 py-2 text-sm text-primary-foreground/60 hover:text-gold"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ))}

              <div className="px-4 py-2">
                <LanguageSwitcher variant="navbar" />
              </div>
              
              {user ? (
                <div className="pt-4 border-t border-primary-foreground/10 mt-2 space-y-1">
                  <div className="px-4 py-2 flex items-center justify-between">
                    <p className="text-xs text-primary-foreground/40 uppercase tracking-wider">{t("nav.my_account")}</p>
                    {role && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                        isAdmin ? "bg-gold/20 text-gold" : "bg-primary-foreground/10 text-primary-foreground/60"
                      }`}>
                        {t(`nav.role.${role}`)}
                      </span>
                    )}
                  </div>
                  <Link 
                    to="/dashboard" 
                    onClick={() => setIsOpen(false)} 
                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-primary-foreground/80 hover:text-gold hover:bg-primary-foreground/10 rounded-lg"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    {t("nav.my_dashboard")}
                  </Link>

                  {isAdmin && (
                    <div className="pt-2 mt-2 border-t border-primary-foreground/5">
                      <p className="px-4 py-2 text-xs text-gold/60 uppercase tracking-wider">{t("nav.admin")}</p>
                      <Link 
                        to="/admin" 
                        onClick={() => setIsOpen(false)} 
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gold hover:bg-gold/10 rounded-lg"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        {t("nav.admin_dashboard")}
                      </Link>
                    </div>
                  )}
                  
                  <div className="pt-2 mt-2 border-t border-primary-foreground/10">
                    <Button 
                      onClick={handleLogout} 
                      variant="ghost" 
                      className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 px-4"
                    >
                      <LogOut className="w-4 h-4" />
                      {t("nav.logout")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="pt-4 border-t border-primary-foreground/10">
                  <Link to="/auth" onClick={() => setIsOpen(false)}>
                    <Button className="w-full gradient-gold text-primary font-semibold">
                      {t("nav.login")}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;