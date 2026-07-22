import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { menuGroups } from "./adminMenuConfig";

const breadcrumbMap: Record<string, string> = {};
menuGroups.forEach(g => g.items.forEach(i => {
  breadcrumbMap[i.href] = i.label;
}));

/** Returns true if a URL segment looks like a raw ID (UUID, short hash, or numeric) */
function isIdSegment(seg: string) {
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg) || // UUID
    /^[0-9a-zA-Z]{20,}$/.test(seg) || // long alphanumeric hash
    /^\d+$/.test(seg) // pure numeric
  );
}

const AdminBreadcrumb = () => {
  const location = useLocation();
  const path = location.pathname;

  if (path === "/admin") return null;

  // Walk segments from longest match to shortest to find a breadcrumb label
  const segments = path.split("/").filter(Boolean); // e.g. ["admin","bookings","<uuid>"]

  let label = "";
  let matchedHref = "";

  // Try to find the deepest non-ID segment that has a label
  for (let i = segments.length; i >= 1; i--) {
    const candidate = "/" + segments.slice(0, i).join("/");
    if (breadcrumbMap[candidate]) {
      label = breadcrumbMap[candidate];
      matchedHref = candidate;
      break;
    }
  }

  // Fallback: use last non-ID segment, prettified
  if (!label) {
    const fallbackSeg = [...segments].reverse().find(s => !isIdSegment(s));
    label = fallbackSeg?.replace(/-/g, " ") ?? "";
  }

  if (!label) return null;

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
      <Link to="/admin" className="flex items-center gap-1 hover:text-foreground transition-colors">
        <Home className="w-3.5 h-3.5" />
        <span>Dashboard</span>
      </Link>
      <ChevronRight className="w-3.5 h-3.5" />
      {matchedHref && matchedHref !== path ? (
        <Link to={matchedHref} className="hover:text-foreground transition-colors capitalize">
          {label}
        </Link>
      ) : (
        <span className="text-foreground font-medium capitalize">{label}</span>
      )}
    </nav>
  );
};

export default AdminBreadcrumb;
