import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  MessageCircle,
  Instagram,
  Facebook,
  Music2,
  Youtube,
  Send,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface FloatingButton {
  id: string;
  platform: string;
  label: string;
  url: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
}

const iconMap: Record<string, React.ElementType> = {
  MessageCircle,
  Instagram,
  Facebook,
  Music2,
  Youtube,
  Send,
};

const platformInfo: Record<string, { name: string; color: string; placeholder: string }> = {
  whatsapp: { 
    name: "WhatsApp", 
    color: "bg-green-500", 
    placeholder: "https://wa.me/6281234567890" 
  },
  instagram: { 
    name: "Instagram", 
    color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400", 
    placeholder: "https://instagram.com/username" 
  },
  facebook: { 
    name: "Facebook", 
    color: "bg-blue-600", 
    placeholder: "https://facebook.com/pagename" 
  },
  tiktok: { 
    name: "TikTok", 
    color: "bg-black", 
    placeholder: "https://tiktok.com/@username" 
  },
  youtube: { 
    name: "YouTube", 
    color: "bg-red-600", 
    placeholder: "https://youtube.com/channel" 
  },
  telegram: { 
    name: "Telegram", 
    color: "bg-sky-500", 
    placeholder: "https://t.me/username" 
  },
};

const AdminFloatingButtons = () => {
  const queryClient = useQueryClient();
  const [editedUrls, setEditedUrls] = useState<Record<string, string>>({});

  const { data: buttons = [], isLoading } = useQuery({
    queryKey: ["admin-floating-buttons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("floating_buttons")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as FloatingButton[];
    },
  });

  useEffect(() => {
    const urls: Record<string, string> = {};
    buttons.forEach((btn) => {
      urls[btn.id] = btn.url || "";
    });
    setEditedUrls(urls);
  }, [buttons]);

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("floating_buttons")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-floating-buttons"] });
      toast.success("Status floating button diperbarui");
    },
  });

  const updateUrlMutation = useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string }) => {
      const { error } = await supabase
        .from("floating_buttons")
        .update({ url })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-floating-buttons"] });
      toast.success("URL berhasil diupdate");
    },
  });

  const handleUrlChange = (id: string, url: string) => {
    setEditedUrls((prev) => ({ ...prev, [id]: url }));
  };

  const handleUrlSave = (btn: FloatingButton) => {
    const newUrl = editedUrls[btn.id];
    if (newUrl !== btn.url) {
      updateUrlMutation.mutate({ id: btn.id, url: newUrl });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Memuat...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Floating Button</h1>
        <p className="text-muted-foreground">
          Kelola tombol floating untuk sosial media dan kontak
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {buttons.map((btn) => {
          const Icon = iconMap[btn.icon] || MessageCircle;
          const info = platformInfo[btn.platform] || { 
            name: btn.label, 
            color: "bg-gray-500", 
            placeholder: "https://..." 
          };

          return (
            <Card key={btn.id} className={btn.is_active ? "" : "opacity-60"}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${info.color} flex items-center justify-center text-white`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{info.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {btn.is_active ? "Aktif" : "Nonaktif"}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={btn.is_active}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ id: btn.id, is_active: checked })
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">URL</label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={editedUrls[btn.id] || ""}
                      onChange={(e) => handleUrlChange(btn.id, e.target.value)}
                      placeholder={info.placeholder}
                      onBlur={() => handleUrlSave(btn)}
                    />
                    {btn.url && (
                      <Button
                        size="icon"
                        variant="outline"
                        asChild
                      >
                        <a href={btn.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h3 className="font-semibold">Tips</h3>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Aktifkan tombol yang ingin ditampilkan di website</li>
                <li>• Untuk WhatsApp, gunakan format: https://wa.me/628xxxxx (tanpa + atau spasi)</li>
                <li>• Jika hanya 1 tombol aktif, akan muncul langsung tanpa menu expand</li>
                <li>• Jika lebih dari 1 aktif, akan muncul tombol + yang bisa di-expand</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFloatingButtons;
