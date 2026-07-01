import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  MessageCircle,
  Instagram,
  Facebook,
  Music2,
  Youtube,
  Send,
  X,
  Plus,
} from "lucide-react";

interface FloatingButton {
  id: string;
  platform: string;
  label: string;
  url: string;
  icon: string;
  is_active: boolean;
  sort_order: number;
}

const iconMap: Record<string, React.ElementType> = {
  MessageCircle,
  Instagram,
  Facebook,
  Music2,
  Youtube,
  Send,
};

const colorMap: Record<string, string> = {
  whatsapp: "bg-green-500 hover:bg-green-600",
  instagram: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 hover:opacity-90",
  facebook: "bg-blue-600 hover:bg-blue-700",
  tiktok: "bg-black hover:bg-gray-900",
  youtube: "bg-red-600 hover:bg-red-700",
  telegram: "bg-sky-500 hover:bg-sky-600",
};

const FloatingButtons = () => {
  const [isOpen, setIsOpen] = useState(false);

  const { data: buttons = [] } = useQuery({
    queryKey: ["floating-buttons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("floating_buttons")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as FloatingButton[];
    },
  });

  if (buttons.length === 0) return null;

  // If only one button, show it directly
  if (buttons.length === 1) {
    const btn = buttons[0];
    const Icon = iconMap[btn.icon] || MessageCircle;
    return (
      <motion.a
        href={btn.url}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full ${colorMap[btn.platform] || "bg-gold"} text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110`}
        aria-label={btn.label}
      >
        <Icon className="w-6 h-6" />
      </motion.a>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-16 right-0 flex flex-col gap-3 items-end"
          >
            {buttons.map((btn, index) => {
              const Icon = iconMap[btn.icon] || MessageCircle;
              return (
                <motion.a
                  key={btn.id}
                  href={btn.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: index * 0.05 } }}
                  exit={{ opacity: 0, x: 20 }}
                  className={`flex items-center gap-3 px-4 py-2 rounded-full ${colorMap[btn.platform] || "bg-gold"} text-white shadow-lg transition-transform hover:scale-105`}
                >
                  <span className="text-sm font-medium">{btn.label}</span>
                  <Icon className="w-5 h-5" />
                </motion.a>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full ${isOpen ? "bg-elegant-black" : "gradient-gold"} text-${isOpen ? "white" : "primary"} flex items-center justify-center shadow-lg transition-all hover:scale-110`}
        animate={{ rotate: isOpen ? 45 : 0 }}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
      </motion.button>
    </div>
  );
};

export default FloatingButtons;
