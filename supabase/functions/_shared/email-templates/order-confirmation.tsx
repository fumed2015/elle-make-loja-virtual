/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ShippingAddress {
  street?: string
  number?: string
  neighborhood?: string
  city?: string
  state?: string
  zip?: string
}

interface OrderConfirmationEmailProps {
  firstName: string
  orderId: string
  orderNumber?: string
  items: Array<{ name: string; price: number; quantity: number }>
  subtotal?: number
  shipping?: number
  discount?: number
  total: string | number
  paymentMethod: string
  estimatedDelivery?: string
  shippingAddress?: ShippingAddress | string
}

function formatAddress(addr: ShippingAddress | string | undefined): string | null {
  if (!addr) return null
  if (typeof addr === 'string') return addr
  const parts = [
    addr.street && addr.number ? `${addr.street}, ${addr.number}` : addr.street,
    addr.neighborhood,
    addr.city && addr.state ? `${addr.city} - ${addr.state}` : addr.city,
    addr.zip,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join('\n') : null
}

const LOGO_URL = 'https://xinkvwlhctwgdfwixzxf.supabase.co/storage/v1/object/public/email-assets/logo-ellemake.png'

export const OrderConfirmationEmail = ({
  firstName = 'Cliente',
  orderId = '',
  orderNumber,
  items = [],
  subtotal,
  shipping,
  discount,
  total,
  paymentMethod = 'PIX',
  estimatedDelivery,
  shippingAddress,
}: OrderConfirmationEmailProps) => {
  const displayOrderId = orderNumber || orderId?.slice(0, 8) || ''
  const formattedTotal = typeof total === 'number' ? total.toFixed(2).replace('.', ',') : total
  const formattedAddress = formatAddress(shippingAddress)
  return (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Pedido confirmado! #{displayOrderId} 🎉</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} alt="Elle Make" width="160" height="auto" style={logo} />
        </Section>
        <Section style={card}>
          <Heading style={h1}>Pedido confirmado! 🎉</Heading>
          <Text style={text}>
            Oi, <strong>{firstName}</strong>! Seu pedido foi recebido com sucesso.
            Estamos preparando tudo com muito carinho para você! 💕
          </Text>

          <Section style={detailBox}>
            <Text style={detailLabel}>Nº do pedido</Text>
            <Text style={detailValue}>#{displayOrderId}</Text>
          </Section>

          {items.length > 0 && (
            <Section style={itemsSection}>
              <Text style={sectionTitle}>Itens do pedido</Text>
              {items.map((item, i) => (
                <Section key={i} style={itemRow}>
                  <Text style={itemName}>{item.name} × {item.quantity}</Text>
                  <Text style={itemPriceText}>R$ {Number(item.price * item.quantity).toFixed(2).replace('.', ',')}</Text>
                </Section>
              ))}
            </Section>
          )}

          <Hr style={divider} />

          {subtotal != null && (
            <Section style={summaryRow}>
              <Text style={summaryLabel}>Subtotal</Text>
              <Text style={summaryValueSmall}>R$ {Number(subtotal).toFixed(2).replace('.', ',')}</Text>
            </Section>
          )}

          {shipping != null && shipping > 0 && (
            <Section style={summaryRow}>
              <Text style={summaryLabel}>Frete</Text>
              <Text style={summaryValueSmall}>R$ {Number(shipping).toFixed(2).replace('.', ',')}</Text>
            </Section>
          )}

          {discount != null && discount > 0 && (
            <Section style={summaryRow}>
              <Text style={summaryLabel}>Desconto</Text>
              <Text style={{ ...summaryValueSmall, color: '#16a34a' }}>- R$ {Number(discount).toFixed(2).replace('.', ',')}</Text>
            </Section>
          )}

          <Section style={summaryRow}>
            <Text style={summaryLabel}>Total</Text>
            <Text style={summaryValue}>R$ {formattedTotal}</Text>
          </Section>

          <Section style={summaryRow}>
            <Text style={summaryLabel}>Pagamento</Text>
            <Text style={summaryValueSmall}>{paymentMethod}</Text>
          </Section>

          {estimatedDelivery && (
            <Section style={summaryRow}>
              <Text style={summaryLabel}>Previsão de entrega</Text>
              <Text style={summaryValueSmall}>{estimatedDelivery}</Text>
            </Section>
          )}

          {formattedAddress && (
            <>
              <Hr style={divider} />
              <Text style={sectionTitle}>Endereço de entrega</Text>
              <Text style={addressText}>{formattedAddress}</Text>
            </>
          )}

          <Hr style={divider} />

          <Text style={footer}>
            Dúvidas sobre seu pedido? Fale conosco pelo WhatsApp: (91) 93618-0774
          </Text>
        </Section>
        <Text style={bottomText}>
          © Elle Make · CNPJ 65.548.306/0001-22
        </Text>
      </Container>
    </Body>
  </Html>
  )
}

const main = { backgroundColor: '#ffffff', fontFamily: "'Playfair Display', Georgia, serif" }
const container = { maxWidth: '520px', margin: '0 auto', padding: '20px 16px' }
const logoSection = { textAlign: 'center' as const, padding: '24px 0 16px' }
const logo = { margin: '0 auto' }
const card = {
  backgroundColor: '#FDF8F4',
  borderRadius: '12px',
  padding: '32px 28px',
  border: '1px solid #EDE5DB',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#800020',
  margin: '0 0 16px',
  textAlign: 'center' as const,
}
const text = {
  fontSize: '15px',
  color: '#1F1F1F',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const detailBox = {
  backgroundColor: '#fff',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '0 0 20px',
  textAlign: 'center' as const,
  border: '1px solid #EDE5DB',
}
const detailLabel = { fontSize: '12px', color: '#737373', margin: '0 0 4px', textTransform: 'uppercase' as const }
const detailValue = { fontSize: '20px', fontWeight: 'bold' as const, color: '#800020', margin: '0' }
const itemsSection = { margin: '0 0 16px' }
const sectionTitle = { fontSize: '14px', fontWeight: 'bold' as const, color: '#800020', margin: '0 0 8px' }
const itemRow = { display: 'flex' as const, justifyContent: 'space-between' as const, padding: '6px 0' }
const itemName = { fontSize: '14px', color: '#1F1F1F', margin: '0' }
const itemPriceText = { fontSize: '14px', color: '#800020', fontWeight: 'bold' as const, margin: '0' }
const divider = { borderColor: '#EDE5DB', margin: '16px 0' }
const summaryRow = { display: 'flex' as const, justifyContent: 'space-between' as const, padding: '4px 0' }
const summaryLabel = { fontSize: '14px', color: '#737373', margin: '0' }
const summaryValue = { fontSize: '18px', fontWeight: 'bold' as const, color: '#1F1F1F', margin: '0' }
const summaryValueSmall = { fontSize: '14px', color: '#1F1F1F', margin: '0' }
const addressText = { fontSize: '14px', color: '#1F1F1F', lineHeight: '1.5', margin: '0 0 16px' }
const footer = { fontSize: '13px', color: '#737373', margin: '0', lineHeight: '1.5', textAlign: 'center' as const }
const bottomText = { fontSize: '11px', color: '#999999', textAlign: 'center' as const, margin: '20px 0 0' }
