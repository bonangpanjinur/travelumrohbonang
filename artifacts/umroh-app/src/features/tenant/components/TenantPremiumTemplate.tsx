import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, Mail, MapPin, MessageCircle, Instagram, Facebook,
  Star, Clock, Users, ArrowRight, Sparkles, Shield, Heart, Menu, X,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
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
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0, 0, 0.2, 1] as const },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: (i: number = 0) => ({
    opacity: 1, scale: 1,
    transition: { delay: i * 0.12, duration: 0.5, ease: [0, 0, 0.2, 1] as const },
  }),
};

const TenantPremiumTemplate = ({ tenant, packages }: Props) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const featuredPkgs = packages.filter((p) => p.is_featured);
  const regularPkgs = packages.filter((p) => !p.is_featured);
  const allRegular = featuredPkgs.length > 0 ? regularPkgs : packages;

  const navLinks = [
    { href: "#packages", label: "Paket" },
    { href: "#about", label: "Tentang" },
    { href: "#contact", label: "Kontak" },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans overflow-x-hidden">

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50"
      >
        <div className="mx-3 sm:mx-4 mt-3 rounded-2xl bg-white/75 backdrop-blur-xl shadow-lg shadow-black/5 border border-white/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-2.5 min-w-0">
              {tenant.logo_url && (
                <img src={tenant.logo_url} alt={tenant.site_name} className="h-7 w-auto object-contain shrink-0" />
              )}
              <span className="font-bold text-sm sm:text-base truncate" style={{ color: tenant.primary_color }}>
                {tenant.site_name}
              </span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((l) => (
                <a key={l.href} href={l.href} className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">
                  {l.label}
                </a>
              ))}
              {tenant.whatsapp_number && (
                <a href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" className="rounded-full font-semibold shadow-md" style={{ backgroundColor: tenant.primary_color, color: "white" }}>
                    <MessageCircle className="w-4 h-4 mr-1.5" /> Hubungi
                  </Button>
                </a>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="md:hidden mx-3 mt-1 rounded-2xl bg-white/95 backdrop-blur-xl shadow-xl border border-gray-100 overflow-hidden"
            >
              <div className="flex flex-col px-5 py-4 gap-1">
                {navLinks.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-gray-700 font-medium py-3 px-3 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    {l.label}
                  </a>
                ))}
                {tenant.whatsapp_number && (
                  <a
                    href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={() => setMobileOpen(false)}
                    className="mt-2 flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-3 rounded-xl shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" /> Chat WhatsApp
                  </a>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ── Hero — cinematic full-bleed ─────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0">
          {tenant.hero_image_url ? (
            <motion.img
              initial={{ scale: 1.12 }}
              animate={{ scale: 1 }}
              transition={{ duration: 8, ease: "easeOut" }}
              src={tenant.hero_image_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full" style={{ backgroundColor: tenant.primary_color }} />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 30% 50%, ${tenant.primary_color}dd 0%, ${tenant.primary_color}88 40%, transparent 70%), linear-gradient(to top, ${tenant.primary_color}cc 0%, transparent 55%)`,
            }}
          />
        </div>

        {/* Decorative orbs */}
        <div className="absolute top-24 right-[10%] sm:right-[15%] w-48 sm:w-64 h-48 sm:h-64 rounded-full opacity-20 blur-3xl animate-pulse" style={{ backgroundColor: tenant.secondary_color }} />
        <div className="absolute bottom-24 left-[5%] sm:left-[10%] w-36 sm:w-48 h-36 sm:h-48 rounded-full opacity-15 blur-3xl animate-pulse" style={{ backgroundColor: tenant.secondary_color, animationDelay: "2s" }} />

        <div className="relative text-center px-5 sm:px-6 max-w-4xl mx-auto">
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-6 sm:mb-8 border border-white/20 bg-white/10 text-white backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" /> Premium Travel Experience
            </span>
          </motion.div>
          <motion.h1
            variants={fadeUp} initial="hidden" animate="visible" custom={1}
            className="text-3xl sm:text-5xl md:text-7xl font-extrabold text-white mb-5 sm:mb-6 leading-[1.1] tracking-tight"
          >
            {tenant.hero_title || tenant.site_name}
          </motion.h1>
          <motion.p
            variants={fadeUp} initial="hidden" animate="visible" custom={2}
            className="text-sm sm:text-base md:text-xl text-white/70 max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed"
          >
            {tenant.hero_subtitle || tenant.tagline || "Wujudkan perjalanan ibadah impian Anda dengan layanan eksklusif"}
          </motion.p>
          <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3} className="flex flex-wrap justify-center gap-3 sm:gap-4">
            <a href="#packages">
              <Button size="lg" className="rounded-full font-bold px-8 sm:px-10 shadow-xl shadow-black/20 hover:shadow-2xl transition-shadow" style={{ backgroundColor: tenant.secondary_color, color: tenant.primary_color }}>
                Jelajahi Paket <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
            {tenant.whatsapp_number && (
              <a href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="rounded-full border-white/30 text-white hover:bg-white/10 font-semibold backdrop-blur-sm">
                  <MessageCircle className="w-4 h-4 mr-2" /> Konsultasi Gratis
                </Button>
              </a>
            )}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 sm:bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/30 flex justify-center pt-2">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-white/60"
            />
          </div>
        </motion.div>
      </section>

      {/* ── Trust badges ─────────────────────────────────────────────────── */}
      <section className="py-12 sm:py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <motion.div
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="grid grid-cols-3 gap-4 sm:gap-8"
          >
            {[
              { icon: Shield, label: "Terpercaya", desc: "Legalitas resmi & PPIU" },
              { icon: Users, label: `${packages.length}+ Paket`, desc: "Pilihan lengkap" },
              { icon: Heart, label: "24/7 Support", desc: "Selalu siap melayani" },
            ].map((item, i) => (
              <motion.div key={i} variants={scaleIn} custom={i} className="text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-sm" style={{ backgroundColor: `${tenant.primary_color}10` }}>
                  <item.icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: tenant.primary_color }} />
                </div>
                <div className="font-bold text-xs sm:text-sm">{item.label}</div>
                <div className="text-xs text-gray-400 mt-0.5 hidden sm:block">{item.desc}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Featured — large cards ───────────────────────────────────────── */}
      {featuredPkgs.length > 0 && (
        <section className="py-16 sm:py-20 bg-[#fafafa]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10 sm:mb-14">
              <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: tenant.secondary_color }}>★ Rekomendasi</span>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold mt-3 tracking-tight" style={{ color: tenant.primary_color }}>
                Paket Unggulan
              </h2>
            </motion.div>
            <div className="grid sm:grid-cols-2 gap-6 sm:gap-8">
              {featuredPkgs.map((pkg, i) => (
                <motion.div
                  key={pkg.id}
                  variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i}
                  className="group relative bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500"
                >
                  {pkg.image_url ? (
                    <div className="h-52 sm:h-64 overflow-hidden relative">
                      <img src={pkg.image_url} alt={pkg.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </div>
                  ) : (
                    <div className="h-36 sm:h-44" style={{ backgroundColor: `${tenant.primary_color}20` }} />
                  )}
                  <div className="absolute top-5 left-5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full text-white shadow-lg" style={{ backgroundColor: tenant.secondary_color }}>
                      <Star className="w-3 h-3" /> Unggulan
                    </span>
                  </div>
                  <div className="p-5 sm:p-7">
                    <h3 className="text-lg sm:text-xl font-bold mb-2">{pkg.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-4">
                      {pkg.duration_days && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{pkg.duration_days} Hari</span>}
                      {pkg.package_type && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: `${tenant.primary_color}15`, color: tenant.primary_color }}>
                          {pkg.package_type}
                        </span>
                      )}
                    </div>
                    {pkg.description && <p className="text-gray-500 text-sm line-clamp-2 mb-5">{pkg.description}</p>}
                    <Link to={`/paket/${pkg.slug}`}>
                      <Button className="w-full rounded-full font-bold shadow-md hover:shadow-lg transition-shadow" style={{ backgroundColor: tenant.primary_color, color: "white" }}>
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
      <section id="packages" className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10 sm:mb-14">
            <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: tenant.secondary_color }}>Koleksi Lengkap</span>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold mt-3 tracking-tight" style={{ color: tenant.primary_color }}>
              {featuredPkgs.length > 0 ? "Paket Lainnya" : "Semua Paket"}
            </h2>
            <p className="text-gray-400 mt-3 sm:mt-4 max-w-lg mx-auto text-sm sm:text-base">
              Temukan pengalaman perjalanan ibadah yang sesuai dengan Anda
            </p>
          </motion.div>

          {packages.length === 0 ? (
            <p className="text-center text-gray-300 py-20 text-lg">Paket akan segera hadir.</p>
          ) : allRegular.length === 0 ? null : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
              {allRegular.map((pkg, i) => (
                <motion.div
                  key={pkg.id}
                  variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }} custom={i % 3}
                  className="group bg-[#fafafa] rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-500 border border-gray-100"
                >
                  {pkg.image_url ? (
                    <div className="h-44 sm:h-48 overflow-hidden">
                      <img src={pkg.image_url} alt={pkg.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    </div>
                  ) : (
                    <div className="h-28 sm:h-32" style={{ backgroundColor: `${tenant.primary_color}10` }} />
                  )}
                  <div className="p-4 sm:p-5">
                    <h3 className="font-bold text-base sm:text-lg mb-2">{pkg.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400 mb-3">
                      {pkg.duration_days && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{pkg.duration_days} Hari</span>}
                      {pkg.package_type && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: `${tenant.primary_color}12`, color: tenant.primary_color }}>
                          {pkg.package_type}
                        </span>
                      )}
                    </div>
                    {pkg.description && <p className="text-sm text-gray-400 line-clamp-3 mb-4">{pkg.description}</p>}
                    <Link to={`/paket/${pkg.slug}`}>
                      <Button className="w-full rounded-full font-semibold" variant="outline" style={{ borderColor: tenant.primary_color, color: tenant.primary_color }}>
                        Detail & Booking
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── About ─────────────────────────────────────────────────────────── */}
      {tenant.about_text && (
        <section id="about" className="py-16 sm:py-24 bg-[#fafafa]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid md:grid-cols-5 gap-10 sm:gap-12 items-center">
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="md:col-span-3">
                <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: tenant.secondary_color }}>Kenali Kami</span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mt-3 mb-6 sm:mb-8 tracking-tight" style={{ color: tenant.primary_color }}>
                  {tenant.site_name}
                </h2>
                <p className="text-gray-500 leading-[1.9] whitespace-pre-line text-sm sm:text-base">{tenant.about_text}</p>
              </motion.div>
              <motion.div
                variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }}
                className="md:col-span-2 relative hidden md:block"
              >
                <div className="aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl">
                  {tenant.hero_image_url ? (
                    <img src={tenant.hero_image_url} alt={tenant.site_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ backgroundColor: tenant.primary_color }} />
                  )}
                </div>
                <div className="absolute -bottom-6 -left-6 w-28 h-28 rounded-2xl -z-10 opacity-20" style={{ backgroundColor: tenant.secondary_color }} />
                <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full -z-10 opacity-15" style={{ backgroundColor: tenant.primary_color }} />
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* ── Contact ───────────────────────────────────────────────────────── */}
      <section id="contact" className="py-16 sm:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-10 sm:mb-14">
            <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: tenant.secondary_color }}>Kontak</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mt-3 tracking-tight" style={{ color: tenant.primary_color }}>
              Hubungi Kami
            </h2>
          </motion.div>
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {[
              tenant.phone && { icon: Phone, label: "Telepon", value: tenant.phone, href: `tel:${tenant.phone}` },
              tenant.email && { icon: Mail, label: "Email", value: tenant.email, href: `mailto:${tenant.email}` },
              tenant.whatsapp_number && { icon: MessageCircle, label: "WhatsApp", value: tenant.whatsapp_number, href: `https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}` },
              tenant.address && { icon: MapPin, label: "Alamat", value: tenant.address },
            ]
              .filter(Boolean)
              .map((item: any, i) => {
                const Wrapper = item.href ? "a" : "div";
                const wrapperProps = item.href
                  ? { href: item.href, target: item.href.startsWith("http") ? "_blank" : undefined, rel: item.href.startsWith("http") ? "noopener noreferrer" : undefined }
                  : {};
                return (
                  <motion.div key={i} variants={scaleIn} custom={i}>
                    <Wrapper
                      {...wrapperProps}
                      className="flex items-center gap-4 p-5 sm:p-6 rounded-2xl bg-[#fafafa] hover:shadow-lg transition-all duration-300 border border-gray-100 group"
                    >
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:shadow-md transition-shadow" style={{ backgroundColor: `${tenant.primary_color}10` }}>
                        <item.icon className="w-5 h-5" style={{ color: tenant.primary_color }} />
                      </div>
                      <div>
                        <div className="text-[10px] sm:text-[11px] text-gray-400 font-semibold uppercase tracking-wider">{item.label}</div>
                        <div className="text-sm font-semibold text-gray-700 mt-0.5">{item.value}</div>
                      </div>
                    </Wrapper>
                  </motion.div>
                );
              })}
          </motion.div>

          {(tenant.instagram_url || tenant.facebook_url) && (
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="flex justify-center gap-3 mt-10 sm:mt-12">
              {tenant.instagram_url && (
                <a href={tenant.instagram_url} target="_blank" rel="noopener noreferrer" className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-[#fafafa] border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <Instagram className="w-5 h-5 text-gray-600" />
                </a>
              )}
              {tenant.facebook_url && (
                <a href={tenant.facebook_url} target="_blank" rel="noopener noreferrer" className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-[#fafafa] border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                  <Facebook className="w-5 h-5 text-gray-600" />
                </a>
              )}
            </motion.div>
          )}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      {tenant.whatsapp_number && (
        <section className="py-16 sm:py-24 bg-[#fafafa]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <motion.div
              variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="relative rounded-[2rem] overflow-hidden p-10 sm:p-14 md:p-20 text-center"
              style={{ backgroundColor: tenant.primary_color }}
            >
              <div className="absolute inset-0 opacity-30" style={{
                background: `radial-gradient(circle at 20% 50%, ${tenant.secondary_color} 0%, transparent 50%), radial-gradient(circle at 80% 50%, ${tenant.secondary_color} 0%, transparent 50%)`,
              }} />
              <div className="relative">
                <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                  <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-white/40 mx-auto mb-5 sm:mb-6" />
                  <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white mb-4 sm:mb-5 tracking-tight">
                    Siap Memulai Perjalanan?
                  </h2>
                  <p className="text-white/60 max-w-md mx-auto mb-8 sm:mb-10 text-sm sm:text-lg">
                    Hubungi kami untuk konsultasi pribadi dan penawaran eksklusif
                  </p>
                  <a href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                    <Button size="lg" className="rounded-full font-bold px-10 sm:px-12 shadow-2xl hover:shadow-3xl transition-shadow" style={{ backgroundColor: tenant.secondary_color, color: tenant.primary_color }}>
                      <MessageCircle className="w-5 h-5 mr-2" /> Mulai Konsultasi
                    </Button>
                  </a>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="py-10 sm:py-12 bg-white border-t border-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            {tenant.logo_url && <img src={tenant.logo_url} alt="" className="h-6 w-auto opacity-40" />}
            <span className="text-sm text-gray-300">© {new Date().getFullYear()} {tenant.site_name}</span>
          </div>
          <span className="text-xs text-gray-200">Powered by UmrohPlus</span>
        </div>
      </footer>

      {/* ── Floating contact button ────────────────────────────────────────── */}
      <FloatingButtons fallbackWhatsapp={tenant.whatsapp_number || undefined} />
    </div>
  );
};

export default TenantPremiumTemplate;
