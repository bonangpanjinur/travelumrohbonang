import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, MessageCircle, Instagram, Facebook, Star, Clock, Users, ArrowRight, ChevronDown } from "lucide-react";
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

const TenantModernTemplate = ({ tenant, packages }: Props) => {
  const featuredPkgs = packages.filter((p) => p.is_featured);
  const regularPkgs = packages.filter((p) => !p.is_featured);

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Floating Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {tenant.logo_url && (
              <img src={tenant.logo_url} alt={tenant.site_name} className="h-9 w-auto object-contain" />
            )}
            <span className="font-bold text-lg" style={{ color: tenant.primary_color }}>{tenant.site_name}</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <a href="#packages" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Paket</a>
            <a href="#about" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Tentang</a>
            <a href="#contact" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors">Kontak</a>
            {tenant.whatsapp_number && (
              <a
                href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="sm" className="rounded-full font-semibold" style={{ backgroundColor: tenant.primary_color, color: "white" }}>
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  Hubungi
                </Button>
              </a>
            )}
          </div>
        </div>
      </nav>

      {/* Hero — Full-screen split */}
      <section className="relative min-h-[90vh] flex items-center pt-16">
        <div className="absolute inset-0 overflow-hidden">
          {tenant.hero_image_url && (
            <img src={tenant.hero_image_url} alt="" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${tenant.primary_color}ee 0%, ${tenant.primary_color}99 50%, transparent 100%)` }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6 bg-white/20 text-white backdrop-blur-sm">
              <Star className="w-3 h-3" /> Travel Umroh Terpercaya
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight tracking-tight">
              {tenant.hero_title || `${tenant.site_name}`}
            </h1>
            <p className="text-lg text-white/80 mb-8 max-w-lg leading-relaxed">
              {tenant.hero_subtitle || tenant.tagline || "Wujudkan perjalanan ibadah impian Anda bersama kami"}
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="#packages">
                <Button size="lg" className="rounded-full font-bold text-base px-8" style={{ backgroundColor: tenant.secondary_color, color: tenant.primary_color }}>
                  Lihat Paket <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </a>
              {tenant.whatsapp_number && (
                <a href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="rounded-full border-white/30 text-white hover:bg-white/10 font-semibold">
                    <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                  </Button>
                </a>
              )}
            </div>
          </div>
          <div className="hidden md:block" />
        </div>
        <a href="#packages" className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/60">
          <ChevronDown className="w-8 h-8" />
        </a>
      </section>

      {/* Stats bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto grid grid-cols-3 divide-x divide-gray-100">
          <div className="py-8 text-center">
            <div className="text-3xl font-bold" style={{ color: tenant.primary_color }}>{packages.length}+</div>
            <div className="text-sm text-gray-500 mt-1">Paket Tersedia</div>
          </div>
          <div className="py-8 text-center">
            <div className="text-3xl font-bold" style={{ color: tenant.primary_color }}>100%</div>
            <div className="text-sm text-gray-500 mt-1">Terpercaya</div>
          </div>
          <div className="py-8 text-center">
            <div className="text-3xl font-bold" style={{ color: tenant.primary_color }}>24/7</div>
            <div className="text-sm text-gray-500 mt-1">Layanan</div>
          </div>
        </div>
      </div>

      {/* Featured Packages */}
      {featuredPkgs.length > 0 && (
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-12">
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: tenant.secondary_color }}>Pilihan Terbaik</span>
              <h2 className="text-3xl md:text-4xl font-extrabold mt-2" style={{ color: tenant.primary_color }}>Paket Unggulan</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {featuredPkgs.map((pkg) => (
                <div key={pkg.id} className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
                  {pkg.image_url && (
                    <div className="h-56 overflow-hidden">
                      <img src={pkg.image_url} alt={pkg.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full text-white" style={{ backgroundColor: tenant.secondary_color }}>
                      <Star className="w-3 h-3" /> Unggulan
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2">{pkg.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                      {pkg.duration_days && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{pkg.duration_days} Hari</span>}
                      {pkg.package_type && <span className="flex items-center gap-1"><Users className="w-4 h-4" />{pkg.package_type}</span>}
                    </div>
                    {pkg.description && <p className="text-gray-500 text-sm line-clamp-2 mb-5">{pkg.description}</p>}
                    <Link to={`/paket/${pkg.slug}`}>
                      <Button className="w-full rounded-full font-bold" style={{ backgroundColor: tenant.primary_color, color: "white" }}>
                        Lihat Detail <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Packages */}
      <section id="packages" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: tenant.secondary_color }}>Pilihan Kami</span>
            <h2 className="text-3xl md:text-4xl font-extrabold mt-2" style={{ color: tenant.primary_color }}>Semua Paket</h2>
            <p className="text-gray-500 mt-3 max-w-lg mx-auto">Temukan paket umroh yang sesuai dengan kebutuhan dan budget Anda</p>
          </div>

          {packages.length === 0 ? (
            <p className="text-center text-gray-400 py-16 text-lg">Paket akan segera tersedia.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(featuredPkgs.length > 0 ? regularPkgs : packages).map((pkg) => (
                <Card key={pkg.id} className="group overflow-hidden rounded-2xl border-gray-100 hover:shadow-lg transition-all duration-300 bg-white">
                  {pkg.image_url && (
                    <div className="h-44 overflow-hidden">
                      <img src={pkg.image_url} alt={pkg.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <CardContent className="p-5">
                    <h3 className="font-bold text-lg mb-2">{pkg.title}</h3>
                    <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                      {pkg.duration_days && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{pkg.duration_days} Hari</span>}
                      {pkg.package_type && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{pkg.package_type}</span>}
                    </div>
                    {pkg.description && <p className="text-sm text-gray-500 line-clamp-3 mb-4">{pkg.description}</p>}
                    <Link to={`/paket/${pkg.slug}`}>
                      <Button className="w-full rounded-full font-semibold" variant="outline" style={{ borderColor: tenant.primary_color, color: tenant.primary_color }}>
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
        <section id="about" className="py-20 bg-gray-50">
          <div className="max-w-4xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-xs font-bold tracking-widest uppercase" style={{ color: tenant.secondary_color }}>Tentang Kami</span>
                <h2 className="text-3xl font-extrabold mt-2 mb-6" style={{ color: tenant.primary_color }}>
                  {tenant.site_name}
                </h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">{tenant.about_text}</p>
              </div>
              <div className="relative">
                <div className="w-full aspect-square rounded-3xl overflow-hidden shadow-2xl">
                  {tenant.hero_image_url ? (
                    <img src={tenant.hero_image_url} alt={tenant.site_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ backgroundColor: tenant.primary_color }} />
                  )}
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-2xl" style={{ backgroundColor: tenant.secondary_color, opacity: 0.3 }} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section id="contact" className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: tenant.secondary_color }}>Kontak</span>
            <h2 className="text-3xl font-extrabold mt-2" style={{ color: tenant.primary_color }}>Hubungi Kami</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {tenant.phone && (
              <a href={`tel:${tenant.phone}`} className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${tenant.primary_color}15` }}>
                  <Phone className="w-5 h-5" style={{ color: tenant.primary_color }} />
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-medium">Telepon</div>
                  <div className="text-sm font-semibold text-gray-800">{tenant.phone}</div>
                </div>
              </a>
            )}
            {tenant.email && (
              <a href={`mailto:${tenant.email}`} className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${tenant.primary_color}15` }}>
                  <Mail className="w-5 h-5" style={{ color: tenant.primary_color }} />
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-medium">Email</div>
                  <div className="text-sm font-semibold text-gray-800">{tenant.email}</div>
                </div>
              </a>
            )}
            {tenant.whatsapp_number && (
              <a href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${tenant.primary_color}15` }}>
                  <MessageCircle className="w-5 h-5" style={{ color: tenant.primary_color }} />
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-medium">WhatsApp</div>
                  <div className="text-sm font-semibold text-gray-800">{tenant.whatsapp_number}</div>
                </div>
              </a>
            )}
            {tenant.address && (
              <div className="flex items-start gap-4 p-5 rounded-2xl bg-gray-50">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${tenant.primary_color}15` }}>
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
            <div className="flex justify-center gap-3 mt-10">
              {tenant.instagram_url && (
                <a href={tenant.instagram_url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors">
                  <Instagram className="w-5 h-5 text-gray-700" />
                </a>
              )}
              {tenant.facebook_url && (
                <a href={tenant.facebook_url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors">
                  <Facebook className="w-5 h-5 text-gray-700" />
                </a>
              )}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      {tenant.whatsapp_number && (
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-6">
            <div className="rounded-3xl overflow-hidden relative p-12 md:p-16 text-center" style={{ backgroundColor: tenant.primary_color }}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
              <div className="relative">
                <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Siap Berangkat Umroh?</h2>
                <p className="text-white/70 max-w-md mx-auto mb-8">Hubungi kami sekarang untuk konsultasi gratis dan dapatkan penawaran terbaik</p>
                <a href={`https://wa.me/${tenant.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="rounded-full font-bold text-base px-10" style={{ backgroundColor: tenant.secondary_color, color: tenant.primary_color }}>
                    <MessageCircle className="w-5 h-5 mr-2" /> Chat Sekarang
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-10 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {tenant.logo_url && <img src={tenant.logo_url} alt="" className="h-6 w-auto opacity-50" />}
            <span className="text-sm text-gray-400">© {new Date().getFullYear()} {tenant.site_name}</span>
          </div>
          <span className="text-xs text-gray-300">Powered by UmrohPlus</span>
        </div>
      </footer>
    </div>
  );
};

export default TenantModernTemplate;
