import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Calendar } from "lucide-react";

interface Day {
  id: string;
  day_number: number;
  title: string | null;
  description: string | null;
  image_url: string | null;
}

interface Props {
  departureId: string | null | undefined;
}

const BookingItinerary = ({ departureId }: Props) => {
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!departureId) {
      setLoading(false);
      return;
    }
    const load = async () => {
      const { data: itin } = await supabase
        .from("itineraries")
        .select("id, title")
        .eq("departure_id", departureId)
        .eq("is_active", true)
        .maybeSingle();
      if (!itin) {
        setLoading(false);
        return;
      }
      setTitle(itin.title);
      const { data: dayRows } = await supabase
        .from("itinerary_days")
        .select("id, day_number, title, description, image_url")
        .eq("itinerary_id", itin.id)
        .order("day_number");
      setDays(dayRows || []);
      setLoading(false);
    };
    load();
  }, [departureId]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Memuat itinerary...</p>;
  }
  if (days.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Itinerary belum tersedia untuk keberangkatan ini.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {title && (
        <h4 className="font-semibold flex items-center gap-2 text-primary">
          <Calendar className="h-4 w-4" /> {title}
        </h4>
      )}
      <div className="relative pl-6 border-l-2 border-gold/30 space-y-4">
        {days.map((d) => (
          <div key={d.id} className="relative">
            <div className="absolute -left-[31px] top-1 w-6 h-6 rounded-full bg-gold text-primary text-xs font-bold flex items-center justify-center">
              {d.day_number}
            </div>
            <div className="bg-muted/40 rounded-lg p-3">
              <h5 className="font-semibold text-sm flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-gold" />
                {d.title || `Hari ${d.day_number}`}
              </h5>
              {d.description && (
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">
                  {d.description}
                </p>
              )}
              {d.image_url && (
                <img
                  src={d.image_url}
                  alt={d.title || `Hari ${d.day_number}`}
                  className="mt-2 rounded-md max-h-40 object-cover"
                  loading="lazy"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookingItinerary;
