import { useEffect, useState } from "react";
import { supabase } from "@/shared/integrations/supabase/client";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { useToast } from "@/shared/hooks/use-toast";
import { Save, Image, Globe, Building2, Phone, Palette, ImageIcon, Layout, Check, Banknote, Share2, Wallet, Eye, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { type Json } from "@/shared/integrations/supabase/types";
import { IconPicker } from "@/shared/components/ui/icon-picker";
import { cn } from "@/shared/lib/utils";

interface HeroSettings {
  background_url: string;
  overlay_opacity: number;
  title: string;
  title_highlight: string;
  subtitle: string;
  show_stats: boolean;
  stats: { value: string; label: string }[];
  primary_button_text: string;
  primary_button_url: string;
  primary_button_enabled: boolean;
  secondary_button_text: string;
  secondary_button_url: string;
  secondary_button_enabled: boolean;
}

interface AboutSettings {
  title: string;
  title_highlight: string;
  description: string;
  image_url: string;
  features: { icon: string; title: string }[];
}

interface BrandingSettings {
  logo_url: string;
  company_name: string;
  tagline: string;
  favicon_url: string;
  display_mode: "logo_only" | "text_only" | "both";
}

interface ContactSettings {
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  map_embed_url: string;
}

interface SeoSettings {
  site_title: string;
  site_description: string;
  og_image: string;
  keywords: string;
}

interface BackgroundSettings {
  type: "pattern" | "image" | "none";
  image_url: string;
  pattern_type: "islamic" | "dots" | "grid" | "none";
}

interface TemplateSettings {
  active_template: string;
  color_scheme: string;
  font_style: string;
  custom_primary_hex?: string;
  custom_accent_hex?: string;
}

interface BankSettings {
  bank_name: string;
  bank_account: string;
  bank_holder: string;
  bank_name_2: string;
  bank_account_2: string;
  bank_holder_2: string;
}

interface SocialSettings {
  instagram: string;
  facebook: string;
  youtube: string;
  tiktok: string;
  twitter: string;
}

interface PaymentGatewaySettings {
  midtrans_enabled: boolean;
  midtrans_server_key: string;
  midtrans_client_key: string;
  midtrans_environment: "sandbox" | "production";
  xendit_enabled: boolean;
  xendit_secret_key: string;
  xendit_environment: "sandbox" | "production";
  default_gateway: "midtrans" | "xendit";
}


// Template definitions — 3 variants
const templates = [
  {
    id: "classic",
    name: "Classic Umroh",
    description: "Tampilan elegan dan profesional dengan nuansa hijau emas",
    preview: "linear-gradient(135deg, #0D4715 0%, #1a5c20 50%, #D4AF37 100%)",
    defaultPrimary: "#0D4715",
    defaultAccent: "#D4AF37",
  },
  {
    id: "modern",
    name: "Modern Minimalist",
    description: "Desain bersih dan modern dengan sentuhan biru profesional",
    preview: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #60a5fa 100%)",
    defaultPrimary: "#1e3a5f",
    defaultAccent: "#2563eb",
  },
  {
    id: "luxury",
    name: "Luxury Premium",
    description: "Tampilan mewah untuk paket premium dan VIP",
    preview: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #e94560 100%)",
    defaultPrimary: "#1a1a2e",
    defaultAccent: "#e94560",
  },
];

const fontStyles = [
  { id: "classic", name: "Classic (Playfair)", value: "playfair" },
  { id: "modern", name: "Modern (Inter)", value: "inter" },
  { id: "elegant", name: "Elegant (Cormorant)", value: "cormorant" },
];

const defaultHero: HeroSettings = {
  background_url: "",
  overlay_opacity: 70,
  title: "Wujudkan",
  title_highlight: "Ibadah Umroh",
  subtitle: "Perjalanan spiritual dengan pelayanan terbaik, bimbingan ustadz berpengalaman, dan hotel bintang 5 dekat Masjidil Haram.",
  show_stats: true,
  stats: [
    { value: "10K+", label: "Jemaah" },
    { value: "150+", label: "Keberangkatan" },
    { value: "15+", label: "Tahun" },
    { value: "4.9", label: "Rating" },
  ],
  primary_button_text: "Lihat Paket Umroh",
  primary_button_url: "/paket",
  primary_button_enabled: true,
  secondary_button_text: "Konsultasi Gratis",
  secondary_button_url: "#kontak",
  secondary_button_enabled: true,
};

const defaultAbout: AboutSettings = {
  title: "Mengapa Memilih",
  title_highlight: "UmrohPlus?",
  description: "Kami adalah travel umroh terpercaya dengan pengalaman lebih dari 15 tahun melayani jemaah dari seluruh Indonesia.",
  image_url: "",
  features: [
    { icon: "check-circle", title: "Berpengalaman 15+ Tahun" },
    { icon: "shield-check", title: "Izin Resmi Kemenag" },
    { icon: "users", title: "10,000+ Jemaah Puas" },
    { icon: "star", title: "Rating 4.9/5" },
  ],
};

const defaultBranding: BrandingSettings = {
  logo_url: "",
  company_name: "UmrohPlus",
  tagline: "Travel & Tours",
  favicon_url: "",
  display_mode: "both",
};

const defaultContact: ContactSettings = {
  address: "Jl. Raya Jakarta No. 123, Jakarta Selatan",
  phone: "021-12345678",
  whatsapp: "6281234567890",
  email: "info@umrohplus.com",
  map_embed_url: "",
};

const defaultSeo: SeoSettings = {
  site_title: "UmrohPlus - Travel Umroh Terpercaya",
  site_description: "Paket umroh terbaik dengan pelayanan premium, hotel bintang 5, dan bimbingan ustadz berpengalaman.",
  og_image: "",
  keywords: "umroh, paket umroh, travel umroh, umroh 2024, umroh murah",
};

const defaultBackground: BackgroundSettings = {
  type: "pattern",
  image_url: "",
  pattern_type: "islamic",
};

const defaultTemplate: TemplateSettings = {
  active_template: "classic",
  color_scheme: "default",
  font_style: "classic",
  custom_primary_hex: "",
  custom_accent_hex: "",
};

const defaultBank: BankSettings = {
  bank_name: "",
  bank_account: "",
  bank_holder: "",
  bank_name_2: "",
  bank_account_2: "",
  bank_holder_2: "",
};

const defaultSocial: SocialSettings = {
  instagram: "",
  facebook: "",
  youtube: "",
  tiktok: "",
  twitter: "",
};

const defaultPaymentGateway: PaymentGatewaySettings = {
  midtrans_enabled: false,
  midtrans_server_key: "",
  midtrans_client_key: "",
  midtrans_environment: "sandbox",
  xendit_enabled: false,
  xendit_secret_key: "",
  xendit_environment: "sandbox",
  default_gateway: "midtrans",
};

const AdminSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [hero, setHero] = useState<HeroSettings>(defaultHero);
  const [about, setAbout] = useState<AboutSettings>(defaultAbout);
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [contact, setContact] = useState<ContactSettings>(defaultContact);
  const [seo, setSeo] = useState<SeoSettings>(defaultSeo);
  const [background, setBackground] = useState<BackgroundSettings>(defaultBackground);
  const [template, setTemplate] = useState<TemplateSettings>(defaultTemplate);
  const [bank, setBank] = useState<BankSettings>(defaultBank);
  const [social, setSocial] = useState<SocialSettings>(defaultSocial);
  const [paymentGateway, setPaymentGateway] = useState<PaymentGatewaySettings>(defaultPaymentGateway);
  const [showMidtransKey, setShowMidtransKey] = useState(false);
  const [showXenditKey, setShowXenditKey] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*");

    if (error) {
      console.error("Gagal memuat pengaturan:", error);
      toast({
        title: "Gagal memuat pengaturan",
        description: "Coba muat ulang halaman.",
        variant: "destructive",
      });
    }

    if (data) {
      data.forEach((setting) => {
        const value = setting.value as Json;
        switch (setting.key) {
          case "hero":
            setHero({ ...defaultHero, ...(value as object) });
            break;
          case "about":
            setAbout({ ...defaultAbout, ...(value as object) });
            break;
          case "branding":
            setBranding({ ...defaultBranding, ...(value as object) });
            break;
          case "contact":
            setContact({ ...defaultContact, ...(value as object) });
            break;
          case "seo":
            setSeo({ ...defaultSeo, ...(value as object) });
            break;
          case "background":
            setBackground({ ...defaultBackground, ...(value as object) });
            break;
          case "template":
            setTemplate({ ...defaultTemplate, ...(value as object) });
            break;
          case "bank":
            setBank({ ...defaultBank, ...(value as object) });
            break;
          case "social":
            setSocial({ ...defaultSocial, ...(value as object) });
            break;
          case "payment_gateway":
            setPaymentGateway({ ...defaultPaymentGateway, ...(value as object) });
            break;
        }
      });
    }
    setLoading(false);
  };

  const saveSetting = async (key: string, category: string, value: object) => {
    setSaving(true);
    
    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", key)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("site_settings")
        .update({ value: value as Json, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("site_settings")
        .insert({ key, category, value: value as Json });
    }

    toast({ title: "Pengaturan disimpan!" });
    setSaving(false);
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onSuccess: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `settings/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage.from("cms-images").upload(fileName, file);
    if (error) {
      toast({ title: "Gagal upload", variant: "destructive" });
      return;
    }

    const { data } = supabase.storage.from("cms-images").getPublicUrl(fileName);
    onSuccess(data.publicUrl);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-display font-bold mb-6">Pengaturan Website</h1>

      <Tabs defaultValue="template" className="space-y-6">
        <TabsList className="flex flex-wrap gap-2 h-auto bg-transparent">
          <TabsTrigger value="template" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Layout className="w-4 h-4 mr-2" /> Template
          </TabsTrigger>
          <TabsTrigger value="hero" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Image className="w-4 h-4 mr-2" /> Hero
          </TabsTrigger>
          <TabsTrigger value="about" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="w-4 h-4 mr-2" /> About
          </TabsTrigger>
          <TabsTrigger value="background" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ImageIcon className="w-4 h-4 mr-2" /> Background
          </TabsTrigger>
          <TabsTrigger value="branding" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Palette className="w-4 h-4 mr-2" /> Branding
          </TabsTrigger>
          <TabsTrigger value="contact" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Phone className="w-4 h-4 mr-2" /> Kontak
          </TabsTrigger>
          <TabsTrigger value="seo" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Globe className="w-4 h-4 mr-2" /> SEO
          </TabsTrigger>
          <TabsTrigger value="bank" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Banknote className="w-4 h-4 mr-2" /> Bank
          </TabsTrigger>
          <TabsTrigger value="social" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Share2 className="w-4 h-4 mr-2" /> Sosial Media
          </TabsTrigger>
          <TabsTrigger value="payment_gateway" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Wallet className="w-4 h-4 mr-2" /> Payment Gateway
          </TabsTrigger>
        </TabsList>

        {/* Template Settings */}
        <TabsContent value="template">
          <div className="bg-card border border-border rounded-xl p-6 space-y-8">
            {/* Header */}
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Layout className="w-5 h-5 text-primary" />
                Pilih Template Website
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                Pilih satu dari 3 template lalu sesuaikan warna dan tipografi sesuai brand Anda. Perubahan langsung terlihat di website.
              </p>
            </div>

            {/* Template Cards — 3 variants */}
            <div className="grid md:grid-cols-3 gap-4">
              {templates.map((t) => {
                const isActive = template.active_template === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTemplate({
                      ...template,
                      active_template: t.id,
                      custom_primary_hex: "",
                      custom_accent_hex: "",
                    })}
                    className={cn(
                      "relative text-left p-4 rounded-xl border-2 transition-all hover:shadow-lg group",
                      isActive
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {isActive && (
                      <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow">
                        <Check className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    )}
                    {/* Preview gradient */}
                    <div
                      className="w-full h-24 rounded-lg mb-3 transition-transform group-hover:scale-[1.02]"
                      style={{ background: t.preview }}
                    >
                      {/* Mini UI mockup */}
                      <div className="h-full p-2 flex flex-col justify-end">
                        <div className="flex gap-1 mb-1">
                          <div className="h-1.5 w-8 rounded-full bg-white/60" />
                          <div className="h-1.5 w-12 rounded-full bg-white/40" />
                        </div>
                        <div className="h-1 w-16 rounded-full bg-white/30" />
                      </div>
                    </div>
                    {/* Color dots */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ background: t.defaultPrimary }} />
                      <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ background: t.defaultAccent }} />
                    </div>
                    <h3 className="font-semibold text-sm">{t.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{t.description}</p>
                  </button>
                );
              })}
            </div>

            {/* Custom Colors */}
            <div className="border rounded-xl p-5 space-y-4">
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  Kustomisasi Warna
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Override warna template dengan warna brand Anda sendiri. Kosongkan untuk menggunakan warna default template.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                {/* Primary color */}
                <div className="space-y-2">
                  <Label className="text-sm">Warna Utama (Primary)</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="color"
                        value={template.custom_primary_hex || templates.find(t => t.id === template.active_template)?.defaultPrimary || "#0D4715"}
                        onChange={(e) => setTemplate({ ...template, custom_primary_hex: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-border p-0.5 bg-transparent"
                      />
                    </div>
                    <Input
                      value={template.custom_primary_hex || ""}
                      onChange={(e) => setTemplate({ ...template, custom_primary_hex: e.target.value })}
                      placeholder={templates.find(t => t.id === template.active_template)?.defaultPrimary || "#0D4715"}
                      className="font-mono text-sm"
                      maxLength={7}
                    />
                    {template.custom_primary_hex && (
                      <button
                        type="button"
                        onClick={() => setTemplate({ ...template, custom_primary_hex: "" })}
                        className="text-xs text-muted-foreground hover:text-destructive shrink-0"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Digunakan untuk sidebar, tombol, dan elemen utama</p>
                </div>
                {/* Accent color */}
                <div className="space-y-2">
                  <Label className="text-sm">Warna Aksen (Accent)</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="color"
                        value={template.custom_accent_hex || templates.find(t => t.id === template.active_template)?.defaultAccent || "#D4AF37"}
                        onChange={(e) => setTemplate({ ...template, custom_accent_hex: e.target.value })}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-border p-0.5 bg-transparent"
                      />
                    </div>
                    <Input
                      value={template.custom_accent_hex || ""}
                      onChange={(e) => setTemplate({ ...template, custom_accent_hex: e.target.value })}
                      placeholder={templates.find(t => t.id === template.active_template)?.defaultAccent || "#D4AF37"}
                      className="font-mono text-sm"
                      maxLength={7}
                    />
                    {template.custom_accent_hex && (
                      <button
                        type="button"
                        onClick={() => setTemplate({ ...template, custom_accent_hex: "" })}
                        className="text-xs text-muted-foreground hover:text-destructive shrink-0"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Digunakan untuk highlight, ikon, dan elemen aksen</p>
                </div>
              </div>

              {/* Live preview swatch */}
              {(template.custom_primary_hex || template.custom_accent_hex) && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex gap-2">
                    <div
                      className="w-8 h-8 rounded-md shadow border border-white"
                      style={{ background: template.custom_primary_hex || templates.find(t => t.id === template.active_template)?.defaultPrimary }}
                    />
                    <div
                      className="w-8 h-8 rounded-md shadow border border-white"
                      style={{ background: template.custom_accent_hex || templates.find(t => t.id === template.active_template)?.defaultAccent }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">Preview warna kustom Anda</span>
                </div>
              )}
            </div>

            {/* Font Style */}
            <div className="grid md:grid-cols-2 gap-6 pt-2 border-t">
              <div className="space-y-3">
                <Label>Gaya Font</Label>
                <Select
                  value={template.font_style}
                  onValueChange={(val) => setTemplate({ ...template, font_style: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontStyles.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Pilih gaya tipografi untuk website Anda
                </p>
              </div>
            </div>

            <Button onClick={() => saveSetting("template", "appearance", template)} disabled={saving} className="gradient-gold text-primary">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Menyimpan..." : "Simpan Template & Warna"}
            </Button>
          </div>
        </TabsContent>

        {/* Hero Settings */}
        <TabsContent value="hero">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold">Hero Section</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label>Background Image</Label>
                  {hero.background_url && (
                    <img src={hero.background_url} alt="Hero" className="w-full h-32 object-cover rounded-lg mt-2 mb-2" />
                  )}
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={hero.background_url}
                      onChange={(e) => setHero({ ...hero, background_url: e.target.value })}
                      placeholder="URL gambar"
                    />
                    <Button variant="outline" asChild>
                      <label className="cursor-pointer">
                        Upload
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => setHero({ ...hero, background_url: url }))} />
                      </label>
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Overlay Opacity (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={hero.overlay_opacity}
                    onChange={(e) => setHero({ ...hero, overlay_opacity: parseInt(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Title</Label>
                  <Input
                    value={hero.title}
                    onChange={(e) => setHero({ ...hero, title: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Title Highlight (gold)</Label>
                  <Input
                    value={hero.title_highlight}
                    onChange={(e) => setHero({ ...hero, title_highlight: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Subtitle</Label>
                  <Textarea
                    value={hero.subtitle}
                    onChange={(e) => setHero({ ...hero, subtitle: e.target.value })}
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={hero.show_stats}
                    onCheckedChange={(checked) => setHero({ ...hero, show_stats: checked })}
                  />
                  <Label>Tampilkan Statistics</Label>
                </div>

                {hero.show_stats && (
                  <div className="space-y-2">
                    <Label>Statistics</Label>
                    {hero.stats.map((stat, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Value"
                          value={stat.value}
                          onChange={(e) => {
                            const newStats = [...hero.stats];
                            newStats[index].value = e.target.value;
                            setHero({ ...hero, stats: newStats });
                          }}
                          className="w-24"
                        />
                        <Input
                          placeholder="Label"
                          value={stat.label}
                          onChange={(e) => {
                            const newStats = [...hero.stats];
                            newStats[index].label = e.target.value;
                            setHero({ ...hero, stats: newStats });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-4 space-y-4">
                  <h4 className="font-medium">Primary Button</h4>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={hero.primary_button_enabled}
                      onCheckedChange={(checked) => setHero({ ...hero, primary_button_enabled: checked })}
                    />
                    <Label>Aktifkan</Label>
                  </div>
                  <Input
                    placeholder="Text button"
                    value={hero.primary_button_text}
                    onChange={(e) => setHero({ ...hero, primary_button_text: e.target.value })}
                  />
                  <Input
                    placeholder="URL"
                    value={hero.primary_button_url}
                    onChange={(e) => setHero({ ...hero, primary_button_url: e.target.value })}
                  />
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h4 className="font-medium">Secondary Button</h4>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={hero.secondary_button_enabled}
                      onCheckedChange={(checked) => setHero({ ...hero, secondary_button_enabled: checked })}
                    />
                    <Label>Aktifkan</Label>
                  </div>
                  <Input
                    placeholder="Text button"
                    value={hero.secondary_button_text}
                    onChange={(e) => setHero({ ...hero, secondary_button_text: e.target.value })}
                  />
                  <Input
                    placeholder="URL"
                    value={hero.secondary_button_url}
                    onChange={(e) => setHero({ ...hero, secondary_button_url: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Button onClick={() => saveSetting("hero", "appearance", hero)} disabled={saving} className="gradient-gold text-primary">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Menyimpan..." : "Simpan Hero Settings"}
            </Button>
          </div>
        </TabsContent>

        {/* About Settings */}
        <TabsContent value="about">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold">About Section</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={about.title}
                    onChange={(e) => setAbout({ ...about, title: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Title Highlight</Label>
                  <Input
                    value={about.title_highlight}
                    onChange={(e) => setAbout({ ...about, title_highlight: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Deskripsi</Label>
                  <Textarea
                    value={about.description}
                    onChange={(e) => setAbout({ ...about, description: e.target.value })}
                    className="mt-1"
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Gambar</Label>
                  {about.image_url && (
                    <img src={about.image_url} alt="About" className="w-full h-32 object-cover rounded-lg mt-2 mb-2" />
                  )}
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={about.image_url}
                      onChange={(e) => setAbout({ ...about, image_url: e.target.value })}
                      placeholder="URL gambar"
                    />
                    <Button variant="outline" asChild>
                      <label className="cursor-pointer">
                        Upload
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => setAbout({ ...about, image_url: url }))} />
                      </label>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label>Features / Keunggulan</Label>
                <p className="text-xs text-muted-foreground">Klik icon untuk memilih dari daftar icon yang tersedia</p>
                {about.features.map((feature, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <IconPicker
                      value={feature.icon}
                      onChange={(val) => {
                        const newFeatures = [...about.features];
                        newFeatures[index].icon = val;
                        setAbout({ ...about, features: newFeatures });
                      }}
                    />
                    <Input
                      placeholder="Title keunggulan"
                      value={feature.title}
                      onChange={(e) => {
                        const newFeatures = [...about.features];
                        newFeatures[index].title = e.target.value;
                        setAbout({ ...about, features: newFeatures });
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        const newFeatures = about.features.filter((_, i) => i !== index);
                        setAbout({ ...about, features: newFeatures });
                      }}
                    >
                      ×
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAbout({ ...about, features: [...about.features, { icon: "check-circle", title: "" }] })}
                >
                  + Tambah Feature
                </Button>
              </div>
            </div>

            <Button onClick={() => saveSetting("about", "appearance", about)} disabled={saving} className="gradient-gold text-primary">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Menyimpan..." : "Simpan About Settings"}
            </Button>
          </div>
        </TabsContent>

        {/* Branding Settings */}
        <TabsContent value="branding">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold">Branding</h2>

            <div className="space-y-6">
              {/* Display Mode */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <Label className="text-base font-medium">Mode Tampilan Brand</Label>
                <p className="text-sm text-muted-foreground mb-4">Pilih bagaimana logo dan nama ditampilkan di navbar, footer, dan admin</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setBranding({ ...branding, display_mode: "logo_only" })}
                    className={cn(
                      "p-4 rounded-lg border-2 text-center transition-all",
                      branding.display_mode === "logo_only"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="w-10 h-10 mx-auto mb-2 rounded-full gradient-gold flex items-center justify-center">
                      <span className="font-display font-bold text-sm text-primary">U</span>
                    </div>
                    <span className="text-sm font-medium">Logo Saja</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBranding({ ...branding, display_mode: "text_only" })}
                    className={cn(
                      "p-4 rounded-lg border-2 text-center transition-all",
                      branding.display_mode === "text_only"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="mb-2">
                      <span className="font-display text-lg font-bold">UmrohPlus</span>
                      <span className="block text-[10px] text-muted-foreground tracking-widest uppercase">Travel</span>
                    </div>
                    <span className="text-sm font-medium">Teks Saja</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBranding({ ...branding, display_mode: "both" })}
                    className={cn(
                      "p-4 rounded-lg border-2 text-center transition-all",
                      branding.display_mode === "both"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full gradient-gold flex items-center justify-center">
                        <span className="font-display font-bold text-xs text-primary">U</span>
                      </div>
                      <div className="text-left">
                        <span className="font-display text-sm font-bold block leading-tight">UmrohPlus</span>
                        <span className="text-[8px] text-muted-foreground tracking-widest uppercase">Travel</span>
                      </div>
                    </div>
                    <span className="text-sm font-medium">Logo + Teks</span>
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Nama Perusahaan</Label>
                    <Input
                      value={branding.company_name}
                      onChange={(e) => setBranding({ ...branding, company_name: e.target.value })}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Tagline</Label>
                    <Input
                      value={branding.tagline}
                      onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Logo</Label>
                    {branding.logo_url && (
                      <img src={branding.logo_url} alt="Logo" className="h-16 object-contain mt-2 mb-2" />
                    )}
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={branding.logo_url}
                        onChange={(e) => setBranding({ ...branding, logo_url: e.target.value })}
                        placeholder="URL logo"
                      />
                      <Button variant="outline" asChild>
                        <label className="cursor-pointer">
                          Upload
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => setBranding({ ...branding, logo_url: url }))} />
                        </label>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {branding.display_mode === "text_only" ? "Logo tidak akan ditampilkan (mode teks saja)" : "Logo akan ditampilkan di navbar, footer, dan admin"}
                    </p>
                  </div>

                  <div>
                    <Label>Favicon</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={branding.favicon_url}
                        onChange={(e) => setBranding({ ...branding, favicon_url: e.target.value })}
                        placeholder="URL favicon"
                      />
                      <Button variant="outline" asChild>
                        <label className="cursor-pointer">
                          Upload
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => setBranding({ ...branding, favicon_url: url }))} />
                        </label>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={() => saveSetting("branding", "general", branding)} disabled={saving} className="gradient-gold text-primary">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Menyimpan..." : "Simpan Branding"}
            </Button>
          </div>
        </TabsContent>

        {/* Contact Settings */}
        <TabsContent value="contact">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold">Informasi Kontak</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label>Alamat</Label>
                  <Textarea
                    value={contact.address}
                    onChange={(e) => setContact({ ...contact, address: e.target.value })}
                    className="mt-1"
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Telepon</Label>
                  <Input
                    value={contact.phone}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>WhatsApp (dengan kode negara, tanpa +)</Label>
                  <Input
                    value={contact.whatsapp}
                    onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })}
                    placeholder="6281234567890"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    value={contact.email}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Google Maps Embed URL</Label>
                  <Textarea
                    value={contact.map_embed_url}
                    onChange={(e) => setContact({ ...contact, map_embed_url: e.target.value })}
                    placeholder="https://www.google.com/maps/embed?..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <Button onClick={() => saveSetting("contact", "general", contact)} disabled={saving} className="gradient-gold text-primary">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Menyimpan..." : "Simpan Kontak"}
            </Button>
          </div>
        </TabsContent>

        {/* SEO Settings */}
        <TabsContent value="seo">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold">SEO & Meta</h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label>Site Title</Label>
                  <Input
                    value={seo.site_title}
                    onChange={(e) => setSeo({ ...seo, site_title: e.target.value })}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Max 60 karakter</p>
                </div>

                <div>
                  <Label>Site Description</Label>
                  <Textarea
                    value={seo.site_description}
                    onChange={(e) => setSeo({ ...seo, site_description: e.target.value })}
                    className="mt-1"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Max 160 karakter</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Keywords</Label>
                  <Textarea
                    value={seo.keywords}
                    onChange={(e) => setSeo({ ...seo, keywords: e.target.value })}
                    placeholder="umroh, paket umroh, travel umroh"
                    className="mt-1"
                    rows={2}
                  />
                </div>

                <div>
                  <Label>OG Image</Label>
                  {seo.og_image && (
                    <img src={seo.og_image} alt="OG" className="w-full h-32 object-cover rounded-lg mt-2 mb-2" />
                  )}
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={seo.og_image}
                      onChange={(e) => setSeo({ ...seo, og_image: e.target.value })}
                      placeholder="URL gambar untuk social sharing"
                    />
                    <Button variant="outline" asChild>
                      <label className="cursor-pointer">
                        Upload
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => setSeo({ ...seo, og_image: url }))} />
                      </label>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={() => saveSetting("seo", "general", seo)} disabled={saving} className="gradient-gold text-primary">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Menyimpan..." : "Simpan SEO Settings"}
            </Button>
          </div>
        </TabsContent>

        {/* Background Settings */}
        <TabsContent value="background">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold">Pengaturan Background</h2>
            <p className="text-muted-foreground text-sm">
              Atur tampilan background di seluruh halaman website. Pilih antara pattern atau gambar masjid.
            </p>

            <div className="space-y-6">
              <div>
                <Label>Tipe Background</Label>
                <Select
                  value={background.type}
                  onValueChange={(val: "pattern" | "image" | "none") => setBackground({ ...background, type: val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa Background (Polos)</SelectItem>
                    <SelectItem value="pattern">Pattern (Islamic Pattern)</SelectItem>
                    <SelectItem value="image">Gambar (Masjidil Haram/Nabawi)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Pilih "Tanpa Background" untuk tampilan bersih tanpa pattern
                </p>
              </div>

              {background.type === "pattern" && (
                <div>
                  <Label>Jenis Pattern</Label>
                  <Select
                    value={background.pattern_type}
                    onValueChange={(val: "islamic" | "dots" | "grid" | "none") => setBackground({ ...background, pattern_type: val })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanpa Pattern</SelectItem>
                      <SelectItem value="islamic">Islamic Pattern (Diamond)</SelectItem>
                      <SelectItem value="dots">Dots Pattern</SelectItem>
                      <SelectItem value="grid">Grid Pattern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {background.type === "image" && (
                <div className="space-y-4">
                  <div>
                    <Label>Gambar Background</Label>
                    {background.image_url && (
                      <img src={background.image_url} alt="Background Preview" className="w-full h-48 object-cover rounded-lg mt-2 mb-2" />
                    )}
                    <div className="flex gap-2 mt-1">
                      <Input
                        value={background.image_url}
                        onChange={(e) => setBackground({ ...background, image_url: e.target.value })}
                        placeholder="URL gambar masjid"
                      />
                      <Button variant="outline" asChild>
                        <label className="cursor-pointer">
                          Upload
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (url) => setBackground({ ...background, image_url: url }))} />
                        </label>
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBackground({ ...background, image_url: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1920&q=80" })}
                    >
                      Masjidil Haram
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBackground({ ...background, image_url: "https://images.unsplash.com/photo-1564769625905-50e93615e769?w=1920&q=80" })}
                    >
                      Masjid Nabawi
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Button onClick={() => saveSetting("background", "appearance", background)} disabled={saving} className="gradient-gold text-primary">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Menyimpan..." : "Simpan Background Settings"}
            </Button>
          </div>
        </TabsContent>

        {/* Bank Settings */}
        <TabsContent value="bank">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold">Rekening Bank</h2>
            <p className="text-muted-foreground text-sm">Informasi rekening untuk pembayaran jemaah</p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4 p-4 border border-border rounded-lg">
                <h3 className="font-medium">Rekening Utama</h3>
                <div>
                  <Label>Nama Bank</Label>
                  <Input value={bank.bank_name} onChange={(e) => setBank({ ...bank, bank_name: e.target.value })} placeholder="BCA / Mandiri / BNI" className="mt-1" />
                </div>
                <div>
                  <Label>Nomor Rekening</Label>
                  <Input value={bank.bank_account} onChange={(e) => setBank({ ...bank, bank_account: e.target.value })} placeholder="1234567890" className="mt-1" />
                </div>
                <div>
                  <Label>Atas Nama</Label>
                  <Input value={bank.bank_holder} onChange={(e) => setBank({ ...bank, bank_holder: e.target.value })} placeholder="PT Travel Umroh" className="mt-1" />
                </div>
              </div>

              <div className="space-y-4 p-4 border border-border rounded-lg">
                <h3 className="font-medium">Rekening Alternatif</h3>
                <div>
                  <Label>Nama Bank</Label>
                  <Input value={bank.bank_name_2} onChange={(e) => setBank({ ...bank, bank_name_2: e.target.value })} placeholder="BSI / Bank Syariah" className="mt-1" />
                </div>
                <div>
                  <Label>Nomor Rekening</Label>
                  <Input value={bank.bank_account_2} onChange={(e) => setBank({ ...bank, bank_account_2: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Atas Nama</Label>
                  <Input value={bank.bank_holder_2} onChange={(e) => setBank({ ...bank, bank_holder_2: e.target.value })} className="mt-1" />
                </div>
              </div>
            </div>

            <Button onClick={() => saveSetting("bank", "general", bank)} disabled={saving} className="gradient-gold text-primary">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Menyimpan..." : "Simpan Rekening Bank"}
            </Button>
          </div>
        </TabsContent>

        {/* Social Media Settings */}
        <TabsContent value="social">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-semibold">Sosial Media</h2>
            <p className="text-muted-foreground text-sm">Link sosial media yang ditampilkan di footer dan halaman kontak</p>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label>Instagram</Label>
                  <Input value={social.instagram} onChange={(e) => setSocial({ ...social, instagram: e.target.value })} placeholder="https://instagram.com/username" className="mt-1" />
                </div>
                <div>
                  <Label>Facebook</Label>
                  <Input value={social.facebook} onChange={(e) => setSocial({ ...social, facebook: e.target.value })} placeholder="https://facebook.com/page" className="mt-1" />
                </div>
                <div>
                  <Label>YouTube</Label>
                  <Input value={social.youtube} onChange={(e) => setSocial({ ...social, youtube: e.target.value })} placeholder="https://youtube.com/@channel" className="mt-1" />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>TikTok</Label>
                  <Input value={social.tiktok} onChange={(e) => setSocial({ ...social, tiktok: e.target.value })} placeholder="https://tiktok.com/@username" className="mt-1" />
                </div>
                <div>
                  <Label>Twitter / X</Label>
                  <Input value={social.twitter} onChange={(e) => setSocial({ ...social, twitter: e.target.value })} placeholder="https://x.com/username" className="mt-1" />
                </div>
              </div>
            </div>

            <Button onClick={() => saveSetting("social", "general", social)} disabled={saving} className="gradient-gold text-primary">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Menyimpan..." : "Simpan Sosial Media"}
            </Button>
          </div>
        </TabsContent>
        {/* Payment Gateway Settings */}
        <TabsContent value="payment_gateway">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Konfigurasi Payment Gateway</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Kelola API key untuk integrasi pembayaran online. Key disimpan terenkripsi di database.
              </p>
            </div>

            <div>
              <Label>Gateway Default</Label>
              <Select
                value={paymentGateway.default_gateway}
                onValueChange={(val: "midtrans" | "xendit") => setPaymentGateway({ ...paymentGateway, default_gateway: val })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="midtrans">Midtrans</SelectItem>
                  <SelectItem value="xendit">Xendit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Midtrans */}
            <div className="p-4 border border-border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Midtrans</h3>
                  <p className="text-xs text-muted-foreground">Payment gateway populer di Indonesia</p>
                </div>
                <Switch
                  checked={paymentGateway.midtrans_enabled}
                  onCheckedChange={(v) => setPaymentGateway({ ...paymentGateway, midtrans_enabled: v })}
                />
              </div>

              {paymentGateway.midtrans_enabled && (
                <div className="space-y-4 pt-2 border-t border-border">
                  <div>
                    <Label>Environment</Label>
                    <Select
                      value={paymentGateway.midtrans_environment}
                      onValueChange={(val: "sandbox" | "production") => setPaymentGateway({ ...paymentGateway, midtrans_environment: val })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                        <SelectItem value="production">Production (Live)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Server Key</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type={showMidtransKey ? "text" : "password"}
                        value={paymentGateway.midtrans_server_key}
                        onChange={(e) => setPaymentGateway({ ...paymentGateway, midtrans_server_key: e.target.value })}
                        placeholder="SB-Mid-server-..."
                      />
                      <Button type="button" variant="outline" size="icon" onClick={() => setShowMidtransKey(!showMidtransKey)}>
                        {showMidtransKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Dapatkan di <a href="https://dashboard.sandbox.midtrans.com/settings/config_info" target="_blank" rel="noopener noreferrer" className="text-primary underline">Midtrans Dashboard</a> → Settings → Access Keys
                    </p>
                  </div>
                  <div>
                    <Label>Client Key (opsional)</Label>
                    <Input
                      value={paymentGateway.midtrans_client_key}
                      onChange={(e) => setPaymentGateway({ ...paymentGateway, midtrans_client_key: e.target.value })}
                      placeholder="SB-Mid-client-..."
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Xendit */}
            <div className="p-4 border border-border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Xendit</h3>
                  <p className="text-xs text-muted-foreground">Payment gateway modern dengan API simpel</p>
                </div>
                <Switch
                  checked={paymentGateway.xendit_enabled}
                  onCheckedChange={(v) => setPaymentGateway({ ...paymentGateway, xendit_enabled: v })}
                />
              </div>

              {paymentGateway.xendit_enabled && (
                <div className="space-y-4 pt-2 border-t border-border">
                  <div>
                    <Label>Environment</Label>
                    <Select
                      value={paymentGateway.xendit_environment}
                      onValueChange={(val: "sandbox" | "production") => setPaymentGateway({ ...paymentGateway, xendit_environment: val })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                        <SelectItem value="production">Production (Live)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Secret Key</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type={showXenditKey ? "text" : "password"}
                        value={paymentGateway.xendit_secret_key}
                        onChange={(e) => setPaymentGateway({ ...paymentGateway, xendit_secret_key: e.target.value })}
                        placeholder="xnd_development_..."
                      />
                      <Button type="button" variant="outline" size="icon" onClick={() => setShowXenditKey(!showXenditKey)}>
                        {showXenditKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Dapatkan di <a href="https://dashboard.xendit.co/settings/developers#api-keys" target="_blank" rel="noopener noreferrer" className="text-primary underline">Xendit Dashboard</a> → Settings → API Keys
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                ⚠️ Pastikan menggunakan mode <strong>Sandbox</strong> untuk testing. Jangan gunakan key Production sampai siap go-live.
              </p>
            </div>

            <Button onClick={() => saveSetting("payment_gateway", "integrations", paymentGateway)} disabled={saving} className="gradient-gold text-primary">
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Menyimpan..." : "Simpan Konfigurasi Gateway"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
