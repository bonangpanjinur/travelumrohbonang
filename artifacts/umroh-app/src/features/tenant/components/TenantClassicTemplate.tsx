import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, Mail, MapPin, MessageCircle, Instagram, Facebook,
  Star, Clock, Users, Menu, X, ArrowRight,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { type TenantSite } from "@/shared/hooks/useTenant";
import FloatingButtons from "@/shared/components/common/FloatingButtons";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const primaryStyle = { backgroundColor: tenant.primary_color };
  const accentColor = { color: tenant.secondary_color };

  const navLinks = [
    { href: "#packages", label: "Paket" },
    { href: "#about", label: "Tentang" },
    { href: "#contact", label: "Kontak" },
  ];

  return (
    <div className="min-h-screen bg-background">

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 shadow-md" style={primaryStyle}>
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5 min-w-0">
            {tenant.logo_url && (
              <img src={tenant.logo_url} alt={tenant.site_name} className="h-9 w-auto object-contain shrink-0" />
            )}
            <div className="min-w-0">
              <span className="block font-bold text-base text-white truncate">{tenant.site_name}</span>
              {tenant.tagline && (
                <span className="block text-xs text-white/70 -mt-0.5 truncate">{tenant.tagline}</span>
              )}
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-4">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-white/80 hover:text-white text-sm font-medium transition-colors">
                {l.label}
              </a>
            ))}
            {tenant.whatsapp_number && (
              <a
                href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-transform hover:scale-105 shadow-sm"
                style={{ backgroundColor: tenant.secondary_color, color: tenant.primary_color }}
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-white/10"
              style={primaryStyle}
            >
              <div className="flex flex-col px-4 py-3 gap-1">
                {navLinks.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-white font-medium py-3 px-3 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {l.label}
                  </a>
                ))}
                {tenant.whatsapp_number && (
                  <a
                    href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={() => setMobileOpen(false)}
                    className="mt-2 flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-3 rounded-full shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" /> Chat WhatsApp
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: "380px" }}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: tenant.hero_image_url ? `url(${tenant.hero_image_url})` : undefined,
            backgroundColor: tenant.hero_image_url ? undefined : tenant.primary_color,
          }}
        />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative container mx-auto px-4 py-20 sm:py-28 md:py-36 text-center text-white">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-4 leading-tight">
            {tenant.hero_title || `Selamat Datang di ${tenant.site_name}`}
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-8">
            {tenant.hero_subtitle || tenant.tagline || "Layanan umroh terpercaya untuk Anda"}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="#packages">
              <Button size="lg" className="font-semibold rounded-full" style={{ backgroundColor: tenant.secondary_color, color: tenant.primary_color }}>
                Lihat Paket <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
            {tenant.whatsapp_number && (
              <a href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 font-semibold rounded-full">
                  <MessageCircle className="w-4 h-4 mr-2" /> Hubungi Kami
                </Button>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ── Packages ─────────────────────────────────────────────────────── */}
      <section id="packages" className="py-14 sm:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2" style={accentColor}>
            Paket Umroh Kami
          </h2>
          <p className="text-center text-muted-foreground mb-8 sm:mb-10 text-sm sm:text-base">
            Pilih paket terbaik untuk perjalanan ibadah Anda
          </p>

          {packages.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Paket akan segera tersedia.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {packages.map((pkg) => (
                <Card key={pkg.id} className="group overflow-hidden hover:shadow-lg transition-shadow border-border rounded-2xl">
                  {pkg.image_url ? (
                    <div className="h-44 sm:h-48 overflow-hidden">
                      <img src={pkg.image_url} alt={pkg.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  ) : (
                    <div className="h-28 sm:h-32" style={{ backgroundColor: `${tenant.primary_color}15` }} />
                  )}
                  <CardContent className="p-4 sm:p-5">
                    {pkg.is_featured && (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mb-2"
                        style={{ backgroundColor: `${tenant.secondary_color}20`, color: tenant.secondary_color }}
                      >
                        <Star className="w-3 h-3" /> Unggulan
                      </span>
                    )}
                    <h3 className="font-bold text-base sm:text-lg mb-1">{pkg.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-3">
                      {pkg.duration_days && (
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{pkg.duration_days} Hari</span>
                      )}
                      {pkg.package_type && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${tenant.primary_color}12`, color: tenant.primary_color }}>
                          {pkg.package_type}
                        </span>
                      )}
                    </div>
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{pkg.description}</p>
                    )}
                    <Link to={`/paket/${pkg.slug}`}>
                      <Button className="w-full font-semibold rounded-full" style={{ backgroundColor: tenant.primary_color, color: "white" }}>
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

      {/* ── About ─────────────────────────────────────────────────────────── */}
      {tenant.about_text && (
        <section id="about" className="py-14 sm:py-16">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-5" style={accentColor}>
              Tentang Kami
            </h2>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm sm:text-base">{tenant.about_text}</p>
          </div>
        </section>
      )}

      {/* ── Contact ───────────────────────────────────────────────────────── */}
      <section id="contact" className="py-14 sm:py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8" style={accentColor}>
            Hubungi Kami
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {tenant.phone && (
              <a href={`tel:${tenant.phone}`} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${tenant.primary_color}15` }}>
                  <Phone className="w-5 h-5" style={accentColor} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Telepon</div>
                  <div className="text-sm font-semibold">{tenant.phone}</div>
                </div>
              </a>
            )}
            {tenant.email && (
              <a href={`mailto:${tenant.email}`} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${tenant.primary_color}15` }}>
                  <Mail className="w-5 h-5" style={accentColor} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Email</div>
                  <div className="text-sm font-semibold">{tenant.email}</div>
                </div>
              </a>
            )}
            {tenant.whatsapp_number && (
              <a
                href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[#25D366]">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">WhatsApp</div>
                  <div className="text-sm font-semibold">{tenant.whatsapp_number}</div>
                </div>
              </a>
            )}
            {tenant.address && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${tenant.primary_color}15` }}>
                  <MapPin className="w-5 h-5" style={accentColor} />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Alamat</div>
                  <div className="text-sm">{tenant.address}</div>
                </div>
              </div>
            )}
          </div>

          {(tenant.instagram_url || tenant.facebook_url) && (
            <div className="flex justify-center gap-3 mt-8">
              {tenant.instagram_url && (
                <a href={tenant.instagram_url} target="_blank" rel="noopener noreferrer" className="p-3 rounded-full bg-card border border-border hover:shadow-md transition-shadow">
                  <Instagram className="w-5 h-5" style={accentColor} />
                </a>
              )}
              {tenant.facebook_url && (
                <a href={tenant.facebook_url} target="_blank" rel="noopener noreferrer" className="p-3 rounded-full bg-card border border-border hover:shadow-md transition-shadow">
                  <Facebook className="w-5 h-5" style={accentColor} />
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="py-8 text-white text-center text-sm" style={primaryStyle}>
        <p>© {new Date().getFullYear()} {tenant.site_name}. All rights reserved.</p>
        <p className="text-white/50 mt-1 text-xs">Powered by UmrohPlus</p>
      </footer>

      {/* ── Floating contact button ────────────────────────────────────────── */}
      <FloatingButtons fallbackWhatsapp={tenant.whatsapp_number || undefined} />
    </div>
  );
};

export default TenantClassicTemplate;
