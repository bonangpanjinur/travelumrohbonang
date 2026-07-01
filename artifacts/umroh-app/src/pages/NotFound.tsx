import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Package, Phone } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import SEO from "@/shared/components/seo/SEO";
import { useTenant } from "@/shared/hooks/useTenant";

const NotFound = () => {
  const location = useLocation();
  const { tenant } = useTenant();

  const brandName = tenant?.site_name ?? "Sistem Travel Umroh";
  const whatsapp = tenant?.whatsapp_number;
  const primaryColor = tenant?.primary_color ?? "#7c1d1d";
  const accentColor = "#D4AF37";

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <>
      <SEO
        title="404 — Halaman Tidak Ditemukan"
        description="Halaman yang Anda cari tidak tersedia atau telah dipindahkan."
        noIndex
      />

      <div className="relative min-h-screen flex flex-col items-center justify-center bg-background overflow-hidden px-4">
        {/* Decorative background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              ${primaryColor} 0px,
              ${primaryColor} 1px,
              transparent 1px,
              transparent 60px
            )`,
          }}
        />

        {/* Top brand bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: `linear-gradient(90deg, ${primaryColor}, ${accentColor}, ${primaryColor})` }}
        />

        <div className="relative z-10 flex flex-col items-center text-center max-w-lg w-full">
          {/* 404 large number */}
          <div className="relative select-none mb-2">
            <span
              className="text-[10rem] leading-none font-black tracking-tighter"
              style={{
                fontFamily: "'Playfair Display', serif",
                color: "transparent",
                WebkitTextStroke: `2px ${accentColor}`,
                opacity: 0.25,
              }}
            >
              404
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-5xl font-bold tracking-tight"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  color: primaryColor,
                }}
              >
                404
              </span>
            </div>
          </div>

          {/* Gold divider */}
          <div
            className="w-16 h-0.5 rounded-full mb-6"
            style={{ background: accentColor }}
          />

          {/* Message */}
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Halaman Tidak Ditemukan
          </h1>
          <p className="text-muted-foreground mb-2">
            Maaf, halaman{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
              {location.pathname}
            </code>{" "}
            tidak tersedia atau telah dipindahkan.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Gunakan menu di bawah untuk kembali ke halaman yang tepat.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center">
            <Button
              asChild
              variant="outline"
              className="gap-2"
            >
              <Link to={-1 as never}>
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Link>
            </Button>

            <Button
              asChild
              className="gap-2 text-white"
              style={{ background: primaryColor }}
            >
              <Link to="/">
                <Home className="h-4 w-4" />
                Ke Beranda
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="gap-2 border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
            >
              <Link to="/paket">
                <Package className="h-4 w-4" />
                Lihat Paket
              </Link>
            </Button>
          </div>

          {/* WhatsApp contact — only shown if tenant has a number */}
          {whatsapp && (
            <a
              href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Phone className="h-4 w-4" />
              Butuh bantuan? Hubungi kami via WhatsApp
            </a>
          )}
        </div>

        {/* Footer brand */}
        <div className="absolute bottom-6 text-xs text-muted-foreground/60">
          &copy; {new Date().getFullYear()} {brandName}. All rights reserved.
        </div>
      </div>
    </>
  );
};

export default NotFound;
