import { useState, useEffect } from "react";
import { apiFetch } from "@/shared/lib/apiClient";

export interface BookingItem {
  id: string;
  bookingCode: string;
  totalPrice: number;
  currency: string;
  status: string | null;
  departureId: string | null;
  packageId: string | null;
  createdAt: string | null;
  packageTitle: string | null;
  packageSlug: string | null;
  departureDate: string | null;
}

interface BookingListResponse {
  data: BookingItem[];
  total: number;
}

export function useMyBookings(userId: string | undefined) {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Bump this counter to trigger a refetch without changing userId
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function fetchBookings() {
      try {
        setLoading(true);
        setError(null);
        const res = await apiFetch<BookingListResponse>("/api/bookings");
        if (!cancelled) setBookings(res.data);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Gagal memuat data booking",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBookings();
    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  const refetch = () => setRefreshKey((k) => k + 1);

  return { bookings, loading, error, refetch };
}
