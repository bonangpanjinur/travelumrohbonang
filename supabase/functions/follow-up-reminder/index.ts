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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find overdue and today's follow-ups that haven't been done
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: pendingFollowUps, error } = await supabase
      .from('lead_follow_ups')
      .select('*, leads(name, phone, assigned_to)')
      .eq('is_done', false)
      .lte('follow_up_date', endOfDay.toISOString())
      .order('follow_up_date', { ascending: true });

    if (error) throw error;

    let notificationsCreated = 0;

    for (const followUp of (pendingFollowUps || [])) {
      const lead = followUp.leads as any;
      if (!lead) continue;

      // Determine who to notify - assigned_to or created_by
      const targetUserId = lead.assigned_to || followUp.created_by;
      if (!targetUserId) continue;

      const isOverdue = new Date(followUp.follow_up_date) < now;
      const urgency = isOverdue ? '🔴 OVERDUE' : '🟡 Hari Ini';
      const typeLabel = followUp.type === 'call' ? 'Telepon' :
                        followUp.type === 'whatsapp' ? 'WhatsApp' :
                        followUp.type === 'email' ? 'Email' : 'Meeting';

      // Check if notification already exists for this follow-up today
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('type', 'follow_up_reminder')
        .gte('created_at', todayStart.toISOString())
        .like('message', `%${followUp.id}%`)
        .maybeSingle();

      if (existing) continue; // Already notified today

      await supabase.from('notifications').insert({
        user_id: targetUserId,
        title: `${urgency} Follow-up: ${lead.name}`,
        message: `Jadwal ${typeLabel} untuk ${lead.name} (${lead.phone || 'No HP'}). ${followUp.notes || ''} [ref:${followUp.id}]`,
        type: 'follow_up_reminder',
      });

      notificationsCreated++;
    }

    return new Response(JSON.stringify({
      success: true,
      pending_follow_ups: pendingFollowUps?.length || 0,
      notifications_created: notificationsCreated,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('Follow-up reminder error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
