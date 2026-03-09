import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type } = await req.json();

    // Gather data for analysis
    const [bookingsRes, leadsRes, paymentsRes, departuresRes] = await Promise.all([
      supabase.from('bookings').select('id, booking_code, total_price, status, created_at, package_id, packages(title)').order('created_at', { ascending: false }).limit(500),
      supabase.from('leads').select('id, name, status, source, created_at, package_interest').order('created_at', { ascending: false }).limit(500),
      supabase.from('payments').select('id, amount, status, paid_at, created_at, payment_type').order('created_at', { ascending: false }).limit(500),
      supabase.from('package_departures').select('id, departure_date, quota, remaining_quota, status, packages(title)').order('departure_date', { ascending: true }).limit(100),
    ]);

    const bookings = bookingsRes.data || [];
    const leads = leadsRes.data || [];
    const payments = paymentsRes.data || [];
    const departures = departuresRes.data || [];

    // Build data summary for AI
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Monthly booking stats
    const monthlyBookings: Record<string, { count: number; revenue: number }> = {};
    bookings.forEach((b: any) => {
      const month = b.created_at?.slice(0, 7);
      if (!month) return;
      if (!monthlyBookings[month]) monthlyBookings[month] = { count: 0, revenue: 0 };
      monthlyBookings[month].count++;
      if (b.status === 'paid') monthlyBookings[month].revenue += Number(b.total_price) || 0;
    });

    // Lead conversion stats
    const totalLeads = leads.length;
    const convertedLeads = leads.filter((l: any) => l.status === 'converted').length;
    const leadsBySource: Record<string, number> = {};
    const leadsByStatus: Record<string, number> = {};
    leads.forEach((l: any) => {
      leadsBySource[l.source || 'unknown'] = (leadsBySource[l.source || 'unknown'] || 0) + 1;
      leadsByStatus[l.status] = (leadsByStatus[l.status] || 0) + 1;
    });

    // Payment stats
    const totalRevenue = payments.filter((p: any) => p.status === 'verified').reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
    const pendingPayments = payments.filter((p: any) => p.status === 'pending').length;

    // Departure stats
    const upcomingDepartures = departures.filter((d: any) => new Date(d.departure_date) > now);
    const totalQuota = upcomingDepartures.reduce((sum: number, d: any) => sum + (d.quota || 0), 0);
    const remainingQuota = upcomingDepartures.reduce((sum: number, d: any) => sum + (d.remaining_quota || 0), 0);

    const dataSummary = `
DATA BISNIS TRAVEL UMROH (Per ${now.toISOString().slice(0, 10)}):

BOOKING:
- Total booking: ${bookings.length}
- Booking per bulan: ${JSON.stringify(monthlyBookings)}
- Status booking: ${JSON.stringify(bookings.reduce((acc: any, b: any) => { acc[b.status || 'unknown'] = (acc[b.status || 'unknown'] || 0) + 1; return acc; }, {}))}

LEADS/PROSPEK:
- Total leads: ${totalLeads}
- Converted: ${convertedLeads} (${totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0}%)
- Lead by source: ${JSON.stringify(leadsBySource)}
- Lead by status: ${JSON.stringify(leadsByStatus)}

KEUANGAN:
- Total revenue (terverifikasi): Rp ${totalRevenue.toLocaleString('id-ID')}
- Pembayaran pending: ${pendingPayments}

KEBERANGKATAN:
- Keberangkatan mendatang: ${upcomingDepartures.length}
- Total kuota: ${totalQuota}, Sisa kuota: ${remainingQuota}
- Tingkat terisi: ${totalQuota > 0 ? (((totalQuota - remainingQuota) / totalQuota) * 100).toFixed(1) : 0}%
`;

    let systemPrompt = '';

    if (type === 'full_analysis') {
      systemPrompt = `Kamu adalah analis bisnis AI untuk perusahaan travel umroh. Analisis data berikut dan berikan laporan komprehensif dalam Bahasa Indonesia dengan format berikut:

## 📊 Ringkasan Eksekutif
Rangkuman singkat kondisi bisnis saat ini.

## 📈 Tren Penjualan
Analisis tren booking bulanan, identifikasi pola naik/turun, dan musim ramai.

## 💰 Forecasting Revenue
Prediksi pendapatan 3 bulan ke depan berdasarkan tren historis. Berikan angka estimasi.

## 🎯 Konversi Lead-to-Booking
Analisis rasio konversi, identifikasi sumber lead terbaik, dan rekomendasi improvement.

## ⚠️ Peringatan & Risiko
Identifikasi potensi masalah (kuota hampir habis, pembayaran menumpuk, dll).

## 💡 Rekomendasi Aksi
5 aksi prioritas yang harus segera dilakukan untuk meningkatkan bisnis.

Gunakan angka dan persentase konkret. Format dengan markdown.`;
    } else if (type === 'revenue_forecast') {
      systemPrompt = `Kamu adalah analis keuangan AI. Berdasarkan data booking dan pembayaran, buat forecasting revenue 3 bulan ke depan. Berikan prediksi per bulan dengan range optimis dan konservatif. Jelaskan faktor-faktor yang mempengaruhi. Format dalam Bahasa Indonesia dengan markdown.`;
    } else if (type === 'lead_analysis') {
      systemPrompt = `Kamu adalah spesialis CRM AI. Analisis data leads dan berikan insight konversi lead-to-booking. Identifikasi sumber lead terbaik, bottleneck di pipeline, dan rekomendasi untuk meningkatkan konversi. Format dalam Bahasa Indonesia dengan markdown.`;
    } else {
      systemPrompt = `Kamu adalah asisten analitik bisnis travel umroh. Jawab pertanyaan berdasarkan data yang diberikan. Gunakan Bahasa Indonesia.`;
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: dataSummary },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit tercapai, coba lagi nanti.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Kredit AI habis, silakan top up di Settings → Workspace → Usage.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await response.text();
      console.error('AI gateway error:', response.status, t);
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error: unknown) {
    console.error('Analytics AI error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
