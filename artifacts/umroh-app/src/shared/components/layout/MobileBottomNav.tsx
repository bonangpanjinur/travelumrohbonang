import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, LayoutGrid, Ticket, UserCircle } from "lucide-react";
import { useAuth } from "@/shared/hooks/useAuth";
import { useLanguage } from "@/shared/i18n/LanguageContext";

/**
 * Mobile bottom navigation bar (Home / Paket / Booking / Profil).
 * Hidden on desktop (lg+) and on admin / auth / tenant-site routes, which
 * have their own navigation chrome.
 */
const MobileBottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();

  const hidden =
    location.pathname.startsWith("/admin") ||
    location.pathname === "/auth";

  // Toggle a body class so page content can reserve space for the fixed
  // bar without every page needing to know about it individually.
  useEffect(() => {
    if (hidden) {
      document.body.classList.remove("has-mobile-bottom-nav");
      return;
    }
    document.body.classList.add("has-mobile-bottom-nav");
    return () => {
      document.body.classList.remove("has-mobile-bottom-nav");
    };
  }, [hidden]);

  if (hidden) return null;

  const items = [
    { to: "/", label: t("nav.home"), icon: Home, match: (p: string) => p === "/" },
    { to: "/paket", label: t("nav.packages"), icon: LayoutGrid, match: (p: string) => p.startsWith("/paket") },
    {
      to: user ? "/my-bookings" : "/auth",
      label: t("nav.bottom.booking"),
      icon: Ticket,
      match: (p: string) => p.startsWith("/my-bookings") || p.startsWith("/booking"),
    },
    {
      to: user ? "/dashboard" : "/auth",
      label: t("nav.bottom.profile"),
      icon: UserCircle,
      match: (p: string) => p.startsWith("/dashboard") || p.startsWith("/profile"),
    },
  ];

  return (
    <nav
      aria-label={t("nav.bottom.aria_label")}
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
    >
      <div className="grid grid-cols-4 h-16">
        {items.map(({ to, label, icon: Icon, match }) => {
          const active = match(location.pathname);
          return (
            <Link
              key={to + label}
              to={to}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 min-h-11 text-[11px] font-medium transition-colors ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
