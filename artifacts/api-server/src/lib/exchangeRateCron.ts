/**
 * F-14 — Multi-Currency: Auto-sync Kurs Harian
 *
 * Mengambil kurs mata uang dari Open Exchange Rates API (gratis, tanpa API key)
 * dan memperbarui kolom rate_to_idr + rate_updated_at di tabel currencies.
 *
 * Jadwal: setiap hari 06:00 WIB (23:00 UTC hari sebelumnya).
 * Sumber data: https://open.er-api.com/v6/latest/IDR
 * Format respons: { rates: { USD: 0.0000635, SAR: 0.000238, ... } }
 * Konversi: rateToIdr(CODE) = round(1 / rates[CODE])
 */

import { db, currencies } from "@workspace/db";
import { and, eq, ne } from "drizzle-orm";

const TARGET_UTC_HOUR = 23; // 06:00 WIB = 23:00 UTC (hari sebelumnya)
const HOUR_MS = 60 * 60 * 1_000;

let lastRunDate: string | null = null;

const EXCHANGE_API_URL = "https://open.er-api.com/v6/latest/IDR";

interface ExchangeRateResponse {
  result: string;
  rates: Record<string, number>;
}

/**
 * Ambil kurs dari Open Exchange Rates API lalu update tabel currencies.
 * Hanya update mata uang yang sudah ada di DB dan bukan IDR (default).
 * Mengembalikan jumlah mata uang yang berhasil diperbarui.
 */
export async function syncExchangeRates(): Promise<{ updated: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;

  try {
    const response = await fetch(EXCHANGE_API_URL, {
      signal: AbortSignal.timeout(15_000), // 15 detik timeout
    });

    if (!response.ok) {
      throw new Error(`Exchange API responded ${response.status}`);
    }

    const data = (await response.json()) as ExchangeRateResponse;

    if (data.result !== "success" || !data.rates) {
      throw new Error(`Unexpected API response: ${JSON.stringify(data).slice(0, 200)}`);
    }

    // Ambil semua currencies aktif (kecuali IDR — IDR selalu 1)
    const activeCurrencies = await db
      .select({ id: currencies.id, code: currencies.code })
      .from(currencies)
      .where(and(eq(currencies.isActive, true), ne(currencies.code, "IDR")));

    const now = new Date();

    for (const curr of activeCurrencies) {
      const rateVsIdr = data.rates[curr.code]; // berapa unit curr.code per 1 IDR
      if (!rateVsIdr || rateVsIdr <= 0) {
        errors.push(`Kurs tidak tersedia untuk ${curr.code}`);
        continue;
      }

      // rateToIdr = 1 / rateVsIdr (berapa IDR per 1 unit curr.code)
      const rateToIdr = Math.round(1 / rateVsIdr);

      try {
        await db
          .update(currencies)
          .set({ rateToIdr, rateUpdatedAt: now })
          .where(eq(currencies.id, curr.id));
        updated++;
      } catch (err: any) {
        errors.push(`Gagal update ${curr.code}: ${err?.message}`);
      }
    }

    console.info(`[exchangeRateCron] Sync selesai — ${updated} mata uang diperbarui, ${errors.length} error`);
    if (errors.length > 0) {
      console.warn("[exchangeRateCron] Errors:", errors);
    }
  } catch (err: any) {
    const msg = `Gagal ambil data kurs: ${err?.message}`;
    console.error(`[exchangeRateCron] ${msg}`);
    errors.push(msg);
  }

  return { updated, errors };
}

export function startExchangeRateCron(): void {
  console.info("[exchangeRateCron] Scheduler dimulai — sinkronisasi kurs harian 06:00 WIB (23:00 UTC)");

  setInterval(() => {
    const now = new Date();
    const utcHour  = now.getUTCHours();
    const todayStr = now.toISOString().slice(0, 10);

    if (utcHour === TARGET_UTC_HOUR && lastRunDate !== todayStr) {
      lastRunDate = todayStr;
      console.info(`[exchangeRateCron] Memulai sinkronisasi kurs untuk ${todayStr}`);
      void syncExchangeRates();
    }
  }, HOUR_MS);
}
