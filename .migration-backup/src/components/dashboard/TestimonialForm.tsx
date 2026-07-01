import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  bookingId: string;
  packageTitle?: string;
  onSubmitted?: () => void;
}

const TestimonialForm = ({ bookingId, packageTitle, onSubmitted }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [exists, setExists] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("pilgrim_testimonials")
      .select("id")
      .eq("booking_id", bookingId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setExists(!!data));
  }, [user, bookingId]);

  if (exists === null || exists === true) return null;

  const handleSubmit = async () => {
    if (!user) return;
    if (rating < 1) {
      toast({ title: "Beri rating dulu", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("pilgrim_testimonials").insert({
      booking_id: bookingId,
      user_id: user.id,
      rating,
      message: message.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Gagal mengirim", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Terima kasih!",
      description: "Testimoni Anda menunggu persetujuan admin.",
    });
    setExists(true);
    onSubmitted?.();
  };

  return (
    <Card className="border-gold/30 bg-gold/5">
      <CardHeader>
        <CardTitle className="text-lg text-primary">Bagikan Pengalaman Anda</CardTitle>
        <CardDescription>
          Perjalanan {packageTitle ? `"${packageTitle}"` : ""} sudah selesai. Beri rating dan
          ceritakan pengalaman Anda untuk membantu jamaah lain.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(i)}
              className="p-1"
              aria-label={`${i} bintang`}
            >
              <Star
                className={`h-7 w-7 transition-colors ${
                  (hover || rating) >= i
                    ? "fill-gold text-gold"
                    : "text-muted-foreground/40"
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-sm text-muted-foreground">{rating}/5</span>
          )}
        </div>
        <Textarea
          placeholder="Ceritakan pengalaman Anda (opsional)..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={500}
        />
        <Button
          onClick={handleSubmit}
          disabled={submitting || rating < 1}
          className="gradient-gold text-primary"
        >
          <Send className="h-4 w-4 mr-2" />
          {submitting ? "Mengirim..." : "Kirim Testimoni"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default TestimonialForm;
