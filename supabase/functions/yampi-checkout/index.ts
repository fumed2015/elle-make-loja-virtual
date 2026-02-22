import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const YAMPI_API_BASE = 'https://api.dooki.com.br/v2';
const YAMPI_ALIAS = 'elle-make';
const MERCHANT_NAME = 'Elle Make';

// ===== Z-API WhatsApp Helper =====
async function sendWhatsApp(phone: string, message: string): Promise<any> {
  const instanceId = Deno.env.get('ZAPI_INSTANCE_ID');
  const token = Deno.env.get('ZAPI_TOKEN');
  const clientToken = Deno.env.get('ZAPI_CLIENT_TOKEN');

  if (!instanceId || !token) {
    console.error('Z-API credentials not configured');
    return { error: 'Z-API not configured' };
  }

  // Normalize phone: ensure 55 prefix, remove non-digits
  let cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone.startsWith('55')) cleanPhone = '55' + cleanPhone;

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (clientToken) {
    headers['Client-Token'] = clientToken;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        phone: cleanPhone,
        message,
      }),
    });
    const data = await res.json();
    console.log(`Z-API response for ${cleanPhone}:`, JSON.stringify(data));
    return data;
  } catch (err) {
    console.error('Z-API send error:', err);
    return { error: String(err) };
  }
}

// ===== Message Templates (fallback) =====
function buildMessageFromTemplate(template: string, data: Record<string, any>): string {
  return template
    .replace(/{first_name}/g, data.first_name || 'Cliente')
    .replace(/{merchant}/g, MERCHANT_NAME)
    .replace(/{products_list}/g, data.products_list || '')
    .replace(/{total}/g, data.total || '0,00')
    .replace(/{tracking_code}/g, data.tracking_code || 'N/A')
    .replace(/{tracking_url}/g, data.tracking_url || '')
    .replace(/{link}/g, data.link || '');
}

const FALLBACK_TEMPLATES: Record<string, string> = {
  'order.created': '🛒 Oi {first_name}! Seu pedido na *{merchant}* foi recebido! 🎉\n\n{products_list}\n\n💰 Total: R$ {total}\n\nVamos te avisar! 💕',
  'order.paid': '✅ {first_name}, pagamento *confirmado*! 🎉\n\n{products_list}\n\nPreparando com carinho! 💖',
  'order.shipped': '📦 {first_name}, produtos *a caminho*! 🚚\n\n{products_list}\n\nRastreio: *{tracking_code}*\n{tracking_url}',
  'order.delivered': '🎉 {first_name}, pedido *entregue*! 💖\n\n{products_list}\n\nConta o que achou! ⭐',
  'checkout.abandoned': '💄 Oi {first_name}! Esqueceu seus produtos na *{merchant}*:\n\n{products_list}\n\n👉 {link}',
};

async function buildMessage(eventType: string, data: Record<string, any>, supabase: any): Promise<string> {
  try {
    const { data: tmpl } = await supabase
      .from('message_templates')
      .select('template, is_active')
      .eq('event_type', eventType)
      .eq('is_active', true)
      .maybeSingle();

    if (tmpl?.template) {
      return buildMessageFromTemplate(tmpl.template, data);
    }
  } catch (e) {
    console.error('Error fetching template:', e);
  }

  const fallback = FALLBACK_TEMPLATES[eventType] || `Oi {first_name}! Atualização do pedido na *{merchant}*: ${eventType}`;
  return buildMessageFromTemplate(fallback, data);
}

