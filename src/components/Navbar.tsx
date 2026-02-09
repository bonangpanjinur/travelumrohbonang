import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, User, LogOut, ChevronDown, LayoutDashboard, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  id: string;
  label: string;
  url: string;
  parent_id: string | null;
  sort_order: number;
  open_in_new_tab: boolean;
  children?: NavItem[];
}

interface BrandingSettings {
  logo_url: string;
  company_name: string;
  tagline: string;
  favicon_url: string;
  display_mode: "logo_only" | "text_only" | "both";
}

const defaultBranding: BrandingSettings = {
  logo_url: "",
  company_name: "UmrohPlus",
  tagline: "Travel & Tours",
  favicon_url: "",
  display_mode: "both",
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [branding, setBranding] = useState<BrandingSettings>(defaultBranding);
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

  useEffect(() => {
    const fetchNavItems = async () => {
      const { data } = await supabase
        .from("navigation_items")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (data) {
        const items = data as NavItem[];
        const parentItems = items.filter(item => !item.parent_id);
        const childItems = items.filter(item => item.parent_id);
        
        const hierarchy = parentItems.map(parent => ({
          ...parent,
          children: childItems.filter(child => child.parent_id === parent.id)
        }));
        
        setNavItems(hierarchy);
      }
    };

    const fetchBranding = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "branding")
        .eq("category", "general")
        .single();

      if (data?.value && typeof data.value === 'object') {
        setBranding({ ...defaultBranding, ...(data.value as object) });
      }
    };

    fetchNavItems();
    fetchBranding();
  }, []);

  const displayLinks = navItems.length > 0 ? navItems : [
    { id: "1", label: "Beranda", url: "/", parent_id: null, sort_order: 1, open_in_new_tab: false },
    { id: "2", label: "Paket Perjalanan", url: "/paket", parent_id: null, sort_order: 2, open_in_new_tab: false },
    { id: "3", label: "Galeri", url: "/galeri", parent_id: null, sort_order: 3, open_in_new_tab: false },
    { id: "4", label: "Blog", url: "/blog", parent_id: null, sort_order: 4, open_in_new_tab: false },
  ];

  const renderLogo = () => {
    const showLogo = branding.display_mode === "logo_only" || branding.display_mode === "both";
    const showText = branding.display_mode === "text_only" || branding.display_mode === "both";

    return (
      <Link to="/" className="flex items-center gap-2">
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
            <span className="font-display text-xl font-bold text-primary-foreground">
              {branding.company_name}
            </span>
            <span className="block text-[10px] text-gold-light tracking-widest uppercase -mt-1">
              {branding.tagline}
            </span>
          </div>
        )}
      </Link>
    );
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-md border-b border-emerald-light/20">
      <div className="container-custom flex items-center justify-between h-16 md:h-20 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        {renderLogo()}

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-1">
          {displayLinks.map((link) => (
            <div key={link.id} className="relative group">
              <Link
                to={link.url}
                target={link.open_in_new_tab ? "_blank" : undefined}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors inline-flex items-center gap-1 ${
                  location.pathname === link.url
                    ? "text-gold bg-emerald-light/30"
                    : "text-primary-foreground/80 hover:text-gold hover:bg-emerald-light/20"
                }`}
              >
                {link.label}
                {link.children && link.children.length > 0 && (
                  <ChevronDown className="w-3 h-3" />
                )}
              </Link>
              
              {link.children && link.children.length > 0 && (
                <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="bg-card border border-border rounded-lg shadow-xl py-2 min-w-[160px]">
                    {link.children.map((child) => (
                      <Link
                        key={child.id}
                        to={child.url}
                        target={child.open_in_new_tab ? "_blank" : undefined}
                        className="block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA - Simplified */}
        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 text-primary-foreground/80 hover:text-gold hover:bg-emerald-light/20">
                  <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-gold" />
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card border-border z-50">
                {isAdmin && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/my-bookings" className="flex items-center gap-2 cursor-pointer">
                    <Ticket className="w-4 h-4" />
                    Booking Saya
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => signOut()} 
                  className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
              {displayLinks.map((link) => (
                <div key={link.id}>
                  <Link
                    to={link.url}
                    onClick={() => setIsOpen(false)}
                    className="block px-4 py-3 text-sm font-medium text-primary-foreground/80 hover:text-gold hover:bg-emerald-light/20 rounded-lg transition-colors"
                  >
                    {link.label}
                  </Link>
                  {link.children && link.children.map((child) => (
                    <Link
                      key={child.id}
                      to={child.url}
                      onClick={() => setIsOpen(false)}
                      className="block px-8 py-2 text-sm text-primary-foreground/60 hover:text-gold"
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ))}
              
              {user && (
                <>
                  <div className="pt-4 border-t border-emerald-light/20 mt-2">
                    <p className="px-4 py-2 text-xs text-primary-foreground/40 uppercase tracking-wider">Akun</p>
                    {isAdmin && (
                      <Link 
                        to="/admin" 
                        onClick={() => setIsOpen(false)} 
                        className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-primary-foreground/80 hover:text-gold hover:bg-emerald-light/20 rounded-lg"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                      </Link>
                    )}
                    <Link 
                      to="/my-bookings" 
                      onClick={() => setIsOpen(false)} 
                      className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-primary-foreground/80 hover:text-gold hover:bg-emerald-light/20 rounded-lg"
                    >
                      <Ticket className="w-4 h-4" />
                      Booking Saya
                    </Link>
                  </div>
                  <div className="pt-2">
                    <Button 
                      onClick={() => { signOut(); setIsOpen(false); }} 
                      variant="ghost" 
                      className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="w-4 h-4" />
                      Keluar
                    </Button>
                  </div>
                </>
              )}
              
              {!user && (
                <div className="pt-4 border-t border-emerald-light/20">
                  <Link to="/auth" onClick={() => setIsOpen(false)}>
                    <Button className="w-full gradient-gold text-primary font-semibold">
                      Masuk / Daftar
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
