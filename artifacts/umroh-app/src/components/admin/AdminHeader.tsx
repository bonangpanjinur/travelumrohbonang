import { Menu } from "lucide-react";
import AdminBranding from "./AdminBranding";
import { BrandingSettings } from "./adminMenuConfig";
import AdminNotificationBell from "./AdminNotificationBell";
import ThemeToggle from "@/components/ThemeToggle";

interface AdminHeaderProps {
  branding: BrandingSettings;
  onMenuToggle: () => void;
}

const AdminHeader = ({ branding, onMenuToggle }: AdminHeaderProps) => {
  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-primary h-16 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle} className="text-primary-foreground">
          <Menu className="w-6 h-6" />
        </button>
        <AdminBranding branding={branding} isMobile />
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle variant="admin" />
        <AdminNotificationBell />
      </div>
    </header>
  );
};

export default AdminHeader;
