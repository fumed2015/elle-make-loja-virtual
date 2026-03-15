/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReviewRequestEmailProps {
  firstName: string
  orderId: string
  items: Array<{ name: string; slug: string }>
  siteUrl: string
}

const LOGO_URL = 'https://xinkvwlhctwgdfwixzxf.supabase.co/storage/v1/object/public/email-assets/logo-ellemake-circular.png'

export const ReviewRequestEmail = ({
  firstName = 'Cliente',
  orderId,
  items = [],
  siteUrl = 'https://ellemake.com.br',
}: ReviewRequestEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Como foi sua experiência? Conte para nós! ⭐</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} alt="Elle Make" width="80" height="auto" style={logo} />
        </Section>
        <Section style={card}>
          <Heading style={h1}>Conta pra gente! ⭐</Heading>
          <Text style={text}>
            Oi, <strong>{firstName}</strong>! Esperamos que você esteja amando seus produtos! 💕
            Sua opinião é muito importante para nós e ajuda outras clientes a escolherem.
          </Text>

          {items.length > 0 && (
            <Section style={productsSection}>
              {items.map((item, i) => (
                <Button key={i} style={productButton} href={`${siteUrl}/produto/${item.slug}`}>
                  ⭐ Avaliar: {item.name}
                </Button>
              ))}
            </Section>
          )}

          <Text style={footer}>
            Sua avaliação ajuda outras clientes a encontrarem os melhores produtos! 💖
          </Text>
        </Section>
        <Text style={bottomText}>
          © Elle Make · CNPJ 65.548.306/0001-22
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReviewRequestEmail

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
  color: '#74242c',
  margin: '0 0 16px',
  textAlign: 'center' as const,
}
const text = {
  fontSize: '15px',
  color: '#1F1F1F',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const productsSection = { margin: '0 0 20px' }
const productButton = {
  backgroundColor: '#fff',
  color: '#74242c',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '10px 20px',
  textDecoration: 'none',
  border: '1px solid #800020',
  display: 'block' as const,
  textAlign: 'center' as const,
  margin: '0 0 8px',
}
const footer = { fontSize: '13px', color: '#737373', margin: '0', lineHeight: '1.5', textAlign: 'center' as const }
const bottomText = { fontSize: '11px', color: '#999999', textAlign: 'center' as const, margin: '20px 0 0' }
