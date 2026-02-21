import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const YAMPI_API_BASE = 'https://api.dooki.com.br/v2';
const YAMPI_ALIAS = 'elle-make';

function buildCheckoutUrl(customer: any, address: any): string {
  const base = `https://${YAMPI_ALIAS}.checkout.yampi.com.br`;
  const params = new URLSearchParams();

  if (customer?.name) {
    const parts = customer.name.trim().split(' ');
    params.set('first_name', parts[0] || '');
    if (parts.length > 1) params.set('last_name', parts.slice(1).join(' '));
  }
  if (customer?.email) params.set('email', customer.email);
  if (customer?.phone) params.set('phone', customer.phone.replace(/\D/g, ''));
  if (customer?.cpf) params.set('cpf', customer.cpf.replace(/\D/g, ''));

  if (address?.zip) params.set('zipcode', address.zip.replace(/\D/g, ''));
  if (address?.street) params.set('street', address.street);
  if (address?.number) params.set('number', address.number);
  if (address?.complement) params.set('complement', address.complement);
  if (address?.neighborhood) params.set('neighborhood', address.neighborhood);
  if (address?.city) params.set('city', address.city);
  if (address?.state) params.set('state', address.state);

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const YAMPI_USER_TOKEN = Deno.env.get('YAMPI_USER_TOKEN');
  const YAMPI_USER_SECRET_KEY = Deno.env.get('YAMPI_USER_SECRET_KEY');

  if (!YAMPI_USER_TOKEN || !YAMPI_USER_SECRET_KEY) {
    return new Response(JSON.stringify({ error: 'Yampi credentials not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { action, ...payload } = await req.json();

    const yampiHeaders = {
      'Content-Type': 'application/json',
      'User-Token': YAMPI_USER_TOKEN,
      'User-Secret-Key': YAMPI_USER_SECRET_KEY,
    };

    if (action === 'create-order') {
      const { items, customer, address, total, discount, coupon_code, supabase_order_id } = payload;

      // Build pre-filled checkout URL
      const checkoutUrl = buildCheckoutUrl(customer, address);

      // Find or create customer in Yampi
      let yampiCustomerId: number | null = null;

      const searchRes = await fetch(
        `${YAMPI_API_BASE}/${YAMPI_ALIAS}/customers?q=${encodeURIComponent(customer.email)}&limit=1`,
        { headers: yampiHeaders }
      );
      const searchData = await searchRes.json();

      if (searchData.data && searchData.data.length > 0) {
        yampiCustomerId = searchData.data[0].id;
      } else {
        const createCustomerRes = await fetch(
          `${YAMPI_API_BASE}/${YAMPI_ALIAS}/customers`,
          {
            method: 'POST',
            headers: yampiHeaders,
            body: JSON.stringify({
              first_name: customer.name?.split(' ')[0] || 'Cliente',
              last_name: customer.name?.split(' ').slice(1).join(' ') || '',
              email: customer.email,
              cpf: customer.cpf?.replace(/\D/g, '') || '00000000000',
              phone: { full_number: customer.phone?.replace(/\D/g, '') || '91999999999' },
            }),
          }
        );
        const customerData = await createCustomerRes.json();
        if (createCustomerRes.ok) {
          yampiCustomerId = customerData.data?.id;
        } else {
          console.error('Failed to create customer:', JSON.stringify(customerData));
        }
      }

      // Create the order
      const orderPayload: Record<string, any> = {
        status: 'waiting_payment',
        customer_id: yampiCustomerId || 1,
        value_total: total,
        value_products: total + (discount || 0),
        value_discount: discount || 0,
        value_shipment: 0,
        shipment_service: 'Entrega Local',
        days_delivery: 1,
        ip: '0.0.0.0',
        items: items.map((item: any, index: number) => ({
          product_id: index + 1,
          sku_id: index + 1,
          sku: item.product_id,
          quantity: item.quantity,
          price: item.price,
          gift: false,
          gift_value: 0,
          has_recomm: false,
        })),
        address: [
          {
            receiver: customer.name || 'Cliente',
            zipcode: address.zip?.replace(/\D/g, '') || '66000000',
            street: address.street || '',
            number: address.number || 'S/N',
            neighborhood: address.neighborhood || '',
            city: address.city || 'Belém',
            uf: address.state || 'PA',
          },
        ],
      };

      const orderRes = await fetch(
        `${YAMPI_API_BASE}/${YAMPI_ALIAS}/orders`,
        {
          method: 'POST',
          headers: yampiHeaders,
          body: JSON.stringify(orderPayload),
        }
      );

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        console.error('Yampi order creation failed:', JSON.stringify(orderData));
        return new Response(JSON.stringify({
          success: true,
          checkout_url: checkoutUrl,
          yampi_order: null,
          fallback: true,
          message: 'Redirecionando ao checkout Yampi',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const yampiOrderNumber = orderData.number || orderData.data?.number;

      return new Response(JSON.stringify({
        success: true,
        checkout_url: checkoutUrl,
        yampi_order_number: yampiOrderNumber,
        yampi_order_id: orderData.data?.id || orderData.id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get-checkout-url') {
      const { customer, address } = payload;
      const checkoutUrl = buildCheckoutUrl(customer, address);
      return new Response(JSON.stringify({
        success: true,
        checkout_url: checkoutUrl,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'webhook') {
      const { event, resource } = payload;
      console.log('Yampi webhook received:', event, JSON.stringify(resource));

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      if (event === 'order.paid') {
        const yampiOrderId = resource?.id;
        if (yampiOrderId) {
          console.log(`Order ${yampiOrderId} marked as paid in Yampi`);
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Yampi checkout error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
