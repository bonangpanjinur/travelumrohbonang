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

function getXenditBaseUrl() {
  return 'https://api.xendit.co';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Load gateway config from DB
    const gatewayConfig = await getGatewayConfig(supabase);

    const { action, gateway, booking_id, amount, bank_code, payment_method, customer_name, customer_email, order_id } = await req.json();

    if (action === 'create_payment') {
      if (gateway === 'midtrans') {
        return await createMidtransPayment({ supabase, gatewayConfig, booking_id, amount, bank_code, payment_method, customer_name, customer_email, order_id });
      } else if (gateway === 'xendit') {
        return await createXenditPayment({ supabase, gatewayConfig, booking_id, amount, bank_code, payment_method, customer_name, customer_email, order_id });
      }
      return new Response(JSON.stringify({ error: 'Gateway tidak valid' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'check_status') {
      return await checkPaymentStatus({ supabase, gatewayConfig, gateway, gateway_transaction_id: order_id });
    }

    return new Response(JSON.stringify({ error: 'Action tidak valid' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('Payment gateway error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

async function createMidtransPayment({ supabase, gatewayConfig, booking_id, amount, bank_code, payment_method, customer_name, customer_email, order_id }: any) {
  // Read key from DB config first, fallback to env var
  const serverKey = gatewayConfig?.midtrans_server_key || Deno.env.get('MIDTRANS_SERVER_KEY');
  if (!serverKey) {
    return new Response(JSON.stringify({ error: 'Midtrans Server Key belum dikonfigurasi. Silakan atur di Pengaturan → Payment Gateway.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const baseUrl = getMidtransBaseUrl(gatewayConfig);
  const authHeader = btoa(serverKey + ':');
  const txId = order_id || `TRX-${Date.now()}`;

  let body: any = {
    payment_type: payment_method === 'bank_transfer' ? 'bank_transfer' : payment_method,
    transaction_details: {
      order_id: txId,
      gross_amount: amount,
    },
    customer_details: {
      first_name: customer_name || 'Customer',
      email: customer_email || '',
    },
  };

  if (payment_method === 'bank_transfer') {
    body.bank_transfer = { bank: bank_code || 'bca' };
  }

  const response = await fetch(`${baseUrl}/v2/charge`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Basic ${authHeader}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok || (data.status_code && parseInt(data.status_code) >= 400)) {
    return new Response(JSON.stringify({ error: data.status_message || 'Midtrans error', details: data }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let vaNumber = '';
  if (data.va_numbers && data.va_numbers.length > 0) {
    vaNumber = data.va_numbers[0].va_number;
  } else if (data.permata_va_number) {
    vaNumber = data.permata_va_number;
  }

  const { data: txRecord, error: dbError } = await supabase
    .from('payment_gateway_transactions')
    .insert({
      booking_id,
      gateway: 'midtrans',
      gateway_transaction_id: txId,
      payment_method,
      bank_code: bank_code || null,
      va_number: vaNumber,
      amount,
      status: 'pending',
      expiry_time: data.expiry_time ? new Date(data.expiry_time).toISOString() : null,
      callback_data: data,
    })
    .select()
    .single();

  if (dbError) console.error('DB error:', dbError);

  return new Response(JSON.stringify({
    success: true,
    gateway: 'midtrans',
    transaction_id: txId,
    va_number: vaNumber,
    amount,
    status: data.transaction_status || 'pending',
    expiry_time: data.expiry_time,
    raw: data,
    db_record: txRecord,
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function createXenditPayment({ supabase, gatewayConfig, booking_id, amount, bank_code, payment_method, customer_name, customer_email, order_id }: any) {
  const secretKey = gatewayConfig?.xendit_secret_key || Deno.env.get('XENDIT_SECRET_KEY');
  if (!secretKey) {
    return new Response(JSON.stringify({ error: 'Xendit Secret Key belum dikonfigurasi. Silakan atur di Pengaturan → Payment Gateway.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const baseUrl = getXenditBaseUrl();
  const authHeader = btoa(secretKey + ':');
  const txId = order_id || `TRX-${Date.now()}`;

  let endpoint = '';
  let body: any = {};

  if (payment_method === 'bank_transfer') {
    endpoint = '/callback_virtual_accounts';
    body = {
      external_id: txId,
      bank_code: (bank_code || 'BCA').toUpperCase(),
      name: customer_name || 'Customer',
      expected_amount: amount,
      is_closed: true,
      is_single_use: true,
    };
  } else if (payment_method === 'qris') {
    endpoint = '/qr_codes';
    body = {
      reference_id: txId,
      type: 'DYNAMIC',
      currency: 'IDR',
      amount: amount,
    };
  } else {
    endpoint = '/v2/invoices';
    body = {
      external_id: txId,
      amount: amount,
      payer_email: customer_email || '',
      description: `Pembayaran booking ${booking_id || ''}`,
    };
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${authHeader}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    return new Response(JSON.stringify({ error: data.message || 'Xendit error', details: data }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const vaNumber = data.account_number || data.id || '';
  const expiryTime = data.expiration_date || null;

  const { data: txRecord, error: dbError } = await supabase
    .from('payment_gateway_transactions')
    .insert({
      booking_id,
      gateway: 'xendit',
      gateway_transaction_id: txId,
      payment_method,
      bank_code: bank_code ? bank_code.toUpperCase() : null,
      va_number: vaNumber,
      amount,
      status: 'pending',
      expiry_time: expiryTime ? new Date(expiryTime).toISOString() : null,
      callback_data: data,
    })
    .select()
    .single();

  if (dbError) console.error('DB error:', dbError);

  return new Response(JSON.stringify({
    success: true,
    gateway: 'xendit',
    transaction_id: txId,
    va_number: vaNumber,
    amount,
    status: 'pending',
    expiry_time: expiryTime,
    raw: data,
    db_record: txRecord,
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function checkPaymentStatus({ supabase, gatewayConfig, gateway, gateway_transaction_id }: any) {
  if (gateway === 'midtrans') {
    const serverKey = gatewayConfig?.midtrans_server_key || Deno.env.get('MIDTRANS_SERVER_KEY');
    if (!serverKey) {
      return new Response(JSON.stringify({ error: 'Midtrans Server Key belum dikonfigurasi' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const baseUrl = getMidtransBaseUrl(gatewayConfig);
    const authHeader = btoa(serverKey + ':');
    const response = await fetch(`${baseUrl}/v2/${gateway_transaction_id}/status`, {
      headers: { 'Authorization': `Basic ${authHeader}` },
    });
    const data = await response.json();

    let status = 'pending';
    if (['capture', 'settlement'].includes(data.transaction_status)) status = 'paid';
    else if (data.transaction_status === 'expire') status = 'expired';
    else if (['deny', 'cancel'].includes(data.transaction_status)) status = 'failed';

    await supabase
      .from('payment_gateway_transactions')
      .update({ status, callback_data: data, paid_at: status === 'paid' ? new Date().toISOString() : null })
      .eq('gateway_transaction_id', gateway_transaction_id);

    return new Response(JSON.stringify({ status, raw: data }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ error: 'Check status via webhook untuk Xendit' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
