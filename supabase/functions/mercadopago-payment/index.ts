import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MP_API = "https://api.mercadopago.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ACCESS_TOKEN = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
  if (!ACCESS_TOKEN) {
    return new Response(
      JSON.stringify({ error: "MERCADO_PAGO_ACCESS_TOKEN not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === "create-pix") {
      return await createPixPayment(body, ACCESS_TOKEN);
    } else if (action === "create-card") {
      return await createCardPayment(body, ACCESS_TOKEN);
    } else if (action === "create-boleto") {
      return await createBoletoPayment(body, ACCESS_TOKEN);
    } else if (action === "get-status") {
      return await getPaymentStatus(body, ACCESS_TOKEN);
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("MercadoPago error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function createPixPayment(body: any, token: string) {
  const { amount, description, payer_email, payer_cpf, payer_first_name, payer_last_name, external_reference } = body;

  const payload = {
    transaction_amount: Number(amount),
    description: description || "Pedido Elle Make",
    payment_method_id: "pix",
    payer: {
      email: payer_email,
      first_name: payer_first_name || "Cliente",
      last_name: payer_last_name || "",
      identification: {
        type: "CPF",
        number: payer_cpf || "",
      },
    },
    external_reference: external_reference || "",
  };

  const res = await fetch(`${MP_API}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("MP PIX error:", JSON.stringify(data));
    throw new Error(data.message || `MP API error ${res.status}`);
  }

  return new Response(
    JSON.stringify({
      id: data.id,
      status: data.status,
      qr_code: data.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
      ticket_url: data.point_of_interaction?.transaction_data?.ticket_url,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function createCardPayment(body: any, token: string) {
  const {
    amount, description, token: cardToken, installments, payment_method_id,
    payer_email, payer_cpf, payer_first_name, payer_last_name, external_reference,
    issuer_id,
  } = body;

  const payload = {
    transaction_amount: Number(amount),
    token: cardToken,
    description: description || "Pedido Elle Make",
    installments: Number(installments) || 1,
    payment_method_id,
    issuer_id: issuer_id || undefined,
    payer: {
      email: payer_email,
      first_name: payer_first_name || "Cliente",
      last_name: payer_last_name || "",
      identification: {
        type: "CPF",
        number: payer_cpf || "",
      },
    },
    external_reference: external_reference || "",
  };

  const res = await fetch(`${MP_API}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("MP Card error:", JSON.stringify(data));
    throw new Error(data.message || `MP API error ${res.status}`);
  }

  return new Response(
    JSON.stringify({
      id: data.id,
      status: data.status,
      status_detail: data.status_detail,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function createBoletoPayment(body: any, token: string) {
  const { amount, description, payer_email, payer_cpf, payer_first_name, payer_last_name, external_reference } = body;

  const payload = {
    transaction_amount: Number(amount),
    description: description || "Pedido Elle Make",
    payment_method_id: "bolbradesco",
    payer: {
      email: payer_email,
      first_name: payer_first_name || "Cliente",
      last_name: payer_last_name || "",
      identification: {
        type: "CPF",
        number: payer_cpf || "",
      },
    },
    external_reference: external_reference || "",
  };

  const res = await fetch(`${MP_API}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("MP Boleto error:", JSON.stringify(data));
    throw new Error(data.message || `MP API error ${res.status}`);
  }

  return new Response(
    JSON.stringify({
      id: data.id,
      status: data.status,
      barcode: data.barcode?.content,
      boleto_url: data.transaction_details?.external_resource_url,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function getPaymentStatus(body: any, token: string) {
  const { payment_id } = body;
  const res = await fetch(`${MP_API}/v1/payments/${payment_id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`MP API error ${res.status}`);

  return new Response(
    JSON.stringify({ id: data.id, status: data.status, status_detail: data.status_detail }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
