import { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ChevronDown, Star, type LucideIcon } from "lucide-react";
import type { MenuItem } from "./adminMenuConfig";

interface AdminSidebarGroupProps {
  title: string;
  icon: LucideIcon;
  items: MenuItem[];
  labelFor: (item: MenuItem) => string;
  /** Whole sidebar is in icon-only (collapsed) mode */
  collapsedSidebar: boolean;
  /** This group's own expand/collapse state (ignored visually when collapsedSidebar) */
  isOpen: boolean;
  onToggleOpen?: () => void;
  activePathname: string;
  favorites: string[];
  onToggleFavorite: (href: string) => void;
  favoriteLabel: string;
  unfavoriteLabel: string;
  badgeCounts: Record<string, number>;
  onNavigate: () => void;
  showDivider: boolean;
  highlightQuery?: string;
}

function highlightMatch(text: string, query: string): ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent/40 text-primary-foreground rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

const AdminSidebarGroup = ({
  title,
  icon,
  items,
  labelFor,
  collapsedSidebar,
  isOpen,
  onToggleOpen,
  activePathname,
  favorites,
  onToggleFavorite,
  favoriteLabel,
  unfavoriteLabel,
  badgeCounts,
  onNavigate,
  showDivider,
  highlightQuery,
}: AdminSidebarGroupProps) => {
  const Icon = icon;
  const triggerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flyoutCoords, setFlyoutCoords] = useState<{ top: number; left: number } | null>(null);

  if (items.length === 0) return null;

  const isGroupActive = items.some((item) => item.href === activePathname);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setFlyoutCoords(null), 150);
  };

  const openFlyout = () => {
    cancelClose();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setFlyoutCoords({ top: rect.top, left: rect.right + 8 });
  };

  const renderItemRow = (item: MenuItem, compact: boolean) => {
    const isActive = activePathname === item.href;
    const isFav = favorites.includes(item.href);
    const badge = badgeCounts[item.href];
    return (
      <li key={item.href}>
        <Link
          to={item.href}
          onClick={onNavigate}
          title={compact ? labelFor(item) : undefined}
          className={`group relative flex items-center gap-3 py-2.5 rounded-lg text-sm transition-all ${
            compact ? "justify-center px-0" : "pl-4 pr-2"
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
            className={`relative flex items-center justify-center w-7 h-7 rounded-md shrink-0 transition-colors ${
              isActive ? "bg-accent/20 text-accent" : "text-primary-foreground/50 group-hover:text-primary-foreground/80"
            }`}
          >
            <item.icon className="w-4 h-4" />
            {!!badge && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-accent text-accent-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </span>
          {!compact && (
            <>
              <span className="flex-1 truncate">{highlightMatch(labelFor(item), highlightQuery ?? "")}</span>
              {!!badge && (
                <span className="ml-1 shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleFavorite(item.href);
                }}
                title={isFav ? unfavoriteLabel : favoriteLabel}
                className={`shrink-0 p-1 rounded transition-opacity ${
                  isFav ? "text-accent opacity-100" : "text-primary-foreground/30 opacity-0 group-hover:opacity-100 hover:text-accent"
                }`}
              >
                <Star className="w-3.5 h-3.5" fill={isFav ? "currentColor" : "none"} />
              </button>
            </>
          )}
        </Link>
      </li>
    );
  };

  if (collapsedSidebar) {
    return (
      <div
        ref={triggerRef}
        className={showDivider ? "pt-2 mt-2 border-t border-primary-foreground/10" : ""}
        onMouseEnter={openFlyout}
        onMouseLeave={scheduleClose}
      >
        <div
          title={title}
          className={`flex items-center justify-center w-full py-2.5 rounded-lg transition-colors cursor-default ${
            isGroupActive ? "text-accent" : "text-primary-foreground/50 hover:text-primary-foreground/80 hover:bg-primary-foreground/5"
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
        {flyoutCoords &&
          createPortal(
            <div
              style={{ position: "fixed", top: flyoutCoords.top, left: flyoutCoords.left, zIndex: 100 }}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              className="w-56 bg-primary rounded-lg shadow-xl shadow-black/40 border border-primary-foreground/10 py-2 animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-3 pb-1.5 mb-1 border-b border-primary-foreground/10 flex items-center gap-2 text-[10px] uppercase tracking-wider text-primary-foreground/40 font-semibold">
                <Icon className="w-3.5 h-3.5" />
                {title}
              </div>
              <ul className="space-y-0.5 px-2">{items.map((item) => renderItemRow(item, false))}</ul>
            </div>,
            document.body
          )}
      </div>
    );
  }

  return (
    <div className={showDivider ? "pt-2 mt-2 border-t border-primary-foreground/10" : ""}>
      <button
        type="button"
        onClick={onToggleOpen}
        disabled={!onToggleOpen}
        className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-[10px] uppercase tracking-wider font-semibold transition-colors ${
          isGroupActive ? "text-accent/90" : "text-primary-foreground/40 hover:text-primary-foreground/70 hover:bg-primary-foreground/5"
        } ${!onToggleOpen ? "cursor-default hover:bg-transparent" : ""}`}
      >
        <span className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5" />
          {title}
        </span>
        {onToggleOpen && (
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
        )}
      </button>
      {isOpen && <ul className="space-y-0.5 mb-1">{items.map((item) => renderItemRow(item, false))}</ul>}
    </div>
  );
};

export default AdminSidebarGroup;
