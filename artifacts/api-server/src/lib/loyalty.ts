/**
 * Loyalty points business logic — shared by the admin "completed" status
 * transition (auto-award) and the user-facing booking flow (redeem).
 *
 * Conversion rate: 1 point = Rp 100 (100 points = Rp 10.000 discount).
 * Points are awarded at 1 point per Rp 100.000 of a completed booking's
 * total price.
 */
import { db, loyaltyBalances, loyaltyPoints, eq } from "@workspace/db";

export const POINTS_PER_IDR = 100_000; // 1 point earned per Rp 100.000 spent
export const IDR_PER_POINT = 100; // 1 point = Rp 100 when redeemed
export const MIN_REDEEM_POINTS = 100; // minimum redemption = 100 points (Rp 10.000)

function bookingAwardMarker(bookingId: string): string {
  return `booking:${bookingId}`;
}

/**
 * Award loyalty points for a completed booking, once. Safe to call multiple
 * times for the same booking — subsequent calls are no-ops.
 */
export async function awardLoyaltyPointsForBooking(
  bookingId: string,
  userId: string | null,
  totalPrice: number,
): Promise<{ awarded: boolean; points: number }> {
  if (!userId || !totalPrice || totalPrice <= 0) {
    return { awarded: false, points: 0 };
  }

  const points = Math.floor(totalPrice / POINTS_PER_IDR);
  if (points <= 0) {
    return { awarded: false, points: 0 };
  }

  const marker = bookingAwardMarker(bookingId);

  return await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: loyaltyPoints.id })
      .from(loyaltyPoints)
      .where(eq(loyaltyPoints.description, marker))
      .limit(1);

    if (existing.length > 0) {
      return { awarded: false, points: 0 };
    }

    await tx.insert(loyaltyPoints).values({
      id: crypto.randomUUID(),
      userId,
      points,
      source: "booking_completed",
      description: marker,
      createdAt: new Date(),
    });

    const [balance] = await tx
      .select()
      .from(loyaltyBalances)
      .where(eq(loyaltyBalances.userId, userId))
      .limit(1);

    if (balance) {
      await tx
        .update(loyaltyBalances)
        .set({ totalPoints: balance.totalPoints + points })
        .where(eq(loyaltyBalances.userId, userId));
    } else {
      await tx.insert(loyaltyBalances).values({
        id: crypto.randomUUID(),
        userId,
        totalPoints: points,
        createdAt: new Date(),
      });
    }

    return { awarded: true, points };
  });
}

/**
 * Redeem points for a discount on a new booking. Deducts the points from
 * the user's balance and records a negative ledger entry. Returns the
 * discount amount in IDR. Throws on insufficient balance / invalid amount.
 */
export async function redeemLoyaltyPointsForBooking(
  userId: string,
  points: number,
  bookingId: string,
): Promise<{ discount: number }> {
  if (!Number.isInteger(points) || points < MIN_REDEEM_POINTS) {
    throw new Error(`Minimum penukaran adalah ${MIN_REDEEM_POINTS} poin`);
  }

  return await db.transaction(async (tx) => {
    const [balance] = await tx
      .select()
      .from(loyaltyBalances)
      .where(eq(loyaltyBalances.userId, userId))
      .limit(1);

    if (!balance || balance.totalPoints < points) {
      throw new Error("Saldo poin tidak cukup");
    }

    await tx.update(loyaltyBalances).set({
      totalPoints: balance.totalPoints - points,
    }).where(eq(loyaltyBalances.userId, userId));

    await tx.insert(loyaltyPoints).values({
      id: crypto.randomUUID(),
      userId,
      points: -points,
      source: "booking_redeem",
      description: bookingAwardMarker(bookingId),
      createdAt: new Date(),
    });

    return { discount: points * IDR_PER_POINT };
  });
}
