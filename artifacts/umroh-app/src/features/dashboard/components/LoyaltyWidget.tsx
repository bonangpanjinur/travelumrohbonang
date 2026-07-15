import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Gift, ChevronRight } from "lucide-react";
import { apiFetch } from "@/shared/lib/apiClient";

const LoyaltyWidget = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [totalPoints, setTotalPoints] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await apiFetch<{ totalPoints: number }>("/api/loyalty/my");
        setTotalPoints(res.totalPoints);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [user]);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => navigate("/loyalty")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") navigate("/loyalty");
      }}
      className="shadow-md cursor-pointer hover:shadow-lg transition-shadow border-gold/20 bg-gradient-to-br from-gold/10 to-transparent"
      aria-label="Lihat poin loyalitas saya"
    >
      <CardContent className="p-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-full bg-gold/15 text-gold">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Poin Saya</p>
            <p className="text-xl font-bold">
              {totalPoints === null ? "…" : totalPoints.toLocaleString("id-ID")}{" "}
              <span className="text-sm font-normal text-muted-foreground">poin</span>
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
      </CardContent>
    </Card>
  );
};

export default LoyaltyWidget;
