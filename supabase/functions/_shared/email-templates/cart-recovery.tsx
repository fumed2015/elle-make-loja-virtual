/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
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

interface CartRecoveryEmailProps {
  firstName: string
  items: Array<{ name: string; price: number; quantity: number; image?: string }>
  cartTotal: string
  recoveryLink: string
  couponCode?: string
}

const LOGO_URL = 'https://xinkvwlhctwgdfwixzxf.supabase.co/storage/v1/object/public/email-assets/logo-ellemake-circular.png'

export const CartRecoveryEmail = ({
  firstName = 'Cliente',
  items = [],
  cartTotal = '0,00',
  recoveryLink,
  couponCode,
}: CartRecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>💄 {firstName}, seus produtos estão esperando por você!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} alt="Elle Make" width="80" height="auto" style={logo} />
        </Section>
        <Section style={card}>
          <Heading style={h1}>Esqueceu algo? 💕</Heading>
          <Text style={text}>
            Oi, <strong>{firstName}</strong>! Notamos que você deixou alguns produtos
            incríveis no carrinho. Eles ainda estão esperando por você!
          </Text>

          {items.length > 0 && (
            <Section style={itemsContainer}>
              {items.map((item, i) => (
                <Section key={i} style={itemRow}>
                  {item.image && (
                    <Img src={item.image} alt={item.name} width="60" height="60" style={itemImage} />
                  )}
                  <Text style={itemText}>
                    {item.name} × {item.quantity}
                    <br />
                    <span style={itemPrice}>R$ {Number(item.price).toFixed(2).replace('.', ',')}</span>
                  </Text>
                </Section>
              ))}
            </Section>
          )}

          <Hr style={divider} />

          <Text style={totalText}>
            Total: <strong>R$ {cartTotal}</strong>
          </Text>

          {couponCode && (
            <Section style={couponSection}>
              <Text style={couponText}>
                🎁 Use o cupom <strong style={couponCode_style}>{couponCode}</strong> e ganhe
                um desconto especial!
              </Text>
            </Section>
          )}

          <Section style={buttonContainer}>
            <Button style={button} href={recoveryLink}>
              Finalizar minha compra
            </Button>
          </Section>

          <Text style={footer}>
            Precisa de ajuda? Fale conosco pelo WhatsApp: (91) 93618-0774
          </Text>
        </Section>
        <Text style={bottomText}>
          © Elle Make · CNPJ 65.548.306/0001-22
        </Text>
      </Container>
    </Body>
  </Html>
)

export default CartRecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Playfair Display', Georgia, serif" }
const container = { maxWidth: '520px', margin: '0 auto', padding: '20px 16px' }
const logoSection = { textAlign: 'center' as const, padding: '24px 0 16px', backgroundColor: '#74242c', borderRadius: '12px 12px 0 0' }
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
const itemsContainer = { margin: '0 0 16px' }
const itemRow = {
  display: 'flex' as const,
  alignItems: 'center' as const,
  padding: '8px 0',
  borderBottom: '1px solid #EDE5DB',
}
const itemImage = { borderRadius: '8px', marginRight: '12px' }
const itemText = { fontSize: '14px', color: '#1F1F1F', lineHeight: '1.4', margin: '0' }
const itemPrice = { color: '#800020', fontWeight: 'bold' as const }
const divider = { borderColor: '#EDE5DB', margin: '16px 0' }
const totalText = {
  fontSize: '18px',
  color: '#1F1F1F',
  textAlign: 'center' as const,
  margin: '0 0 20px',
}
const couponSection = {
  backgroundColor: '#FFF5F8',
  borderRadius: '8px',
  padding: '12px 16px',
  margin: '0 0 20px',
  border: '1px dashed #800020',
}
const couponText = { fontSize: '14px', color: '#1F1F1F', margin: '0', textAlign: 'center' as const }
const couponCode_style = { color: '#800020', fontSize: '16px' }
const buttonContainer = { textAlign: 'center' as const, margin: '0 0 24px' }
const button = {
  backgroundColor: '#800020',
  color: '#F8F5F0',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const footer = { fontSize: '13px', color: '#737373', margin: '0', lineHeight: '1.5', textAlign: 'center' as const }
const bottomText = { fontSize: '11px', color: '#999999', textAlign: 'center' as const, margin: '20px 0 0' }
