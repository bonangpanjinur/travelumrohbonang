import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, Mail, MapPin, MessageCircle, Instagram, Facebook,
  Star, Clock, Users, ArrowRight, ChevronDown, Menu, X, Shield, HeartHandshake,
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

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.09, duration: 0.55, ease: [0, 0, 0.2, 1] as const },
  }),
};

const TenantModernTemplate = ({ tenant, packages }: Props) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const featuredPkgs = packages.filter((p) => p.is_featured);
  const regularPkgs = packages.filter((p) => !p.is_featured);
  const displayRegular = featuredPkgs.length > 0 ? regularPkgs : packages;

  const navLinks = [
    { href: "#packages", label: "Paket" },
    { href: "#about", label: "Tentang" },
    { href: "#contact", label: "Kontak" },
  ];

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2.5 min-w-0">
            {tenant.logo_url && (
              <img src={tenant.logo_url} alt={tenant.site_name} className="h-8 w-auto object-contain shrink-0" />
            )}
            <span className="font-bold text-base truncate" style={{ color: tenant.primary_color }}>
              {tenant.site_name}
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">
                {l.label}
              </a>
            ))}
            {tenant.whatsapp_number && (
              <a href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="rounded-full font-semibold shadow-sm" style={{ backgroundColor: tenant.primary_color, color: "white" }}>
                  <MessageCircle className="w-4 h-4 mr-1.5" /> Hubungi
                </Button>
              </a>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
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
              className="md:hidden overflow-hidden border-t border-gray-100 bg-white"
            >
              <div className="flex flex-col px-5 py-4 gap-1">
                {navLinks.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-gray-700 font-medium py-3 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {l.label}
                  </a>
                ))}
                {tenant.whatsapp_number && (
                  <a
                    href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
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
      <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center pt-16">
        <div className="absolute inset-0 overflow-hidden">
          {tenant.hero_image_url ? (
            <img src={tenant.hero_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ backgroundColor: tenant.primary_color }} />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${tenant.primary_color}f0 0%, ${tenant.primary_color}99 55%, ${tenant.primary_color}44 100%)`,
            }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-5 bg-white/20 text-white backdrop-blur-sm">
              <Star className="w-3 h-3" /> Travel Umroh Terpercaya
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white mb-5 leading-tight tracking-tight max-w-2xl"
          >
            {tenant.hero_title || tenant.site_name}
          </motion.h1>
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-base sm:text-lg text-white/80 mb-8 max-w-lg leading-relaxed"
          >
            {tenant.hero_subtitle || tenant.tagline || "Wujudkan perjalanan ibadah impian Anda bersama kami"}
          </motion.p>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="flex flex-wrap gap-3">
            <a href="#packages">
              <Button size="lg" className="rounded-full font-bold px-7" style={{ backgroundColor: tenant.secondary_color, color: tenant.primary_color }}>
                Lihat Paket <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
            {tenant.whatsapp_number && (
              <a href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="rounded-full border-white/40 text-white hover:bg-white/10 font-semibold">
                  <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                </Button>
              </a>
            )}
          </motion.div>
        </div>
        <a href="#packages" className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce text-white/50">
          <ChevronDown className="w-7 h-7" />
        </a>
      </section>

      {/* ── Trust strip ──────────────────────────────────────────────────── */}
      <div className="bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto grid grid-cols-3 divide-x divide-gray-100">
          {[
            { Icon: Star, value: `${packages.length}+`, label: "Paket Tersedia" },
            { Icon: Shield, value: "100%", label: "Terpercaya & Legal" },
            { Icon: HeartHandshake, value: "24/7", label: "Layanan Konsultasi" },
          ].map(({ Icon, value, label }, i) => (
            <div key={i} className="py-6 sm:py-8 text-center px-2">
              <div className="text-2xl sm:text-3xl font-extrabold" style={{ color: tenant.primary_color }}>{value}</div>
              <div className="text-xs sm:text-sm text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Featured Packages ─────────────────────────────────────────────── */}
      {featuredPkgs.length > 0 && (
        <section className="py-16 sm:py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10 sm:mb-12">
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: tenant.secondary_color }}>
                Pilihan Terbaik
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mt-2" style={{ color: tenant.primary_color }}>
                Paket Unggulan
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
              {featuredPkgs.map((pkg, i) => (
                <motion.div
                  key={pkg.id}
                  variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
                  className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
                >
                  {pkg.image_url ? (
                    <div className="h-48 sm:h-56 overflow-hidden">
                      <img src={pkg.image_url} alt={pkg.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  ) : (
                    <div className="h-32 sm:h-40" style={{ backgroundColor: `${tenant.primary_color}15` }} />
                  )}
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full text-white shadow" style={{ backgroundColor: tenant.secondary_color }}>
                      <Star className="w-3 h-3" /> Unggulan
                    </span>
                  </div>
                  <div className="p-5 sm:p-6">
                    <h3 className="text-lg sm:text-xl font-bold mb-2">{pkg.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-3">
                      {pkg.duration_days && (
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{pkg.duration_days} Hari</span>
                      )}
                      {pkg.package_type && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: `${tenant.primary_color}15`, color: tenant.primary_color }}>
                          {pkg.package_type}
                        </span>
                      )}
                    </div>
                    {pkg.description && <p className="text-gray-500 text-sm line-clamp-2 mb-4">{pkg.description}</p>}
                    <Link to={`/paket/${pkg.slug}`}>
                      <Button className="w-full rounded-full font-bold" style={{ backgroundColor: tenant.primary_color, color: "white" }}>
                        Lihat Detail <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── All Packages ─────────────────────────────────────────────────── */}
      <section id="packages" className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: tenant.secondary_color }}>
              Pilihan Kami
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mt-2" style={{ color: tenant.primary_color }}>
              {featuredPkgs.length > 0 ? "Paket Lainnya" : "Semua Paket"}
            </h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto text-sm sm:text-base">
              Temukan paket umroh yang sesuai dengan kebutuhan dan budget Anda
            </p>
          </div>

          {packages.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">Paket akan segera tersedia.</p>
            </div>
          ) : displayRegular.length === 0 ? null : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {displayRegular.map((pkg, i) => (
                <motion.div
                  key={pkg.id}
                  variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i % 3}
                >
                  <Card className="group h-full overflow-hidden rounded-2xl border-gray-100 hover:shadow-lg transition-all duration-300 bg-white">
                    {pkg.image_url ? (
                      <div className="h-40 sm:h-44 overflow-hidden">
                        <img src={pkg.image_url} alt={pkg.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    ) : (
                      <div className="h-28 sm:h-32" style={{ backgroundColor: `${tenant.primary_color}10` }} />
                    )}
                    <CardContent className="p-4 sm:p-5 flex flex-col h-full">
                      <h3 className="font-bold text-base sm:text-lg mb-2">{pkg.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 mb-3">
                        {pkg.duration_days && (
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{pkg.duration_days} Hari</span>
                        )}
                        {pkg.package_type && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: `${tenant.primary_color}12`, color: tenant.primary_color }}>
                            {pkg.package_type}
                          </span>
                        )}
                      </div>
                      {pkg.description && <p className="text-sm text-gray-500 line-clamp-3 mb-4 flex-1">{pkg.description}</p>}
                      <Link to={`/paket/${pkg.slug}`}>
                        <Button className="w-full rounded-full font-semibold" variant="outline" style={{ borderColor: tenant.primary_color, color: tenant.primary_color }}>
                          Detail & Booking
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── About ─────────────────────────────────────────────────────────── */}
      {tenant.about_text && (
        <section id="about" className="py-16 sm:py-20 bg-gray-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="grid md:grid-cols-2 gap-10 sm:gap-14 items-center">
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <span className="text-xs font-bold tracking-widest uppercase" style={{ color: tenant.secondary_color }}>
                  Tentang Kami
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold mt-2 mb-5" style={{ color: tenant.primary_color }}>
                  {tenant.site_name}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line text-sm sm:text-base">{tenant.about_text}</p>
              </motion.div>
              <motion.div
                variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={1}
                className="relative hidden md:block"
              >
                <div className="w-full aspect-square rounded-3xl overflow-hidden shadow-2xl">
                  {tenant.hero_image_url ? (
                    <img src={tenant.hero_image_url} alt={tenant.site_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ backgroundColor: tenant.primary_color }} />
                  )}
                </div>
                <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-2xl opacity-25" style={{ backgroundColor: tenant.secondary_color }} />
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* ── Contact ───────────────────────────────────────────────────────── */}
      <section id="contact" className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: tenant.secondary_color }}>Kontak</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold mt-2" style={{ color: tenant.primary_color }}>Hubungi Kami</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {tenant.phone && (
              <a href={`tel:${tenant.phone}`} className="flex items-center gap-4 p-4 sm:p-5 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${tenant.primary_color}15` }}>
                  <Phone className="w-5 h-5" style={{ color: tenant.primary_color }} />
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-medium">Telepon</div>
                  <div className="text-sm font-semibold text-gray-800">{tenant.phone}</div>
                </div>
              </a>
            )}
            {tenant.email && (
              <a href={`mailto:${tenant.email}`} className="flex items-center gap-4 p-4 sm:p-5 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${tenant.primary_color}15` }}>
                  <Mail className="w-5 h-5" style={{ color: tenant.primary_color }} />
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-medium">Email</div>
                  <div className="text-sm font-semibold text-gray-800">{tenant.email}</div>
                </div>
              </a>
            )}
            {tenant.whatsapp_number && (
              <a
                href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 sm:p-5 rounded-2xl bg-[#25D366]/10 hover:bg-[#25D366]/15 transition-colors border border-[#25D366]/20"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-[#25D366]">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-medium">WhatsApp</div>
                  <div className="text-sm font-semibold text-gray-800">{tenant.whatsapp_number}</div>
                </div>
              </a>
            )}
            {tenant.address && (
              <div className="flex items-start gap-4 p-4 sm:p-5 rounded-2xl bg-gray-50">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${tenant.primary_color}15` }}>
                  <MapPin className="w-5 h-5" style={{ color: tenant.primary_color }} />
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-medium">Alamat</div>
                  <div className="text-sm font-semibold text-gray-800">{tenant.address}</div>
                </div>
              </div>
            )}
          </div>

          {(tenant.instagram_url || tenant.facebook_url) && (
            <div className="flex justify-center gap-3 mt-8 sm:mt-10">
              {tenant.instagram_url && (
                <a href={tenant.instagram_url} target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors">
                  <Instagram className="w-5 h-5 text-gray-600" />
                </a>
              )}
              {tenant.facebook_url && (
                <a href={tenant.facebook_url} target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors">
                  <Facebook className="w-5 h-5 text-gray-600" />
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      {tenant.whatsapp_number && (
        <section className="py-16 sm:py-20 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="rounded-3xl overflow-hidden relative p-8 sm:p-12 md:p-16 text-center" style={{ backgroundColor: tenant.primary_color }}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
              <div className="relative">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-4">Siap Berangkat Umroh?</h2>
                <p className="text-white/70 max-w-md mx-auto mb-8 text-sm sm:text-base">Hubungi kami sekarang untuk konsultasi gratis dan dapatkan penawaran terbaik</p>
                <a href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="rounded-full font-bold px-8 sm:px-10" style={{ backgroundColor: tenant.secondary_color, color: tenant.primary_color }}>
                    <MessageCircle className="w-5 h-5 mr-2" /> Chat Sekarang
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="py-8 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            {tenant.logo_url && <img src={tenant.logo_url} alt="" className="h-5 w-auto opacity-40" />}
            <span className="text-sm text-gray-400">© {new Date().getFullYear()} {tenant.site_name}</span>
          </div>
          <span className="text-xs text-gray-300">Powered by UmrohPlus</span>
        </div>
      </footer>

      {/* ── Floating contact button ────────────────────────────────────────── */}
      <FloatingButtons fallbackWhatsapp={tenant.whatsapp_number || undefined} />
    </div>
  );
};

export default TenantModernTemplate;
