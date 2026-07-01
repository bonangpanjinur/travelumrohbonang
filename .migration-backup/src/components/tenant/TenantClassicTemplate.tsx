import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, MessageCircle, Instagram, Facebook, Star, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TenantSite } from "@/hooks/useTenant";

interface PackageData {
  id: string;
  title: string;
  slug: string;
  image_url: string | null;
  description: string | null;
  duration_days: number | null;
  package_type: string | null;
  is_featured?: boolean;
}

interface Props {
  tenant: TenantSite;
  packages: PackageData[];
}

const TenantClassicTemplate = ({ tenant, packages }: Props) => {
  const primaryStyle = { backgroundColor: tenant.primary_color };
  const secondaryStyle = { color: tenant.secondary_color };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 shadow-md" style={primaryStyle}>
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {tenant.logo_url && (
              <img src={tenant.logo_url} alt={tenant.site_name} className="h-10 w-auto object-contain" />
            )}
            <div>
              <span className="font-bold text-lg text-white">{tenant.site_name}</span>
              {tenant.tagline && (
                <span className="block text-xs text-white/70 -mt-0.5">{tenant.tagline}</span>
              )}
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <a href="#packages" className="text-white/80 hover:text-white text-sm font-medium transition-colors">Paket</a>
            <a href="#about" className="text-white/80 hover:text-white text-sm font-medium transition-colors">Tentang</a>
            <a href="#contact" className="text-white/80 hover:text-white text-sm font-medium transition-colors">Kontak</a>
            {tenant.whatsapp_number && (
              <a
                href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-transform hover:scale-105"
                style={{ backgroundColor: tenant.secondary_color, color: tenant.primary_color }}
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ minHeight: "420px" }}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: tenant.hero_image_url ? `url(${tenant.hero_image_url})` : undefined,
            backgroundColor: tenant.hero_image_url ? undefined : tenant.primary_color,
          }}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative container mx-auto px-4 py-24 md:py-32 text-center text-white">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            {tenant.hero_title || `Selamat Datang di ${tenant.site_name}`}
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-8">
            {tenant.hero_subtitle || tenant.tagline || "Layanan umroh terpercaya untuk Anda"}
          </p>
          <div className="flex justify-center gap-3">
            <a href="#packages">
              <Button size="lg" className="font-semibold" style={{ backgroundColor: tenant.secondary_color, color: tenant.primary_color }}>
                Lihat Paket
              </Button>
            </a>
            {tenant.whatsapp_number && (
              <a href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 font-semibold">
                  <MessageCircle className="w-4 h-4 mr-2" /> Hubungi Kami
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section id="packages" className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-2" style={secondaryStyle}>
            Paket Umroh Kami
          </h2>
          <p className="text-center text-muted-foreground mb-10">Pilih paket terbaik untuk perjalanan ibadah Anda</p>

          {packages.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Paket akan segera tersedia.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <Card key={pkg.id} className="overflow-hidden hover:shadow-lg transition-shadow border-border">
                  {pkg.image_url && (
                    <div className="h-48 overflow-hidden">
                      <img src={pkg.image_url} alt={pkg.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="p-5">
                    {pkg.is_featured && (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mb-2"
                        style={{ backgroundColor: `${tenant.secondary_color}20`, color: tenant.secondary_color }}
                      >
                        <Star className="w-3 h-3" /> Unggulan
                      </span>
                    )}
                    <h3 className="font-bold text-lg mb-1">{pkg.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mb-3">
                      {pkg.duration_days && (
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{pkg.duration_days} Hari</span>
                      )}
                      {pkg.package_type && (
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{pkg.package_type}</span>
                      )}
                    </div>
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{pkg.description}</p>
                    )}
                    <Link to={`/paket/${pkg.slug}`}>
                      <Button className="w-full font-semibold" style={{ backgroundColor: tenant.primary_color, color: "white" }}>
                        Detail & Booking
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* About */}
      {tenant.about_text && (
        <section id="about" className="py-16">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-6" style={secondaryStyle}>
              Tentang Kami
            </h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{tenant.about_text}</p>
          </div>
        </section>
      )}

      {/* Contact */}
      <section id="contact" className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8" style={secondaryStyle}>
            Hubungi Kami
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {tenant.phone && (
              <a href={`tel:${tenant.phone}`} className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border hover:shadow-md transition-shadow">
                <Phone className="w-5 h-5 shrink-0" style={secondaryStyle} />
                <span className="text-sm">{tenant.phone}</span>
              </a>
            )}
            {tenant.email && (
              <a href={`mailto:${tenant.email}`} className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border hover:shadow-md transition-shadow">
                <Mail className="w-5 h-5 shrink-0" style={secondaryStyle} />
                <span className="text-sm">{tenant.email}</span>
              </a>
            )}
            {tenant.whatsapp_number && (
              <a href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border hover:shadow-md transition-shadow">
                <MessageCircle className="w-5 h-5 shrink-0" style={secondaryStyle} />
                <span className="text-sm">WhatsApp</span>
              </a>
            )}
            {tenant.address && (
              <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border">
                <MapPin className="w-5 h-5 shrink-0 mt-0.5" style={secondaryStyle} />
                <span className="text-sm">{tenant.address}</span>
              </div>
            )}
          </div>

          {(tenant.instagram_url || tenant.facebook_url) && (
            <div className="flex justify-center gap-4 mt-8">
              {tenant.instagram_url && (
                <a href={tenant.instagram_url} target="_blank" rel="noopener noreferrer" className="p-3 rounded-full bg-card border border-border hover:shadow-md transition-shadow">
                  <Instagram className="w-5 h-5" style={secondaryStyle} />
                </a>
              )}
              {tenant.facebook_url && (
                <a href={tenant.facebook_url} target="_blank" rel="noopener noreferrer" className="p-3 rounded-full bg-card border border-border hover:shadow-md transition-shadow">
                  <Facebook className="w-5 h-5" style={secondaryStyle} />
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-white text-center text-sm" style={primaryStyle}>
        <p>© {new Date().getFullYear()} {tenant.site_name}. All rights reserved.</p>
        <p className="text-white/50 mt-1 text-xs">Powered by UmrohPlus</p>
      </footer>
    </div>
  );
};

export default TenantClassicTemplate;
