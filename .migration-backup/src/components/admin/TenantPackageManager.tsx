import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Package, Star, Plus, Trash2, GripVertical } from "lucide-react";

interface TenantPackageManagerProps {
  tenantSiteId: string;
  tenantName: string;
}

interface PackageItem {
  id: string;
  title: string;
  slug: string;
  image_url: string | null;
  is_active: boolean | null;
  package_type: string | null;
}

interface AssignedPackage {
  id: string;
  package_id: string;
  is_featured: boolean | null;
  sort_order: number | null;
}

const TenantPackageManager = ({ tenantSiteId, tenantName }: TenantPackageManagerProps) => {
  const [allPackages, setAllPackages] = useState<PackageItem[]>([]);
  const [assignedPackages, setAssignedPackages] = useState<AssignedPackage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    const [pkgRes, assignedRes] = await Promise.all([
      supabase.from("packages").select("id, title, slug, image_url, is_active, package_type").eq("is_active", true).order("title"),
      supabase.from("tenant_site_packages").select("id, package_id, is_featured, sort_order").eq("tenant_site_id", tenantSiteId).order("sort_order"),
    ]);
    if (pkgRes.data) setAllPackages(pkgRes.data);
    if (assignedRes.data) setAssignedPackages(assignedRes.data);
  };

  useEffect(() => { fetchData(); }, [tenantSiteId]);

  const assignedIds = new Set(assignedPackages.map(a => a.package_id));
  const unassigned = allPackages.filter(p => !assignedIds.has(p.id));

  const handleAssign = async (packageId: string) => {
    setLoading(true);
    const { error } = await supabase.from("tenant_site_packages").insert({
      tenant_site_id: tenantSiteId,
      package_id: packageId,
      sort_order: assignedPackages.length,
    });
    if (error) toast.error(error.message);
    else { toast.success("Paket ditambahkan"); fetchData(); }
    setLoading(false);
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from("tenant_site_packages").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Paket dihapus"); fetchData(); }
  };

  const handleToggleFeatured = async (id: string, current: boolean) => {
    const { error } = await supabase.from("tenant_site_packages").update({ is_featured: !current }).eq("id", id);
    if (error) toast.error(error.message);
    else fetchData();
  };

  const getPackageInfo = (packageId: string) => allPackages.find(p => p.id === packageId);

  return (
    <div className="space-y-6">
      {/* Assigned Packages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4" />
            Paket Aktif untuk {tenantName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {assignedPackages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Belum ada paket yang di-assign ke tenant ini</p>
          ) : (
            <div className="space-y-2">
              {assignedPackages.map(ap => {
                const pkg = getPackageInfo(ap.package_id);
                if (!pkg) return null;
                return (
                  <div key={ap.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                    {pkg.image_url && (
                      <img src={pkg.image_url} alt={pkg.title} className="w-12 h-12 rounded object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{pkg.title}</p>
                      {pkg.package_type && (
                        <Badge variant="outline" className="text-[10px] mt-0.5">{pkg.package_type}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <Star className={`w-3.5 h-3.5 ${ap.is_featured ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
                        <Switch
                          checked={ap.is_featured ?? false}
                          onCheckedChange={() => handleToggleFeatured(ap.id, ap.is_featured ?? false)}
                        />
                        <span className="text-xs text-muted-foreground">Featured</span>
                      </div>
                      <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleRemove(ap.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Packages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tambah Paket</CardTitle>
        </CardHeader>
        <CardContent>
          {unassigned.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Semua paket sudah di-assign</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {unassigned.map(pkg => (
                <div key={pkg.id} className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer group" onClick={() => !loading && handleAssign(pkg.id)}>
                  {pkg.image_url && (
                    <img src={pkg.image_url} alt={pkg.title} className="w-10 h-10 rounded object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pkg.title}</p>
                    {pkg.package_type && (
                      <span className="text-[10px] text-muted-foreground">{pkg.package_type}</span>
                    )}
                  </div>
                  <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantPackageManager;
