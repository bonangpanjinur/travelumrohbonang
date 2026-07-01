import { useCurrency } from "@/hooks/useCurrency";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Coins } from "lucide-react";

export const CurrencySwitcher = () => {
  const { currencies, current, setCurrency } = useCurrency();
  if (!currencies.length || !current) return null;
  return (
    <div className="flex items-center gap-1.5">
      <Coins className="h-4 w-4 text-muted-foreground" />
      <Select value={current.code} onValueChange={setCurrency}>
        <SelectTrigger className="h-8 w-24 text-xs border-0 bg-transparent px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {currencies.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              {c.code} {c.symbol && `(${c.symbol})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
