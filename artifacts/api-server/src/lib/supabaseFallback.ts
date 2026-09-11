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

/** Fetch a booking by booking_code from Supabase (for code-based lookups like BNG-XXXXXXXX). */
export async function sbGetBookingByCode(bookingCode: string, userToken?: string) {
  const rows = await sbRest<any[]>(
    `/rest/v1/bookings?booking_code=eq.${encodeURIComponent(bookingCode)}&select=id,booking_code,total_price,status,created_at,package_id,departure_id,branch_id,pemesan_name,pemesan_email,pemesan_phone,pic_name,pic_phone,user_id`,
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

/**
 * List bookings directly from Supabase for serverless deployments where the
 * optional Drizzle DATABASE_URL is not configured. RLS still applies because
 * the caller's JWT is forwarded in Authorization.
 */
export async function sbListAdminBookings(
  params: {
    status?: string;
    search?: string;
    branchId?: string;
    packageId?: string;
    limit?: number;
    offset?: number;
  },
  userToken?: string,
) {
  const query = new URLSearchParams({
    select: [
      "id,booking_code,user_id,package_id,departure_id,branch_id,status,total_price,currency,payment_scheme,notes,created_at,pic_type,pic_id,pic_name,pic_phone,pic_email,pemesan_name,pemesan_phone,pemesan_email",
      "package:packages(title,slug)",
      "departure:package_departures(departure_date)",
      "profile:profiles(name,email,phone)",
      "branch:branches(name)",
      "booking_pilgrims(name,created_at)",
      "payments:payments(amount,status)",
    ].join(","),
    order: "created_at.desc",
    limit: String(Math.min(Math.max(params.limit ?? 20, 1), 500)),
    offset: String(Math.max(params.offset ?? 0, 0)),
  });
  if (params.status && params.status !== "all") query.set("status", `eq.${params.status}`);
  if (params.branchId && params.branchId !== "__all__") query.set("branch_id", params.branchId === "__none__" ? "is.null" : `eq.${params.branchId}`);
  if (params.packageId && params.packageId !== "__all__") query.set("package_id", `eq.${params.packageId}`);
  if (params.search?.trim()) {
    const term = params.search.trim().replace(/[*(),]/g, "");
    query.set("or", `(booking_code.ilike.*${term}*,pic_name.ilike.*${term}*,pemesan_name.ilike.*${term}*)`);
  }

  const rows = await sbRest<any[]>(`/rest/v1/bookings?${query.toString()}`, userToken);
  if (!rows) return null;
  const data = rows.map((row) => {
    const payments = Array.isArray(row.payments) ? row.payments : [];
    const paid = payments.filter((payment: any) => payment.status !== "voided")
      .reduce((sum: number, payment: any) => sum + Number(payment.amount || 0), 0);
    const pilgrims = Array.isArray(row.booking_pilgrims) ? row.booking_pilgrims : [];
    return {
      id: row.id,
      bookingCode: row.booking_code,
      userId: row.user_id,
      packageId: row.package_id,
      departureId: row.departure_id,
      branchId: row.branch_id,
      status: row.status,
      totalPrice: row.total_price,
      currency: row.currency,
      paymentScheme: row.payment_scheme,
      notes: row.notes,
      createdAt: row.created_at,
      picType: row.pic_type,
      picId: row.pic_id,
      picName: row.pic_name,
      picPhone: row.pic_phone,
      picEmail: row.pic_email,
      pemesanName: row.pemesan_name ?? row.pic_name ?? row.profile?.name,
      pemesanPhone: row.pemesan_phone ?? row.pic_phone ?? row.profile?.phone,
      pemesanEmail: row.pemesan_email,
      packageTitle: row.package?.title,
      packageSlug: row.package?.slug,
      departureDate: row.departure?.departure_date,
      userName: row.profile?.name,
      userEmail: row.profile?.email,
      branchName: row.branch?.name,
      pilgrimsCount: pilgrims.length,
      firstJamaahName: pilgrims[0]?.name,
      paymentStatus: paid >= Number(row.total_price || 0) && Number(row.total_price || 0) > 0
        ? "paid" : paid > 0 ? "partial" : "unpaid",
    };
  });
  return { data, total: data.length };
}
