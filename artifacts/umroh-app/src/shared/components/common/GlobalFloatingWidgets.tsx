/**
 * GlobalFloatingWidgets
 *
 * Renders two coordinated right-side floating widgets on every public page:
 *
 * 1. Scroll-to-top button  — appears after scrolling 400 px down, sits ABOVE
 *    the contact buttons so they never overlap.
 * 2. Contact / WhatsApp buttons — the existing CMS-driven FloatingButtons,
 *    anchored to the bottom-right corner.
 *
 * Hidden automatically on /admin/* routes.
 */
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import GuestChatWidget from "@/shared/components/chat/GuestChatWidget";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  MessageCircle,
  Instagram,
  Facebook,
  Music2,
  Youtube,
  Send,
  Phone,
  X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FloatingButton {
  id: string;
  platform: string;
  label: string;
  url: string;
  icon: string;
  isActive: boolean;
  sortOrder: number;
}

// ── Lookup tables ─────────────────────────────────────────────────────────────

const iconMap: Record<string, React.ElementType> = {
  MessageCircle,
  Instagram,
  Facebook,
  Music2,
  Youtube,
  Send,
};

const bgClass: Record<string, string> = {
  whatsapp:  "bg-[#25D366] hover:bg-[#1ead58]",
  instagram: "bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 hover:opacity-90",
  facebook:  "bg-[#1877F2] hover:bg-[#1464cf]",
  tiktok:    "bg-neutral-900 hover:bg-black",
  youtube:   "bg-red-600 hover:bg-red-700",
  telegram:  "bg-sky-500 hover:bg-sky-600",
};

// ── Hook: track scroll position ───────────────────────────────────────────────

function useScrollY(threshold = 400) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return past;
}

// ── Main component ────────────────────────────────────────────────────────────

const GlobalFloatingWidgets = () => {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const showScrollTop = useScrollY(400);

  // Hide entirely on admin and auth pages
  if (pathname.startsWith("/admin") || pathname.startsWith("/auth")) return null;

  // Pages that are fully authenticated — guest chat widget not relevant there
  const isAuthenticatedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/my-") ||
    pathname.startsWith("/booking") ||
    pathname.startsWith("/wishlist") ||
    pathname.startsWith("/loyalty") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/agent-") ||
    pathname.startsWith("/branch-dashboard") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/contract") ||
    pathname.startsWith("/tabungan") ||
    pathname.startsWith("/e-ticket") ||
    pathname.startsWith("/refund-request") ||
    pathname === "/chat";

  return (
    <>
      {/* ── Guest chat widget — shown on all public pages ────────────────── */}
      {!isAuthenticatedRoute && <GuestChatWidget />}

      {/* ── Scroll-to-top ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            key="scroll-top"
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Kembali ke atas"
            className="fixed bottom-24 right-4 z-50 w-11 h-11 rounded-full gradient-gold text-primary shadow-lg flex items-center justify-center hover:shadow-xl active:scale-90 transition-shadow"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Contact / Social buttons ─────────────────────────────────────── */}
      <ContactButtons menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
    </>
  );
};

// ── ContactButtons — fetches CMS config, renders single pill or expand menu ──

const ContactButtons = ({
  menuOpen,
  setMenuOpen,
}: {
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
}) => {
  const { data: rawButtons = [] } = useQuery({
    queryKey: ["floating-buttons-cms"],
    queryFn: async () => {
      try {
        const result = await apiFetch<{ data: FloatingButton[] }>("/api/cms/floating-buttons");
        return Array.isArray(result) ? result : (result?.data ?? []);
      } catch {
        return [] as FloatingButton[];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const buttons = rawButtons.filter((b) => b.isActive);
  if (buttons.length === 0) return null;

  /* ── Single button — pill with pulsing ring ──────────────────────────── */
  if (buttons.length === 1) {
    const btn = buttons[0];
    const Icon = iconMap[btn.icon] ?? MessageCircle;
    const color = bgClass[btn.platform] ?? "bg-primary";
    const label = btn.platform === "whatsapp" ? "Chat WhatsApp" : btn.label;

    return (
      <motion.a
        href={btn.url}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0, x: 80 }}
        animate={{ scale: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.8 }}
        aria-label={label}
        className={`fixed bottom-6 right-4 z-50 flex items-center gap-2.5 pl-4 pr-5 py-3 rounded-full text-white font-semibold text-sm shadow-xl active:scale-95 transition-all select-none ${color}`}
      >
        <span className={`absolute inset-0 rounded-full animate-ping opacity-20 ${color}`} />
        <Icon className="w-5 h-5 shrink-0 relative z-10" />
        <span className="relative z-10 whitespace-nowrap">{label}</span>
      </motion.a>
    );
  }

  /* ── Multiple buttons — expandable labeled stack ─────────────────────── */
  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-2.5">
      <AnimatePresence>
        {menuOpen &&
          buttons.map((btn, i) => {
            const Icon = iconMap[btn.icon] ?? MessageCircle;
            const color = bgClass[btn.platform] ?? "bg-primary";
            return (
              <motion.a
                key={btn.id}
                href={btn.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0.6, x: 40 }}
                animate={{
                  opacity: 1, scale: 1, x: 0,
                  transition: { delay: i * 0.06, type: "spring", stiffness: 340, damping: 26 },
                }}
                exit={{
                  opacity: 0, scale: 0.6, x: 40,
                  transition: { delay: (buttons.length - 1 - i) * 0.04, duration: 0.15 },
                }}
                className={`flex items-center gap-2.5 pl-4 pr-5 py-2.5 rounded-full text-white font-semibold text-sm shadow-lg active:scale-95 whitespace-nowrap ${color}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{btn.label}</span>
              </motion.a>
            );
          })}
      </AnimatePresence>

      {/* Toggle pill */}
      <div className="relative">
        {!menuOpen && (
          <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping pointer-events-none" />
        )}
        <motion.button
          onClick={() => setMenuOpen(!menuOpen)}
          whileTap={{ scale: 0.93 }}
          aria-label={menuOpen ? "Tutup menu kontak" : "Hubungi Kami"}
          className={`relative flex items-center gap-2.5 pl-4 pr-5 py-3 rounded-full font-bold text-sm shadow-xl text-white select-none transition-colors ${
            menuOpen ? "bg-neutral-700 hover:bg-neutral-800" : "bg-primary hover:bg-primary/90"
          }`}
        >
          <AnimatePresence mode="wait">
            {menuOpen ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                <span>Tutup</span>
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2"
              >
                <Phone className="w-4 h-4" />
                <span>Hubungi Kami</span>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
};

export default GlobalFloatingWidgets;
