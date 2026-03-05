import { useLocation, Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { menuGroups } from "./adminMenuConfig";

const breadcrumbMap: Record<string, string> = {};
menuGroups.forEach(g => g.items.forEach(i => {
  breadcrumbMap[i.href] = i.label;
}));

const AdminBreadcrumb = () => {
  const location = useLocation();
  const path = location.pathname;

  // Don't show on admin dashboard index
  if (path === "/admin") return null;

  const label = breadcrumbMap[path] || path.split("/").pop()?.replace(/-/g, " ") || "";

  return (
    <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
      <Link to="/admin" className="flex items-center gap-1 hover:text-foreground transition-colors">
        <Home className="w-3.5 h-3.5" />
        <span>Dashboard</span>
      </Link>
      <ChevronRight className="w-3.5 h-3.5" />
      <span className="text-foreground font-medium capitalize">{label}</span>
    </nav>
  );
};

export default AdminBreadcrumb;
