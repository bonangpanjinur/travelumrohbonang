import type { AppRole } from "@/shared/hooks/useAuth";
import { menuItems } from "./components/adminMenuConfig";

const FULL_ADMIN: AppRole[] = ["super_admin", "owner", "admin"];
const STAFF: AppRole[] = ["super_admin", "owner", "admin", "branch_manager", "staff"];
const OPERATIONAL: AppRole[] = [...STAFF, "finance", "agent"];
const FINANCE: AppRole[] = [...OPERATIONAL.filter((role) => role !== "staff" && role !== "agent"), "finance"];

/**
 * Resolves the static role policy for a concrete admin pathname.
 * Menu visibility is not a security boundary; this policy is enforced by the
 * route guard before rendering the child route.
 */
export function getAdminRouteRoles(pathname: string): readonly AppRole[] {
  if (pathname === "/admin") return OPERATIONAL;

  const exceptions: Array<{ prefix: string; roles: AppRole[] }> = [
    { prefix: "/admin/multi-language", roles: FULL_ADMIN },
    { prefix: "/admin/role-management", roles: FULL_ADMIN },
    { prefix: "/admin/document-types", roles: STAFF },
    { prefix: "/admin/document-tracking", roles: STAFF },
    { prefix: "/admin/chats", roles: STAFF },
  ];
  const exception = exceptions.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (exception) return exception.roles;

  const match = [...menuItems]
    .filter((item) => item.href !== "/admin" && (pathname === item.href || pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (match?.roles?.length) return match.roles as AppRole[];

  // Unlisted admin routes default closed rather than silently widening access.
  return FULL_ADMIN;
}

export function canAccessAdminRoute(pathname: string, role: AppRole | null): boolean {
  return !!role && getAdminRouteRoles(pathname).includes(role);
}

export { FULL_ADMIN, STAFF, OPERATIONAL, FINANCE };
