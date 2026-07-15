import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/shared/lib/apiClient";

export interface InstallmentScheduleItem {
  id: string;
  bookingId: string;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  status: "pending" | "paid" | "overdue";
  paidAt: string | null;
  paymentGatewayOrderId: string | null;
  notes: string | null;
}

export interface InstallmentGatewayResult {
  gateway: string;
  vaNumber?: string;
  bankCode?: string;
  paymentMethod?: string;
  expiryTime?: string;
  orderId: string;
  amount: number;
}

interface UseInstallmentsReturn {
  installments: InstallmentScheduleItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createGatewayPayment: (
    installmentNumber: number,
    opts: {
      gateway: "midtrans" | "xendit";
      bankCode?: string;
      paymentMethod?: string;
      customerName: string;
      customerEmail: string;
    },
  ) => Promise<InstallmentGatewayResult | null>;
}

export function useInstallments(bookingId: string | null | undefined): UseInstallmentsReturn {
  const [installments, setInstallments] = useState<InstallmentScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInstallments = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<InstallmentScheduleItem[]>(
        `/api/bookings/${bookingId}/installments`,
      );
      setInstallments(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal memuat jadwal cicilan");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void fetchInstallments();
  }, [fetchInstallments]);

  const createGatewayPayment = useCallback(
    async (
      installmentNumber: number,
      opts: {
        gateway: "midtrans" | "xendit";
        bankCode?: string;
        paymentMethod?: string;
        customerName: string;
        customerEmail: string;
      },
    ): Promise<InstallmentGatewayResult | null> => {
      if (!bookingId) return null;
      try {
        const result = await apiFetch<InstallmentGatewayResult>(
          `/api/bookings/${bookingId}/installments/${installmentNumber}/pay`,
          {
            method: "POST",
            body: JSON.stringify(opts),
          },
        );
        return result;
      } catch (err: unknown) {
        throw new Error(
          err instanceof Error ? err.message : "Gagal membuat transaksi pembayaran",
        );
      }
    },
    [bookingId],
  );

  return {
    installments,
    loading,
    error,
    refetch: fetchInstallments,
    createGatewayPayment,
  };
}
