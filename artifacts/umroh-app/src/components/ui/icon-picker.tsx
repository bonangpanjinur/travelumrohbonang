import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  ShieldCheck,
  Users,
  Star,
  Award,
  Heart,
  ThumbsUp,
  Clock,
  MapPin,
  Plane,
  Hotel,
  Briefcase,
  Calendar,
  Phone,
  Mail,
  Globe,
  Building,
  Home,
  Settings,
  Shield,
  Lock,
  Key,
  CreditCard,
  Wallet,
  Gift,
  Package,
  Truck,
  Headphones,
  MessageCircle,
  Send,
  Bell,
  Camera,
  Image,
  Video,
  Music,
  Book,
  GraduationCap,
  Lightbulb,
  Target,
  Flag,
  Crown,
  Gem,
  Sparkles,
  Zap,
  Sun,
  Moon,
  Cloud,
  Umbrella,
  Coffee,
  Utensils,
  Car,
  Bus,
  Ship,
  Compass,
  Mountain,
  Trees,
  Palmtree,
  Flower,
  Leaf,
  Check,
  X,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Search,
  Filter,
  Edit,
  Trash,
  Copy,
  Download,
  Upload,
  Share,
  Link,
  Bookmark,
  Folder,
  File,
  FileText,
  ClipboardList,
  BarChart,
  PieChart,
  TrendingUp,
  Activity,
  Percent,
  DollarSign,
  Banknote,
  Receipt,
  Calculator,
  type LucideIcon,
} from "lucide-react";

