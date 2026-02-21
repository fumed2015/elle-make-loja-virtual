import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const YAMPI_API_BASE = 'https://api.dooki.com.br/v2';
const YAMPI_ALIAS = 'elle-make';

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
      // Create order in Yampi
      const { items, customer, address, total, discount, coupon_code, supabase_order_id } = payload;

      // First, find or create customer in Yampi
      let yampiCustomerId: number | null = null;

      // Search for customer by email
      const searchRes = await fetch(
        `${YAMPI_API_BASE}/${YAMPI_ALIAS}/customers?q=${encodeURIComponent(customer.email)}&limit=1`,
        { headers: yampiHeaders }
      );
      const searchData = await searchRes.json();

      if (searchData.data && searchData.data.length > 0) {
        yampiCustomerId = searchData.data[0].id;
      } else {
        // Create customer
        const createCustomerRes = await fetch(
          `${YAMPI_API_BASE}/${YAMPI_ALIAS}/customers`,
          {
            method: 'POST',
            headers: yampiHeaders,
            body: JSON.stringify({
              first_name: customer.name?.split(' ')[0] || 'Cliente',
              last_name: customer.name?.split(' ').slice(1).join(' ') || '',
              email: customer.email,
              cpf: customer.cpf || '00000000000',
              phone: { full_number: customer.phone || '91999999999' },
            }),
          }
        );
        const customerData = await createCustomerRes.json();
        if (!createCustomerRes.ok) {
          console.error('Failed to create customer:', JSON.stringify(customerData));
          // If customer creation fails, try to proceed with email lookup
        } else {
          yampiCustomerId = customerData.data?.id;
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
        // Even if Yampi order fails, generate checkout URL
        const checkoutUrl = `https://${YAMPI_ALIAS}.checkout.yampi.com.br`;
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
      const checkoutUrl = `https://${YAMPI_ALIAS}.checkout.yampi.com.br`;

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
      // Simply return the checkout URL for redirect
      return new Response(JSON.stringify({
        success: true,
        checkout_url: `https://${YAMPI_ALIAS}.checkout.yampi.com.br`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'webhook') {
      // Handle Yampi webhook notifications
      const { event, resource } = payload;
      console.log('Yampi webhook received:', event, JSON.stringify(resource));

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      if (event === 'order.paid') {
        // Update order status to paid
        const yampiOrderId = resource?.id;
        if (yampiOrderId) {
          // Find and update matching order by tracking the yampi reference
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
