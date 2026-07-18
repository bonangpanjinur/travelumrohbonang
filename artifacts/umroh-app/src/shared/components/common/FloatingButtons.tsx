import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/lib/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { MessageCircle, Instagram, Facebook, Music2, Youtube, Send, X, Phone } from "lucide-react";

interface FloatingButton {
  id: string;
  platform: string;
  label: string;
  url: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
}

interface Props {
  /** Fallback WhatsApp number (from tenant config) shown when no CMS buttons are configured */
  fallbackWhatsapp?: string;
}

const iconMap: Record<string, React.ElementType> = {
  MessageCircle,
  Instagram,
  Facebook,
  Music2,
  Youtube,
  Send,
};

const bgClass: Record<string, string> = {
  whatsapp: "bg-[#25D366] hover:bg-[#1ead58]",
  instagram: "bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 hover:opacity-90",
  facebook: "bg-[#1877F2] hover:bg-[#1464cf]",
  tiktok: "bg-gray-900 hover:bg-black",
  youtube: "bg-red-600 hover:bg-red-700",
  telegram: "bg-sky-500 hover:bg-sky-600",
};

const FloatingButtons = ({ fallbackWhatsapp }: Props = {}) => {
  const [isOpen, setIsOpen] = useState(false);

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

  const buttons = rawButtons.filter((b) => b.is_active);

  // Fall back to tenant's WhatsApp number when no CMS buttons are configured
  const effectiveButtons: FloatingButton[] =
    buttons.length > 0
      ? buttons
      : fallbackWhatsapp
      ? [
          {
            id: "__wa_fallback__",
            platform: "whatsapp",
            label: "Chat WhatsApp",
            url: `https://wa.me/${fallbackWhatsapp.replace(/\D/g, "")}`,
            icon: "MessageCircle",
            is_active: true,
            sort_order: 0,
          },
        ]
      : [];

  if (effectiveButtons.length === 0) return null;

  /* ── Single button — pill with pulsing attention ring ─────────────────── */
  if (effectiveButtons.length === 1) {
    const btn = effectiveButtons[0];
    const Icon = iconMap[btn.icon] ?? MessageCircle;
    const colorClass = bgClass[btn.platform] ?? "bg-primary";
    const label = btn.platform === "whatsapp" ? "Chat WhatsApp" : btn.label;

    return (
      <motion.a
        href={btn.url}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0, x: 80 }}
        animate={{ scale: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.8 }}
        className={`fixed bottom-6 right-4 z-50 flex items-center gap-2.5 pl-4 pr-5 py-3 rounded-full text-white font-semibold text-sm shadow-xl active:scale-95 transition-all select-none ${colorClass}`}
        aria-label={label}
      >
        {/* Pulse ring — draws attention without being intrusive */}
        <span className={`absolute inset-0 rounded-full animate-ping opacity-25 ${colorClass}`} />
        <Icon className="w-5 h-5 shrink-0 relative z-10" />
        <span className="relative z-10 whitespace-nowrap">{label}</span>
      </motion.a>
    );
  }

  /* ── Multiple buttons — expandable labelled stack ─────────────────────── */
  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col items-end gap-2.5">
      <AnimatePresence>
        {isOpen &&
          effectiveButtons.map((btn, i) => {
            const Icon = iconMap[btn.icon] ?? MessageCircle;
            const colorClass = bgClass[btn.platform] ?? "bg-primary";
            return (
              <motion.a
                key={btn.id}
                href={btn.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0.6, x: 50 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  x: 0,
                  transition: { delay: i * 0.06, type: "spring", stiffness: 340, damping: 26 },
                }}
                exit={{
                  opacity: 0,
                  scale: 0.6,
                  x: 50,
                  transition: { delay: (effectiveButtons.length - 1 - i) * 0.04, duration: 0.15 },
                }}
                className={`flex items-center gap-2.5 pl-4 pr-5 py-2.5 rounded-full text-white font-semibold text-sm shadow-lg active:scale-95 whitespace-nowrap ${colorClass}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{btn.label}</span>
              </motion.a>
            );
          })}
      </AnimatePresence>

      {/* Toggle button — clearly labelled "Hubungi Kami" */}
      <div className="relative">
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping pointer-events-none" />
        )}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileTap={{ scale: 0.93 }}
          className={`relative flex items-center gap-2.5 pl-4 pr-5 py-3 rounded-full font-bold text-sm shadow-xl text-white select-none transition-colors ${
            isOpen ? "bg-gray-700 hover:bg-gray-800" : "bg-primary hover:bg-primary/90"
          }`}
          aria-label={isOpen ? "Tutup menu kontak" : "Hubungi Kami"}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
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

export default FloatingButtons;
