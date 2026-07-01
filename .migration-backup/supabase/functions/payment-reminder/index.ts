import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BookingWithDetails {
  id: string;
  booking_code: string;
  user_id: string;
  total_price: number;
  status: string;
  package: {
    title: string;
    dp_deadline_days: number;
    full_deadline_days: number;
  };
  departure: {
    departure_date: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Starting payment reminder check...");

    // Get all bookings that need payment reminders
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        id, booking_code, user_id, total_price, status,
        package:packages(title, dp_deadline_days, full_deadline_days),
        departure:package_departures(departure_date)
      `)
      .in("status", ["draft", "waiting_payment", "partial_paid"]);

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      throw bookingsError;
    }

    console.log(`Found ${bookings?.length || 0} bookings to check`);

    const notifications: Array<{
      user_id: string;
      booking_id: string;
      type: string;
      title: string;
      message: string;
    }> = [];

    const now = new Date();

    for (const booking of (bookings as unknown as BookingWithDetails[]) || []) {
      if (!booking.departure || !booking.package) continue;

      const departureDate = new Date(booking.departure.departure_date);
      const daysUntilDeparture = Math.ceil(
        (departureDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Get total paid amount for this booking
      const { data: payments } = await supabase
        .from("payments")
        .select("amount, status")
        .eq("booking_id", booking.id)
        .eq("status", "paid");

      const paidAmount = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const remainingAmount = booking.total_price - paidAmount;

      if (remainingAmount <= 0) continue; // Already fully paid

      // Check if DP deadline is approaching (3, 7, 14 days before deadline)
      const dpDeadlineDays = booking.package.dp_deadline_days || 30;
      const fullDeadlineDays = booking.package.full_deadline_days || 7;

      const daysUntilDpDeadline = daysUntilDeparture - (dpDeadlineDays > 0 ? dpDeadlineDays : 0);
      const daysUntilFullDeadline = daysUntilDeparture - (fullDeadlineDays > 0 ? fullDeadlineDays : 0);

      // Check for existing notifications today
      const { data: existingNotifications } = await supabase
        .from("notifications")
        .select("id, type, created_at")
        .eq("booking_id", booking.id)
        .gte("created_at", new Date(now.setHours(0, 0, 0, 0)).toISOString());

      const hasNotificationToday = (type: string) =>
        existingNotifications?.some((n) => n.type === type);

      // DP reminder notifications
      if (paidAmount === 0 && !hasNotificationToday("dp_reminder")) {
        if (daysUntilDpDeadline <= 3 && daysUntilDpDeadline > 0) {
          notifications.push({
            user_id: booking.user_id,
            booking_id: booking.id,
            type: "dp_reminder",
            title: "⏰ Deadline DP Mendekat!",
            message: `Booking ${booking.booking_code} - ${booking.package.title}: DP harus dibayar dalam ${daysUntilDpDeadline} hari lagi. Sisa pembayaran: Rp ${remainingAmount.toLocaleString("id-ID")}`,
          });
        } else if (daysUntilDpDeadline <= 7 && daysUntilDpDeadline > 3) {
          notifications.push({
            user_id: booking.user_id,
            booking_id: booking.id,
            type: "dp_reminder",
            title: "📅 Reminder Pembayaran DP",
            message: `Booking ${booking.booking_code} - ${booking.package.title}: Jangan lupa bayar DP sebelum ${daysUntilDpDeadline} hari dari sekarang.`,
          });
        }
      }

      // Full payment reminder notifications
      if (paidAmount > 0 && remainingAmount > 0 && !hasNotificationToday("full_reminder")) {
        if (daysUntilFullDeadline <= 3 && daysUntilFullDeadline > 0) {
          notifications.push({
            user_id: booking.user_id,
            booking_id: booking.id,
            type: "full_reminder",
            title: "🚨 Deadline Pelunasan Mendekat!",
            message: `Booking ${booking.booking_code} - ${booking.package.title}: Pelunasan harus selesai dalam ${daysUntilFullDeadline} hari. Sisa: Rp ${remainingAmount.toLocaleString("id-ID")}`,
          });
        } else if (daysUntilFullDeadline <= 7 && daysUntilFullDeadline > 3) {
          notifications.push({
            user_id: booking.user_id,
            booking_id: booking.id,
            type: "full_reminder",
            title: "📅 Reminder Pelunasan",
            message: `Booking ${booking.booking_code} - ${booking.package.title}: Segera lunasi pembayaran Anda. Sisa: Rp ${remainingAmount.toLocaleString("id-ID")}`,
          });
        }
      }

      // Overdue notifications
      if (daysUntilDpDeadline < 0 && paidAmount === 0 && !hasNotificationToday("overdue")) {
        notifications.push({
          user_id: booking.user_id,
          booking_id: booking.id,
          type: "overdue",
          title: "❌ Pembayaran Melewati Deadline!",
          message: `Booking ${booking.booking_code} - ${booking.package.title}: Pembayaran DP sudah melewati deadline. Segera hubungi admin.`,
        });
      }

      if (daysUntilFullDeadline < 0 && paidAmount > 0 && remainingAmount > 0 && !hasNotificationToday("overdue")) {
        notifications.push({
          user_id: booking.user_id,
          booking_id: booking.id,
          type: "overdue",
          title: "❌ Pelunasan Melewati Deadline!",
          message: `Booking ${booking.booking_code} - ${booking.package.title}: Pelunasan sudah melewati deadline. Segera hubungi admin.`,
        });
      }
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) {
        console.error("Error inserting notifications:", insertError);
        throw insertError;
      }

      console.log(`Created ${notifications.length} notifications`);
    } else {
      console.log("No new notifications to create");
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsCreated: notifications.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error in payment-reminder function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
