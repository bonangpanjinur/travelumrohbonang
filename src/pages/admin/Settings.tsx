import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Save, Image, Globe, Building2, Phone, Palette, ImageIcon, Layout, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Json } from "@/integrations/supabase/types";
import { IconPicker } from "@/components/ui/icon-picker";
import { cn } from "@/lib/utils";

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
  type: "pattern" | "image";
  image_url: string;
  pattern_type: "islamic" | "dots" | "grid";
}

interface TemplateSettings {
  active_template: string;
  color_scheme: string;
  font_style: string;
}

// Template definitions
const templates = [
  {
    id: "classic",
    name: "Classic Umroh",
    description: "Tampilan elegan dan profesional dengan nuansa hijau emas",
    preview: "linear-gradient(135deg, #0D4715 0%, #1a5c20 50%, #D4AF37 100%)",
    colors: { primary: "emerald", accent: "gold" },
  },
  {
    id: "modern",
    name: "Modern Minimalist",
    description: "Desain bersih dan modern dengan sentuhan minimalis",
    preview: "linear-gradient(135deg, #1e293b 0%, #334155 50%, #94a3b8 100%)",
    colors: { primary: "slate", accent: "blue" },
  },
  {
    id: "luxury",
    name: "Luxury Premium",
    description: "Tampilan mewah untuk paket premium dan VIP",
    preview: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #e94560 100%)",
    colors: { primary: "indigo", accent: "rose" },
  },
  {
    id: "nature",
    name: "Nature Fresh",
    description: "Nuansa alam yang segar dan menenangkan",
    preview: "linear-gradient(135deg, #134e4a 0%, #0f766e 50%, #5eead4 100%)",
    colors: { primary: "teal", accent: "cyan" },
  },
];

const colorSchemes = [
  { id: "default", name: "Default (Hijau Emas)", value: "emerald-gold" },
  { id: "blue", name: "Biru Profesional", value: "blue-slate" },
  { id: "purple", name: "Ungu Elegan", value: "purple-violet" },
  { id: "warm", name: "Hangat & Ramah", value: "orange-amber" },
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

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("*");

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
        </TabsList>

        {/* Template Settings */}
        <TabsContent value="template">
          <div className="bg-card border border-border rounded-xl p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Pilih Template</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Pilih template dasar lalu sesuaikan dengan kebutuhan Anda
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate({ ...template, active_template: t.id })}
                  className={cn(
                    "relative text-left p-4 rounded-xl border-2 transition-all hover:shadow-lg",
                    template.active_template === t.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {template.active_template === t.id && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  <div
                    className="w-full h-20 rounded-lg mb-3"
                    style={{ background: t.preview }}
                  />
                  <h3 className="font-semibold">{t.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6 pt-4 border-t">
              <div className="space-y-3">
                <Label>Skema Warna</Label>
                <Select
                  value={template.color_scheme}
                  onValueChange={(val) => setTemplate({ ...template, color_scheme: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorSchemes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Pilih kombinasi warna untuk website Anda
                </p>
              </div>

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
              {saving ? "Menyimpan..." : "Simpan Template"}
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
                  onValueChange={(val: "pattern" | "image") => setBackground({ ...background, type: val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pattern">Pattern (Islamic Pattern)</SelectItem>
                    <SelectItem value="image">Gambar (Masjidil Haram/Nabawi)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {background.type === "pattern" && (
                <div>
                  <Label>Jenis Pattern</Label>
                  <Select
                    value={background.pattern_type}
                    onValueChange={(val: "islamic" | "dots" | "grid") => setBackground({ ...background, pattern_type: val })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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
      </Tabs>
    </div>
  );
};

export default AdminSettings;
