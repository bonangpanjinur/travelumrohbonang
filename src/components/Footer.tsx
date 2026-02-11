import { MapPin, Phone, Mail, Instagram, Facebook, Youtube } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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

const defaultBranding: BrandingSettings = {
  logo_url: "",
  company_name: "UmrohPlus",
  tagline: "Travel & Tours",
  favicon_url: "",
  display_mode: "both",
};

const defaultContact: ContactSettings = {
  address: "Jl. Raya Umroh No. 123, Jakarta Selatan 12345",
  phone: "0812-3456-7890",
  whatsapp: "6281234567890",
  email: "info@umrohplus.id",
  map_embed_url: "",
};

const Footer = () => {
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const [contact, setContact] = useState<ContactSettings>(defaultContact);
  const [dynamicPages, setDynamicPages] = useState<{title: string, slug: string}[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .in("key", ["branding", "contact"]);

      if (data) {
        data.forEach((setting) => {
          if (setting.key === "branding" && setting.value && typeof setting.value === 'object') {
            setBranding({ ...defaultBranding, ...(setting.value as object) });
          }
          if (setting.key === "contact" && setting.value && typeof setting.value === 'object') {
            setContact({ ...defaultContact, ...(setting.value as object) });
          }
        });
      }
    };

    const fetchDynamicPages = async () => {
      try {
        const { data } = await supabase
          .from("pages")
          .select("title, slug")
          .eq("is_active", true);
        if (data) setDynamicPages(data as {title: string, slug: string}[]);
      } catch (err) {
        console.error("Error fetching dynamic pages:", err);
      }
    };

    fetchSettings();
    fetchDynamicPages();
  }, []);

  const showLogo = branding.display_mode === "logo_only" || branding.display_mode === "both";
  const showText = branding.display_mode === "text_only" || branding.display_mode === "both";

  return (
    <footer id="kontak" className="bg-primary text-primary-foreground">
      <div className="container-custom section-padding pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              {showLogo && (
                branding.logo_url ? (
                  <img 
                    src={branding.logo_url} 
                    alt={branding.company_name} 
                    className="h-10 w-auto object-contain"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center">
                    <span className="font-display font-bold text-lg text-primary">
                      {branding.company_name.charAt(0)}
                    </span>
                  </div>
                )
              )}
              {showText && (
                <div>
                  <span className="font-display text-xl font-bold">{branding.company_name}</span>
                  <span className="block text-[10px] text-gold-light tracking-widest uppercase -mt-1">
                    {branding.tagline}
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm text-primary-foreground/60 leading-relaxed">
              Mitra terpercaya perjalanan ibadah umroh Anda dengan pelayanan terbaik dan pengalaman lebih dari 15 tahun.
            </p>
            <div className="flex gap-3 mt-6">
              {[Instagram, Facebook, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="w-10 h-10 rounded-lg bg-emerald-light/30 flex items-center justify-center hover:bg-gold/20 transition-colors">
                  <Icon className="w-5 h-5 text-gold-light" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold text-lg mb-4 text-gold">Menu</h4>
            <div className="space-y-3">
              <Link to="/" className="block text-sm text-primary-foreground/60 hover:text-gold transition-colors">Beranda</Link>
              <Link to="/paket" className="block text-sm text-primary-foreground/60 hover:text-gold transition-colors">Paket Umroh</Link>
              <Link to="/galeri" className="block text-sm text-primary-foreground/60 hover:text-gold transition-colors">Galeri</Link>
              <Link to="/blog" className="block text-sm text-primary-foreground/60 hover:text-gold transition-colors">Blog</Link>
              {dynamicPages.map((page) => (
                <Link key={page.slug} to={`/${page.slug}`} className="block text-sm text-primary-foreground/60 hover:text-gold transition-colors">
                  {page.title || page.slug}
                </Link>
              ))}
            </div>
          </div>

          {/* Paket */}
          <div>
            <h4 className="font-display font-bold text-lg mb-4 text-gold">Paket</h4>
            <div className="space-y-3">
              {["Paket Hemat", "Paket Reguler", "Paket VIP", "Paket Keluarga", "Paket Grup"].map((item) => (
                <Link key={item} to="/paket" className="block text-sm text-primary-foreground/60 hover:text-gold transition-colors">
                  {item}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-bold text-lg mb-4 text-gold">Kontak</h4>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                <span className="text-sm text-primary-foreground/60">
                  {contact.address}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gold flex-shrink-0" />
                <span className="text-sm text-primary-foreground/60">{contact.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gold flex-shrink-0" />
                <span className="text-sm text-primary-foreground/60">{contact.email}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-emerald-light/20 text-center text-sm text-primary-foreground/40">
          © 2025 {branding.company_name} {branding.tagline}. Seluruh hak dilindungi.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
