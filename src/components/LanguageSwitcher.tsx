import { useLanguage } from "@/i18n/LanguageContext";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LanguageSwitcher = ({ variant = "navbar" }: { variant?: "navbar" | "admin" }) => {
  const { language, setLanguage } = useLanguage();

  const isNavbar = variant === "navbar";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={
            isNavbar
              ? "text-primary-foreground/80 hover:text-gold hover:bg-primary-foreground/10 gap-1.5 px-2"
              : "gap-1.5 px-2"
          }
        >
          <Globe className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase">{language}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px] z-[130]">
        <DropdownMenuItem
          onClick={() => setLanguage("id")}
          className={language === "id" ? "font-bold bg-accent" : ""}
        >
          🇮🇩 Indonesia
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setLanguage("en")}
          className={language === "en" ? "font-bold bg-accent" : ""}
        >
          🇬🇧 English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
