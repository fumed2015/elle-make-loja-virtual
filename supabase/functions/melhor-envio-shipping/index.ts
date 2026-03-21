import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MELHOR_ENVIO_API = "https://melhorenvio.com.br";
const CEP_ORIGEM = "66035065"; // Belém-PA

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("MELHOR_ENVIO_TOKEN");
    if (!token) {
      throw new Error("MELHOR_ENVIO_TOKEN not configured");
    }

    const { cep_destino, products } = await req.json();

    if (!cep_destino || typeof cep_destino !== "string") {
      return new Response(JSON.stringify({ error: "CEP de destino é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default product dimensions if none provided
    const defaultProducts = [
      {
        id: "default",
        width: 15,
        height: 10,
        length: 20,
        weight: 0.5,
        insurance_value: 50,
        quantity: 1,
      },
    ];

    const payload = {
      from: { postal_code: CEP_ORIGEM },
      to: { postal_code: cep_destino.replace(/\D/g, "") },
      products: products && products.length > 0 ? products : defaultProducts,
    };

    console.log("Melhor Envio request payload:", JSON.stringify(payload));

    const response = await fetch(`${MELHOR_ENVIO_API}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "User-Agent": "ElleMake (ellemakeloja@gmail.com)",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Melhor Envio API error:", JSON.stringify(data));
      throw new Error(`Melhor Envio API error [${response.status}]: ${JSON.stringify(data)}`);
    }

    console.log("Melhor Envio raw response:", JSON.stringify(data));

    // Filter only available services and format response
    const options = (Array.isArray(data) ? data : [])
      .filter((s: any) => !s.error && s.price && s.company?.id === 1)
      .map((s: any) => ({
        id: String(s.id),
        name: s.name,
        company: s.company?.name || "",
        price: parseFloat(s.custom_price || s.price),
        days: s.custom_delivery_time || s.delivery_time,
        currency: s.currency || "R$",
      }));

    return new Response(JSON.stringify({ options }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Shipping calculation error:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
