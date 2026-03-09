import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";

interface ThemeToggleProps {
  variant?: "navbar" | "admin";
}

const ThemeToggle = ({ variant = "navbar" }: ThemeToggleProps) => {
  const { theme, toggleTheme } = useTheme();

  if (variant === "admin") {
    return (
      <button
        onClick={toggleTheme}
        className="p-1.5 rounded-lg text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
        title={theme === "dark" ? "Light Mode" : "Dark Mode"}
      >
        {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="text-primary-foreground/80 hover:text-gold hover:bg-emerald-light/20"
      title={theme === "dark" ? "Light Mode" : "Dark Mode"}
    >
      {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </Button>
  );
};

export default ThemeToggle;
