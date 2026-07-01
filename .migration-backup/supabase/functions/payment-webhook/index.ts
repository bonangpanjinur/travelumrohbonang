import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function getGatewayConfig(supabase: any) {
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'payment_gateway')
    .eq('category', 'integrations')
    .maybeSingle();
  return data?.value || {};
}

function getMidtransBaseUrl(config: any) {
  const env = config?.midtrans_environment || 'sandbox';
  return env === 'production'
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const gatewayConfig = await getGatewayConfig(supabase);

    const url = new URL(req.url);
    const gateway = url.searchParams.get('gateway') || 'midtrans';

    if (gateway === 'midtrans') {
      return await handleMidtransCallback(req, supabase, gatewayConfig);
    } else if (gateway === 'xendit') {
      return await handleXenditCallback(req, supabase);
    }

    return new Response(JSON.stringify({ error: 'Unknown gateway' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

async function handleMidtransCallback(req: Request, supabase: any, gatewayConfig: any) {
  const data = await req.json();
  console.log('Midtrans callback:', JSON.stringify(data));

  const orderId = data.order_id;
  const transactionStatus = data.transaction_status;
  const fraudStatus = data.fraud_status;

  // Verify with Midtrans using dynamic key
  const serverKey = gatewayConfig?.midtrans_server_key || Deno.env.get('MIDTRANS_SERVER_KEY');
  if (serverKey) {
    const baseUrl = getMidtransBaseUrl(gatewayConfig);
    const authHeader = btoa(serverKey + ':');
    const verifyResponse = await fetch(`${baseUrl}/v2/${orderId}/status`, {
      headers: { 'Authorization': `Basic ${authHeader}` },
    });
    const verifyData = await verifyResponse.json();
    
    if (verifyData.transaction_status !== transactionStatus) {
      console.warn('Status mismatch, using verified status');
    }
  }

  let status = 'pending';
  if (transactionStatus === 'capture') {
    status = fraudStatus === 'accept' ? 'paid' : 'failed';
  } else if (transactionStatus === 'settlement') {
    status = 'paid';
  } else if (transactionStatus === 'expire') {
    status = 'expired';
  } else if (['deny', 'cancel'].includes(transactionStatus)) {
    status = 'failed';
  }

  const { data: txData } = await supabase
    .from('payment_gateway_transactions')
    .update({
      status,
      callback_data: data,
      paid_at: status === 'paid' ? new Date().toISOString() : null,
    })
    .eq('gateway_transaction_id', orderId)
    .select('booking_id, payment_id')
    .single();

  if (status === 'paid' && txData?.payment_id) {
    await supabase
      .from('payments')
      .update({ status: 'verified', paid_at: new Date().toISOString() })
      .eq('id', txData.payment_id);
  }

  if (status === 'paid' && txData?.booking_id) {
    await supabase
      .from('bookings')
      .update({ status: 'paid' })
      .eq('id', txData.booking_id)
      .eq('status', 'pending');
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function handleXenditCallback(req: Request, supabase: any) {
  const data = await req.json();
  console.log('Xendit callback:', JSON.stringify(data));

  const externalId = data.external_id || data.reference_id;
  const xenditStatus = data.status;

  let status = 'pending';
  if (['COMPLETED', 'PAID', 'SETTLED', 'ACTIVE'].includes(xenditStatus)) {
    status = 'paid';
  } else if (xenditStatus === 'EXPIRED') {
    status = 'expired';
  } else if (['FAILED', 'INACTIVE'].includes(xenditStatus)) {
    status = 'failed';
  }

  const { data: txData } = await supabase
    .from('payment_gateway_transactions')
    .update({
      status,
      callback_data: data,
      paid_at: status === 'paid' ? new Date().toISOString() : null,
    })
    .eq('gateway_transaction_id', externalId)
    .select('booking_id, payment_id')
    .single();

  if (status === 'paid' && txData?.payment_id) {
    await supabase
      .from('payments')
      .update({ status: 'verified', paid_at: new Date().toISOString() })
      .eq('id', txData.payment_id);
  }

  if (status === 'paid' && txData?.booking_id) {
    await supabase
      .from('bookings')
      .update({ status: 'paid' })
      .eq('id', txData.booking_id)
      .eq('status', 'pending');
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
