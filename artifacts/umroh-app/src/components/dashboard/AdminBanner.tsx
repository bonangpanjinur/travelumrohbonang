import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, ArrowRight, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const AdminBanner = () => {
  const { isAdmin, role, refreshRole } = useAuth();
  const navigate = useNavigate();

  if (!isAdmin) return null;

  const roleLabel =
    role === "super_admin" ? "Super Admin" : role === "admin" ? "Admin" : role || "Admin";

  return (
    <Card className="border-gold/40 bg-gradient-to-r from-primary/5 to-gold/5 shadow-md">
      <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gold/20 p-3 rounded-xl">
            <Crown className="h-6 w-6 text-gold" />
          </div>
          <div>
            <h3 className="font-semibold text-primary">
              Anda login sebagai <span className="text-gold">{roleLabel}</span>
            </h3>
            <p className="text-sm text-muted-foreground">
              Akses penuh ke panel admin tersedia.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshRole}
            title="Refresh role dari server"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => navigate("/admin")} className="gradient-gold text-primary">
            Buka Admin Dashboard <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminBanner;
