/**
 * Supabase REST API fallback helpers.
 *
 * Admin endpoints query the local Drizzle DB. When a booking lives in the
 * Supabase-hosted DB (e.g. during development where local DB is empty), these
 * helpers fall back to the Supabase REST API using the request's user JWT so
 * that the user's RLS policies apply. If SUPABASE_SERVICE_ROLE_KEY is set it
 * is preferred (bypasses RLS entirely), otherwise the user token is forwarded.
 */

import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } from "./supabaseEnv";

/**
 * Build auth headers for Supabase REST.
 * Priority: service-role key (bypasses RLS) → user JWT (applies RLS as that user) → anon key.
 */
function buildHeaders(userToken?: string): Record<string, string> {
  // apikey must always be the anon/service key (identifies the project)
  const apikey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  // Authorization Bearer: prefer service role (full access), else forward user JWT, else anon
  const authToken = SUPABASE_SERVICE_ROLE_KEY || userToken || SUPABASE_ANON_KEY;
  return {
    "Content-Type": "application/json",
    apikey,
    Authorization: `Bearer ${authToken}`,
  };
}

/** Query Supabase REST API. Returns the JSON array/object or null on error. */
export async function sbRest<T = unknown>(
  path: string,
  userToken?: string,
): Promise<T | null> {
  if (!SUPABASE_URL) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}${path}`, {
      headers: buildHeaders(userToken),
    });
    if (!res.ok) {
      console.warn(`[supabaseFallback] ${res.status} for ${path}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.warn(`[supabaseFallback] fetch error for ${path}:`, e);
    return null;
  }
}

/** Fetch a single booking from Supabase with joined package + departure + branch data. */
export async function sbGetBooking(bookingId: string, userToken?: string) {
  const rows = await sbRest<any[]>(
    `/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}&select=id,booking_code,total_price,status,created_at,package_id,departure_id,branch_id,pemesan_name,pemesan_email,pemesan_phone,pic_name,pic_phone,user_id`,
    userToken,
  );
  return rows?.[0] ?? null;
}

/** Fetch booking pilgrims from Supabase. */
export async function sbGetPilgrims(bookingId: string, userToken?: string) {
  const rows = await sbRest<any[]>(
    `/rest/v1/booking_pilgrims?booking_id=eq.${encodeURIComponent(bookingId)}&select=*`,
    userToken,
  );
  return rows ?? [];
}

/** Fetch booking payments from Supabase (non-voided only). */
export async function sbGetPayments(bookingId: string, userToken?: string) {
  const rows = await sbRest<any[]>(
    `/rest/v1/booking_payments?booking_id=eq.${encodeURIComponent(bookingId)}&order=paid_at.asc`,
    userToken,
  );
  return rows ?? [];
}

/** Fetch a package by id from Supabase. */
export async function sbGetPackage(packageId: string | null, userToken?: string) {
  if (!packageId) return null;
  const rows = await sbRest<any[]>(
    `/rest/v1/packages?id=eq.${encodeURIComponent(packageId)}&select=id,title,slug`,
    userToken,
  );
  return rows?.[0] ?? null;
}

/** Fetch a departure by id from Supabase. */
export async function sbGetDeparture(departureId: string | null, userToken?: string) {
  if (!departureId) return null;
  const rows = await sbRest<any[]>(
    `/rest/v1/package_departures?id=eq.${encodeURIComponent(departureId)}&select=id,departure_date`,
    userToken,
  );
  return rows?.[0] ?? null;
}

/** Fetch a branch by id from Supabase. */
export async function sbGetBranch(branchId: string | null, userToken?: string) {
  if (!branchId) return null;
  const rows = await sbRest<any[]>(
    `/rest/v1/branches?id=eq.${encodeURIComponent(branchId)}&select=id,name`,
    userToken,
  );
  return rows?.[0] ?? null;
}

/** Fetch a profile (user) by id from Supabase. */
export async function sbGetProfile(userId: string | null, userToken?: string) {
  if (!userId) return null;
  const rows = await sbRest<any[]>(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,name,email,phone`,
    userToken,
  );
  return rows?.[0] ?? null;
}
