import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

const navLinks = [
  { label: "Beranda", href: "/" },
  { label: "Paket Umroh", href: "/paket" },
  { label: "Tentang Kami", href: "/#tentang" },
  { label: "Galeri", href: "/#galeri" },
  { label: "Kontak", href: "/#kontak" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-md border-b border-emerald-light/20">
      <div className="container-custom flex items-center justify-between h-16 md:h-20 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center">
            <span className="font-display font-bold text-lg text-primary">U</span>
          </div>
          <div>
            <span className="font-display text-xl font-bold text-primary-foreground">
              UmrohPlus
            </span>
            <span className="block text-[10px] text-gold-light tracking-widest uppercase -mt-1">
              Travel & Tours
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                location.pathname === link.href
                  ? "text-gold bg-emerald-light/30"
                  : "text-primary-foreground/80 hover:text-gold hover:bg-emerald-light/20"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <a href="tel:+6281234567890" className="flex items-center gap-2 text-sm text-gold">
            <Phone className="w-4 h-4" />
            <span>0812-3456-7890</span>
          </a>
          {user ? (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="ghost" size="sm" className="text-gold-light hover:text-gold">
                    Admin
                  </Button>
                </Link>
              )}
              <Link to="/my-bookings">
                <Button variant="ghost" size="sm" className="text-primary-foreground/80 hover:text-gold">
                  <User className="w-4 h-4 mr-1" /> Booking Saya
                </Button>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => signOut()} className="text-primary-foreground/60 hover:text-destructive">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Link to="/auth">
              <Button className="gradient-gold text-primary font-semibold hover:opacity-90 transition-opacity">
                Masuk / Daftar
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden text-primary-foreground p-2"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-primary border-t border-emerald-light/20 overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-primary-foreground/80 hover:text-gold hover:bg-emerald-light/20 rounded-lg transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              {user && (
                <>
                  <Link to="/my-bookings" onClick={() => setIsOpen(false)} className="block px-4 py-3 text-sm font-medium text-gold">
                    Booking Saya
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setIsOpen(false)} className="block px-4 py-3 text-sm font-medium text-gold">
                      Admin Dashboard
                    </Link>
                  )}
                </>
              )}
              <div className="pt-4 border-t border-emerald-light/20">
                {user ? (
                  <Button onClick={() => { signOut(); setIsOpen(false); }} variant="outline" className="w-full border-destructive/50 text-destructive">
                    <LogOut className="w-4 h-4 mr-2" /> Keluar
                  </Button>
                ) : (
                  <Link to="/auth" onClick={() => setIsOpen(false)}>
                    <Button className="w-full gradient-gold text-primary font-semibold">
                      Masuk / Daftar
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
