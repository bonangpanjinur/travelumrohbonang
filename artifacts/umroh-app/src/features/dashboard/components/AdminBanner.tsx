import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Crown, ArrowRight, RefreshCw } from "lucide-react";
import { useAuth } from "@/shared/hooks/useAuth";

const AdminBanner = () => {
  const { isAdmin, role, refreshRole } = useAuth();
  const navigate = useNavigate();

  if (!isAdmin) return null;

  const roleLabel =
    role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : role || "Admin";

  return (
    <Card className="relative overflow-hidden border-gold/40 bg-card shadow-md">
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gold" aria-hidden="true" />
      <CardContent className="p-5 pl-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gold shrink-0 p-3 rounded-xl shadow-sm">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              Anda login sebagai{" "}
              <span className="text-gold-dark dark:text-gold">{roleLabel}</span>
            </h3>
            <p className="text-sm text-foreground/70">
              Akses penuh ke panel admin tersedia.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshRole}
            title="Refresh role dari server"
            aria-label="Refresh role dari server"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => navigate("/admin")} className="gradient-gold text-primary shadow-sm hover:opacity-90">
            Buka Admin Dashboard <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminBanner;
