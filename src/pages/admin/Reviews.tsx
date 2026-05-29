import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Star, Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { logAudit } from "@/lib/audit";

export default function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    let q = supabase.from("package_reviews").select("*, packages(title), profiles(full_name, email)").order("created_at", { ascending: false }).limit(200);
    if (filter === "pending") q = q.eq("is_approved", false);
    if (filter === "approved") q = q.eq("is_approved", true);
    const { data } = await q;
    setReviews(data || []);
    setLoading(false);
  };
  useEffect(() => { refresh(); }, [filter]);

  const approve = async (id: string, val: boolean) => {
    const { error } = await supabase.from("package_reviews").update({ is_approved: val }).eq("id", id);
    if (error) return toast.error(error.message);
    await logAudit(val ? "approve_review" : "unapprove_review", "review", id);
    toast.success(val ? "Disetujui" : "Disembunyikan");
    refresh();
  };
  const del = async (id: string) => {
    if (!confirm("Hapus ulasan ini?")) return;
    const { error } = await supabase.from("package_reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    await logAudit("delete_review", "review", id);
    toast.success("Dihapus");
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Ulasan Paket</h1>
          <p className="text-muted-foreground">Moderasi ulasan yang masuk dari jamaah.</p>
        </div>
        <div className="flex gap-2">
          {(["pending","approved","all"] as const).map(f => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
              {f === "pending" ? "Menunggu" : f === "approved" ? "Disetujui" : "Semua"}
            </Button>
          ))}
        </div>
      </div>

      {loading ? <p>Memuat…</p> : reviews.length === 0 ? <p className="text-muted-foreground">Tidak ada ulasan.</p> : (
        <div className="space-y-3">
          {reviews.map(r => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold">{r.profiles?.full_name || r.profiles?.email || "Anonim"}</span>
                    <span className="text-xs text-muted-foreground">· {r.packages?.title}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    {[1,2,3,4,5].map(i => <Star key={i} className={`w-3 h-3 ${i <= r.rating ? "fill-gold text-gold" : "text-muted"}`} />)}
                    <span className="text-xs text-muted-foreground ml-2">{format(new Date(r.created_at), "dd MMM yyyy HH:mm")}</span>
                  </div>
                  {r.title && <h3 className="font-medium">{r.title}</h3>}
                  {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                </div>
                <div className="flex gap-1">
                  {!r.is_approved ? (
                    <Button size="sm" onClick={() => approve(r.id, true)}><Check className="w-4 h-4" /></Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => approve(r.id, false)}><X className="w-4 h-4" /></Button>
                  )}
                  <Button size="sm" variant="destructive" onClick={() => del(r.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