// Icon registry with display names
const iconRegistry: { name: string; icon: LucideIcon; keywords: string[] }[] = [
  { name: "check-circle", icon: CheckCircle, keywords: ["check", "success", "done", "complete"] },
  { name: "shield-check", icon: ShieldCheck, keywords: ["shield", "security", "safe", "verify"] },
  { name: "users", icon: Users, keywords: ["users", "people", "team", "group"] },
  { name: "star", icon: Star, keywords: ["star", "rating", "favorite"] },
  { name: "award", icon: Award, keywords: ["award", "trophy", "achievement"] },
  { name: "heart", icon: Heart, keywords: ["heart", "love", "like"] },
  { name: "thumbs-up", icon: ThumbsUp, keywords: ["thumbs", "like", "approve"] },
  { name: "clock", icon: Clock, keywords: ["clock", "time", "schedule"] },
  { name: "map-pin", icon: MapPin, keywords: ["map", "location", "pin", "place"] },
  { name: "plane", icon: Plane, keywords: ["plane", "flight", "travel", "airport"] },
  { name: "hotel", icon: Hotel, keywords: ["hotel", "building", "stay", "accommodation"] },
  { name: "briefcase", icon: Briefcase, keywords: ["briefcase", "work", "business"] },
  { name: "calendar", icon: Calendar, keywords: ["calendar", "date", "schedule", "event"] },
  { name: "phone", icon: Phone, keywords: ["phone", "call", "contact"] },
  { name: "mail", icon: Mail, keywords: ["mail", "email", "message"] },
  { name: "globe", icon: Globe, keywords: ["globe", "world", "international"] },
  { name: "building", icon: Building, keywords: ["building", "office", "company"] },
  { name: "home", icon: Home, keywords: ["home", "house"] },
  { name: "settings", icon: Settings, keywords: ["settings", "config", "gear"] },
  { name: "shield", icon: Shield, keywords: ["shield", "security", "protect"] },
  { name: "lock", icon: Lock, keywords: ["lock", "secure", "password"] },
  { name: "key", icon: Key, keywords: ["key", "access", "unlock"] },
  { name: "credit-card", icon: CreditCard, keywords: ["credit", "card", "payment"] },
  { name: "wallet", icon: Wallet, keywords: ["wallet", "money", "payment"] },
  { name: "gift", icon: Gift, keywords: ["gift", "present", "bonus"] },
  { name: "package", icon: Package, keywords: ["package", "box", "delivery"] },
  { name: "truck", icon: Truck, keywords: ["truck", "delivery", "shipping"] },
  { name: "headphones", icon: Headphones, keywords: ["headphones", "support", "audio"] },
  { name: "message-circle", icon: MessageCircle, keywords: ["message", "chat", "comment"] },
  { name: "send", icon: Send, keywords: ["send", "submit", "message"] },
  { name: "bell", icon: Bell, keywords: ["bell", "notification", "alert"] },
  { name: "camera", icon: Camera, keywords: ["camera", "photo"] },
  { name: "image", icon: Image, keywords: ["image", "photo", "picture"] },
  { name: "video", icon: Video, keywords: ["video", "movie", "film"] },
  { name: "music", icon: Music, keywords: ["music", "audio", "sound"] },
  { name: "book", icon: Book, keywords: ["book", "read", "education"] },
  { name: "graduation-cap", icon: GraduationCap, keywords: ["graduation", "education", "study"] },
  { name: "lightbulb", icon: Lightbulb, keywords: ["lightbulb", "idea", "innovation"] },
  { name: "target", icon: Target, keywords: ["target", "goal", "aim"] },
  { name: "flag", icon: Flag, keywords: ["flag", "country", "milestone"] },
  { name: "crown", icon: Crown, keywords: ["crown", "king", "premium", "vip"] },
  { name: "gem", icon: Gem, keywords: ["gem", "diamond", "premium"] },
  { name: "sparkles", icon: Sparkles, keywords: ["sparkles", "magic", "special"] },
  { name: "zap", icon: Zap, keywords: ["zap", "energy", "power", "fast"] },
  { name: "sun", icon: Sun, keywords: ["sun", "day", "bright"] },
  { name: "moon", icon: Moon, keywords: ["moon", "night", "dark"] },
  { name: "cloud", icon: Cloud, keywords: ["cloud", "weather", "sky"] },
  { name: "umbrella", icon: Umbrella, keywords: ["umbrella", "rain", "protection"] },
  { name: "coffee", icon: Coffee, keywords: ["coffee", "drink", "cafe"] },
  { name: "utensils", icon: Utensils, keywords: ["utensils", "food", "restaurant"] },
  { name: "car", icon: Car, keywords: ["car", "vehicle", "transport"] },
  { name: "bus", icon: Bus, keywords: ["bus", "transport", "public"] },
  { name: "ship", icon: Ship, keywords: ["ship", "boat", "cruise"] },
  { name: "compass", icon: Compass, keywords: ["compass", "direction", "navigation"] },
  { name: "mountain", icon: Mountain, keywords: ["mountain", "nature", "hiking"] },
  { name: "trees", icon: Trees, keywords: ["trees", "forest", "nature"] },
  { name: "palmtree", icon: Palmtree, keywords: ["palm", "beach", "tropical"] },
  { name: "flower", icon: Flower, keywords: ["flower", "nature", "garden"] },
  { name: "leaf", icon: Leaf, keywords: ["leaf", "nature", "eco"] },
  { name: "check", icon: Check, keywords: ["check", "done", "complete"] },
  { name: "x", icon: X, keywords: ["x", "close", "cancel"] },
  { name: "plus", icon: Plus, keywords: ["plus", "add", "new"] },
  { name: "minus", icon: Minus, keywords: ["minus", "remove", "subtract"] },
  { name: "arrow-right", icon: ArrowRight, keywords: ["arrow", "right", "next"] },
  { name: "arrow-left", icon: ArrowLeft, keywords: ["arrow", "left", "back"] },
  { name: "chevron-right", icon: ChevronRight, keywords: ["chevron", "right", "expand"] },
  { name: "chevron-down", icon: ChevronDown, keywords: ["chevron", "down", "dropdown"] },
  { name: "eye", icon: Eye, keywords: ["eye", "view", "visible"] },
  { name: "eye-off", icon: EyeOff, keywords: ["eye", "hide", "invisible"] },
  { name: "search", icon: Search, keywords: ["search", "find", "look"] },
  { name: "filter", icon: Filter, keywords: ["filter", "sort", "refine"] },
  { name: "edit", icon: Edit, keywords: ["edit", "write", "modify"] },
  { name: "trash", icon: Trash, keywords: ["trash", "delete", "remove"] },
  { name: "copy", icon: Copy, keywords: ["copy", "duplicate", "clone"] },
  { name: "download", icon: Download, keywords: ["download", "save", "export"] },
  { name: "upload", icon: Upload, keywords: ["upload", "import", "add"] },
  { name: "share", icon: Share, keywords: ["share", "social", "send"] },
  { name: "link", icon: Link, keywords: ["link", "url", "connect"] },
  { name: "bookmark", icon: Bookmark, keywords: ["bookmark", "save", "favorite"] },
  { name: "folder", icon: Folder, keywords: ["folder", "directory", "files"] },
  { name: "file", icon: File, keywords: ["file", "document"] },
  { name: "file-text", icon: FileText, keywords: ["file", "document", "text"] },
  { name: "clipboard-list", icon: ClipboardList, keywords: ["clipboard", "list", "tasks"] },
  { name: "bar-chart", icon: BarChart, keywords: ["chart", "graph", "stats"] },
  { name: "pie-chart", icon: PieChart, keywords: ["pie", "chart", "graph"] },
  { name: "trending-up", icon: TrendingUp, keywords: ["trending", "growth", "increase"] },
  { name: "activity", icon: Activity, keywords: ["activity", "pulse", "health"] },
  { name: "percent", icon: Percent, keywords: ["percent", "discount", "sale"] },
  { name: "dollar-sign", icon: DollarSign, keywords: ["dollar", "money", "price"] },
  { name: "banknote", icon: Banknote, keywords: ["banknote", "cash", "money"] },
  { name: "receipt", icon: Receipt, keywords: ["receipt", "invoice", "bill"] },
  { name: "calculator", icon: Calculator, keywords: ["calculator", "math", "calculate"] },
];

// Helper function to get icon component by name
export const getIconByName = (name: string): LucideIcon | null => {
  const found = iconRegistry.find((item) => item.name === name);
  return found?.icon || null;
};

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const IconPicker = ({ value, onChange, className }: IconPickerProps) => {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredIcons = React.useMemo(() => {
    if (!search) return iconRegistry;
    const lower = search.toLowerCase();
    return iconRegistry.filter(
      (item) =>
        item.name.includes(lower) ||
        item.keywords.some((k) => k.includes(lower))
    );
  }, [search]);

  const SelectedIcon = getIconByName(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[140px] justify-between", className)}
        >
          <div className="flex items-center gap-2">
            {SelectedIcon ? (
              <SelectedIcon className="h-4 w-4" />
            ) : (
              <span className="text-muted-foreground">Pilih icon</span>
            )}
            {value && <span className="text-xs truncate max-w-[70px]">{value}</span>}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Cari icon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <ScrollArea className="h-[250px]">
          <div className="grid grid-cols-5 gap-1 p-2">
            {filteredIcons.map((item) => {
              const Icon = item.icon;
              const isSelected = value === item.name;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    onChange(item.name);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-center p-2 rounded-md hover:bg-accent transition-colors",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                  title={item.name}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </div>
          {filteredIcons.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              Tidak ada icon ditemukan
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
