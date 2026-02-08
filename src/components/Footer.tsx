import { MapPin, Phone, Mail, Instagram, Facebook, Youtube } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer id="kontak" className="bg-primary text-primary-foreground">
      <div className="container-custom section-padding pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center">
                <span className="font-display font-bold text-lg text-primary">U</span>
              </div>
              <div>
                <span className="font-display text-xl font-bold">UmrohPlus</span>
                <span className="block text-[10px] text-gold-light tracking-widest uppercase -mt-1">
                  Travel & Tours
                </span>
              </div>
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
              {["Beranda", "Paket Umroh", "Tentang Kami", "Galeri", "Blog"].map((item) => (
                <Link key={item} to="/" className="block text-sm text-primary-foreground/60 hover:text-gold transition-colors">
                  {item}
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
                  Jl. Raya Umroh No. 123, Jakarta Selatan 12345
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gold flex-shrink-0" />
                <span className="text-sm text-primary-foreground/60">0812-3456-7890</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gold flex-shrink-0" />
                <span className="text-sm text-primary-foreground/60">info@umrohplus.id</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-emerald-light/20 text-center text-sm text-primary-foreground/40">
          © 2025 UmrohPlus Travel & Tours. Seluruh hak dilindungi.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