function formatProductsList(items: any[]): string {
  if (!items || items.length === 0) return '';
  return items.map((item: any) => {
    const name = item.name || item.product_name || 'Produto';
    const qty = item.quantity || 1;
    const price = item.price || item.price_sale || 0;
    return `• ${name} (${qty}x) — R$ ${Number(price).toFixed(2).replace('.', ',')}`;
  }).join('\n');
}

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

  if (customer?.coupon_code) params.set('coupon', customer.coupon_code);

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
    const body = await req.json();

    // Auto-detect Yampi webhook (no "action" field, but has "event" + "resource")
    const action = body.action || (body.event && body.resource ? 'webhook' : undefined);
    const payload = action === 'webhook' && !body.action
      ? { event: body.event, resource: body.resource }
      : (() => { const { action: _a, ...rest } = body; return rest; })();

    const yampiHeaders = {
      'Content-Type': 'application/json',
      'User-Token': YAMPI_USER_TOKEN,
      'User-Secret-Key': YAMPI_USER_SECRET_KEY,
    };

    // ===== CREATE ORDER =====
    if (action === 'create-order') {
      const { items, customer, address, total, discount, coupon_code, supabase_order_id } = payload;

      const checkoutUrl = buildCheckoutUrl({ ...customer, coupon_code }, address);

      // Try to find or create customer in Yampi for tracking purposes
      let yampiCustomerId: number | null = null;
      try {
        const searchRes = await fetch(
          `${YAMPI_API_BASE}/${YAMPI_ALIAS}/customers?q=${encodeURIComponent(customer.email)}&limit=1`,
          { headers: yampiHeaders }
        );
        const searchData = await searchRes.json();

        if (searchData.data && searchData.data.length > 0) {
          yampiCustomerId = searchData.data[0].id;
        } else {
          const cleanPhone = (customer.phone || '').replace(/\D/g, '');
          const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
          const nameParts = (customer.name || 'Cliente').trim().split(' ');

          const createRes = await fetch(
            `${YAMPI_API_BASE}/${YAMPI_ALIAS}/customers`,
            {
              method: 'POST',
              headers: yampiHeaders,
              body: JSON.stringify({
                first_name: nameParts[0],
                last_name: nameParts.slice(1).join(' ') || nameParts[0],
                name: customer.name || 'Cliente',
                email: customer.email,
                cpf: (customer.cpf || '').replace(/\D/g, ''),
                type: 'f',
                phone: { full_number: fullPhone },
                homephone: { full_number: fullPhone },
              }),
            }
          );
          const createData = await createRes.json();
          if (createRes.ok) {
            yampiCustomerId = createData.data?.id;
            console.log('Yampi customer created:', yampiCustomerId);
          } else {
            console.warn('Yampi customer creation skipped:', JSON.stringify(createData));
          }
        }
      } catch (custErr) {
        console.warn('Yampi customer lookup skipped:', String(custErr));
      }

      // Redirect to Yampi checkout with pre-filled data
      // Order is already saved in our database; Yampi checkout handles payment
      return new Response(JSON.stringify({
        success: true,
        checkout_url: checkoutUrl,
        yampi_customer_id: yampiCustomerId,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ===== GET CHECKOUT URL =====
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

    // ===== WEBHOOK RECEIVER =====
    if (action === 'webhook') {
      const { event, resource } = payload;
      console.log('Yampi webhook received:', event, JSON.stringify(resource));

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Extract customer info from webhook resource
      const customerData = resource?.customer?.data || resource?.customer || {};
      const phone = customerData?.phone?.full_number || customerData?.phone || '';
      const firstName = customerData?.first_name || customerData?.name?.split(' ')[0] || 'Cliente';

      // Extract items
      const rawItems = resource?.items?.data || resource?.items || [];
      const productsList = formatProductsList(rawItems);
      const total = resource?.value_total || resource?.total || 0;
      const totalFormatted = Number(total).toFixed(2).replace('.', ',');

      // Tracking info
      const trackingCode = resource?.tracking?.code || resource?.tracking_code || '';
      const trackingUrl = resource?.tracking?.url || resource?.tracking_url || '';

      // Build message data
      const messageData: Record<string, any> = {
        first_name: firstName,
        products_list: productsList,
        total: totalFormatted,
        tracking_code: trackingCode,
        tracking_url: trackingUrl,
        link: resource?.checkout_url || resource?.link || '',
      };

      // Map Yampi events to our event types
      const eventMap: Record<string, string> = {
        'order.created': 'order.created',
        'order.paid': 'order.paid',
        'order.shipped': 'order.shipped',
        'order.delivered': 'order.delivered',
        'order.status.updated': resource?.status === 'shipped' ? 'order.shipped' : 
                                 resource?.status === 'delivered' ? 'order.delivered' : '',
        'checkout.abandoned': 'checkout.abandoned',
        'abandoned_cart': 'checkout.abandoned',
      };

      const mappedEvent = eventMap[event] || event;

      // Update order status in our DB if we can match it
      const yampiOrderId = resource?.id || resource?.order_id;
      if (yampiOrderId && ['order.paid', 'order.shipped', 'order.delivered'].includes(mappedEvent)) {
        const statusMap: Record<string, string> = {
          'order.paid': 'paid',
          'order.shipped': 'shipped',
          'order.delivered': 'delivered',
        };

        // Try to find and update the order by matching yampi data
        const updateData: Record<string, any> = {
          status: statusMap[mappedEvent] || 'processing',
        };

        if (trackingCode) updateData.tracking_code = trackingCode;
        if (trackingUrl) updateData.tracking_url = trackingUrl;

        // Update orders that match the customer email
        if (customerData?.email) {
          // Find user by email -> get their orders
          const { data: authUsers } = await supabase.auth.admin.listUsers();
          const matchedUser = authUsers?.users?.find(
            (u: any) => u.email === customerData.email
          );

          if (matchedUser) {
            const { data: orders } = await supabase
              .from('orders')
              .select('id')
              .eq('user_id', matchedUser.id)
              .eq('status', mappedEvent === 'order.paid' ? 'pending' : 
                   mappedEvent === 'order.shipped' ? 'paid' : 'shipped')
              .order('created_at', { ascending: false })
              .limit(1);

            if (orders && orders.length > 0) {
              await supabase
                .from('orders')
                .update(updateData)
                .eq('id', orders[0].id);
              console.log(`Order ${orders[0].id} updated to ${updateData.status}`);
            }
          }
        }
      }

      // Send WhatsApp notification if we have a phone number
      if (phone && mappedEvent) {
        const message = await buildMessage(mappedEvent, messageData, supabase);
        const zapiResponse = await sendWhatsApp(phone, message);

        // Log notification
        await supabase.from('notifications').insert({
          event_type: mappedEvent,
          phone,
          message,
          status: zapiResponse?.error ? 'failed' : 'sent',
          zapi_response: zapiResponse,
        });

        console.log(`WhatsApp sent for ${mappedEvent} to ${phone}`);
      } else {
        console.log(`Skipped WhatsApp: no phone for event ${event}`);
      }

      return new Response(JSON.stringify({ received: true, event: mappedEvent }), {
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
