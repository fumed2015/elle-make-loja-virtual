import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { CartRecoveryEmail } from '../_shared/email-templates/cart-recovery.tsx'
import { OrderConfirmationEmail } from '../_shared/email-templates/order-confirmation.tsx'
import { WelcomeEmail } from '../_shared/email-templates/welcome.tsx'
import { ReviewRequestEmail } from '../_shared/email-templates/review-request.tsx'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SENDER_DOMAIN = 'store.ellemake.com.br'
const FROM_ADDRESS = `Elle Make <noreply@ellemake.com.br>`
const SITE_URL = 'https://ellemake.com.br'

const SUBJECTS: Record<string, string> = {
  'cart-recovery': '💄 Seus produtos estão esperando por você!',
  'order-confirmation': '🎉 Pedido confirmado!',
  'welcome': '💄 Bem-vinda à Elle Make!',
  'review-request': '⭐ Como foi sua experiência?',
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const body = await req.json()
    const { template, to, data } = body as {
      template: string
      to: string
      data: Record<string, unknown>
    }

    if (!template || !to) {
      return jsonResponse({ error: 'template and to are required' }, 400)
    }

    // Check suppression list
    const { data: suppressed } = await supabase
      .from('suppressed_emails')
      .select('id')
      .eq('email', to)
      .maybeSingle()

    if (suppressed) {
      return jsonResponse({ skipped: true, reason: 'email_suppressed' })
    }

    // Render template
    let element: React.ReactElement

    switch (template) {
      case 'cart-recovery':
        element = React.createElement(CartRecoveryEmail, data as any)
        break
      case 'order-confirmation':
        element = React.createElement(OrderConfirmationEmail, data as any)
        break
      case 'welcome':
        element = React.createElement(WelcomeEmail, data as any)
        break
      case 'review-request':
        element = React.createElement(ReviewRequestEmail, data as any)
        break
      default:
        return jsonResponse({ error: `Unknown template: ${template}` }, 400)
    }

    const html = await renderAsync(element)
    const subject = data?.subject as string || SUBJECTS[template] || 'Elle Make'

    // Enqueue email via pgmq
    const messageId = crypto.randomUUID()
    const { error: enqueueError } = await supabase.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        run_id: messageId,
        to,
        from: FROM_ADDRESS,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        purpose: 'transactional',
        label: template,
        queued_at: new Date().toISOString(),
      },
    })

    if (enqueueError) {
      console.error('Failed to enqueue email:', enqueueError)
      return jsonResponse({ error: 'Failed to enqueue email' }, 500)
    }

    return jsonResponse({ success: true, message_id: messageId })
  } catch (err: unknown) {
    console.error('Transactional email error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return jsonResponse({ error: message }, 500)
  }
})
