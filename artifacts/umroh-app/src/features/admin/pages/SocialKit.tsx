import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { toast } from "sonner";
import {
  Megaphone, Copy, RefreshCw, Instagram, Facebook,
  MessageCircle, Twitter, Sparkles, Hash, ChevronDown,
} from "lucide-react";

interface Package {
  id: string;
  title: string;
  price: string | number;
  durationDays: number;
  airline: string;
  hotelMakkah: string;
  hotelMadinah: string;
  imageUrl: string;
}

interface Departure {
  id: string;
  departureDate: string;
}

interface KitResult {
  caption: string;
  waMessage: string;
  storyCaption: string;
  hashtags: string[];
  metadata: { packageTitle: string; platform: string; style: string };
}

const PLATFORMS = [
  { value: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-500" },
  { value: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-600" },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "text-green-500" },
  { value: "twitter", label: "Twitter / X", icon: Twitter, color: "text-sky-500" },
];

const STYLES = [
  { value: "formal", label: "Formal", desc: "Profesional & terpercaya" },
  { value: "casual", label: "Kasual", desc: "Ramah & mengundang" },
  { value: "urgent", label: "Urgensi", desc: "FOMO & terbatas" },
];

const AdminSocialKit = () => {
  const [selectedPackage, setSelectedPackage] = useState("");
  const [selectedDeparture, setSelectedDeparture] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [style, setStyle] = useState("casual");
  const [customNote, setCustomNote] = useState("");
  const [kitResult, setKitResult] = useState<KitResult | null>(null);

  const { data: packages = [], isLoading: loadingPackages } = useQuery({
    queryKey: ["social-kit-packages"],
    queryFn: () => apiFetch<Package[]>("/api/admin/social-kit/packages"),
  });

  const { data: pkgDetail } = useQuery({
    queryKey: ["social-kit-pkg-detail", selectedPackage],
    queryFn: () =>
      apiFetch<{ package: Package; departures: Departure[] }>(
        `/api/admin/social-kit/packages/${selectedPackage}`,
      ),
    enabled: !!selectedPackage,
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      apiFetch<KitResult>("/api/admin/social-kit/generate", {
        method: "POST",
        body: JSON.stringify({
          packageId: selectedPackage,
          platform,
          style,
          departureDate: selectedDeparture || undefined,
          customNote: customNote || undefined,
        }),
      }),
    onSuccess: (data) => {
      setKitResult(data);
      toast.success("Konten berhasil digenerate!");
    },
    onError: () => toast.error("Gagal generate konten"),
  });

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} disalin ke clipboard!`));
  };

  const departures = pkgDetail?.departures ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-primary" />
          Social Media Kit
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate konten promosi siap-posting untuk Instagram, Facebook, dan WhatsApp
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config Panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Konfigurasi Konten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Package */}
              <div>
                <Label className="mb-1.5 block">Paket Umroh *</Label>
                <Select value={selectedPackage} onValueChange={(v) => { setSelectedPackage(v); setSelectedDeparture(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih paket..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingPackages ? (
                      <SelectItem value="loading" disabled>Memuat...</SelectItem>
                    ) : (
                      packages.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Departure */}
              {departures.length > 0 && (
                <div>
                  <Label className="mb-1.5 block">Tanggal Keberangkatan (opsional)</Label>
                  <Select value={selectedDeparture} onValueChange={setSelectedDeparture}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tanggal..." />
                    </SelectTrigger>
                    <SelectContent>
                      {departures.map((d) => (
                        <SelectItem key={d.id} value={d.departureDate}>
                          {new Date(d.departureDate).toLocaleDateString("id-ID", {
                            day: "numeric", month: "long", year: "numeric",
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Platform */}
              <div>
                <Label className="mb-1.5 block">Platform</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.value}
                        onClick={() => setPlatform(p.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                          platform === p.value
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${p.color}`} />
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Style */}
              <div>
                <Label className="mb-1.5 block">Gaya Konten</Label>
                <div className="space-y-2">
                  {STYLES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setStyle(s.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                        style === s.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className="font-medium">{s.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Note */}
              <div>
                <Label className="mb-1.5 block">Catatan Tambahan (opsional)</Label>
                <Textarea
                  placeholder="cth: Hubungi 08123456789 | Tersedia cicilan 3×"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>

              <Button
                className="w-full gap-2"
                onClick={() => generateMutation.mutate()}
                disabled={!selectedPackage || generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> Generate Konten</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Result Panel */}
        <div className="lg:col-span-2">
          {!kitResult ? (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-border rounded-xl">
              <div className="text-center p-8">
                <Megaphone className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-lg font-medium text-muted-foreground">Konten akan muncul di sini</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Pilih paket dan klik "Generate Konten"
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Badge info */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="gap-1 capitalize">
                  {PLATFORMS.find((p) => p.value === kitResult.metadata.platform)?.label}
                </Badge>
                <Badge variant="outline" className="gap-1 capitalize">
                  Gaya: {STYLES.find((s) => s.value === kitResult.metadata.style)?.label}
                </Badge>
                <Badge variant="outline">{kitResult.metadata.packageTitle}</Badge>
              </div>

              <Tabs defaultValue="caption">
                <TabsList className="w-full">
                  <TabsTrigger value="caption" className="flex-1">Caption Utama</TabsTrigger>
                  <TabsTrigger value="wa" className="flex-1">WhatsApp</TabsTrigger>
                  <TabsTrigger value="story" className="flex-1">Story / Reel</TabsTrigger>
                  {kitResult.hashtags.length > 0 && (
                    <TabsTrigger value="hashtags" className="flex-1">Hashtag</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="caption" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2 flex-row items-center justify-between">
                      <CardTitle className="text-sm">Caption Postingan</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-xs h-7"
                        onClick={() => copyText(kitResult.caption, "Caption")}
                      >
                        <Copy className="w-3.5 h-3.5" /> Salin
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={kitResult.caption}
                        readOnly
                        rows={14}
                        className="text-sm font-mono resize-none bg-muted/30"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        {kitResult.caption.length} karakter
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="wa" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2 flex-row items-center justify-between">
                      <CardTitle className="text-sm">Pesan WhatsApp</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-xs h-7"
                        onClick={() => copyText(kitResult.waMessage, "Pesan WA")}
                      >
                        <Copy className="w-3.5 h-3.5" /> Salin
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={kitResult.waMessage}
                        readOnly
                        rows={12}
                        className="text-sm font-mono resize-none bg-muted/30"
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="story" className="mt-4">
                  <Card>
                    <CardHeader className="pb-2 flex-row items-center justify-between">
                      <CardTitle className="text-sm">Caption Story / Reel (pendek)</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-xs h-7"
                        onClick={() => copyText(kitResult.storyCaption, "Caption Story")}
                      >
                        <Copy className="w-3.5 h-3.5" /> Salin
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl p-6 text-center border border-primary/10">
                        <pre className="text-sm font-medium whitespace-pre-wrap leading-relaxed">
                          {kitResult.storyCaption}
                        </pre>
                      </div>
                      <Textarea
                        value={kitResult.storyCaption}
                        readOnly
                        rows={4}
                        className="text-sm font-mono resize-none bg-muted/30 mt-3"
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {kitResult.hashtags.length > 0 && (
                  <TabsContent value="hashtags" className="mt-4">
                    <Card>
                      <CardHeader className="pb-2 flex-row items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-1.5">
                          <Hash className="w-4 h-4" /> Hashtag Rekomendasi
                        </CardTitle>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs h-7"
                          onClick={() => copyText(kitResult.hashtags.join(" "), "Hashtag")}
                        >
                          <Copy className="w-3.5 h-3.5" /> Salin Semua
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {kitResult.hashtags.map((tag) => (
                            <button
                              key={tag}
                              onClick={() => copyText(tag, tag)}
                              className="bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1 rounded-full text-sm transition-colors"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-3">
                          Klik hashtag untuk menyalin satu per satu
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
              >
                <RefreshCw className="w-4 h-4" /> Regenerate
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSocialKit;
