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

interface WelcomeEmailProps {
  firstName: string
  siteUrl: string
}

const LOGO_URL = 'https://xinkvwlhctwgdfwixzxf.supabase.co/storage/v1/object/public/email-assets/logo-ellemake-circular.png'

export const WelcomeEmail = ({
  firstName = 'linda',
  siteUrl = 'https://ellemake.com.br',
}: WelcomeEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Bem-vinda à Elle Make! 💄✨</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} alt="Elle Make" width="80" height="auto" style={logo} />
        </Section>
        <Section style={card}>
          <Heading style={h1}>Bem-vinda, {firstName}! 💄</Heading>
          <Text style={text}>
            Estamos muito felizes em ter você na nossa comunidade de beleza!
            Na Elle Make, você encontra maquiagem de qualidade com preços que cabem no bolso.
          </Text>
          <Text style={text}>
            ✨ Frete grátis acima de R$ 199<br />
            💕 Programa de fidelidade com pontos<br />
            🎁 Promoções exclusivas para clientes
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={siteUrl}>
              Explorar produtos
            </Button>
          </Section>
          <Text style={footer}>
            Siga a gente no Instagram: @ellemake.pa 💕
          </Text>
        </Section>
        <Text style={bottomText}>
          © Elle Make · CNPJ 65.548.306/0001-22
        </Text>
      </Container>
    </Body>
  </Html>
)

export default WelcomeEmail

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
