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
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

const LOGO_URL = 'https://xinkvwlhctwgdfwixzxf.supabase.co/storage/v1/object/public/email-assets/logo-ellemake-circular.png'
const MARSALA = '#74242c'

export const InviteEmail = ({ siteName = 'Elle Make', siteUrl = 'https://www.ellemake.com.br', confirmationUrl }: InviteEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Você foi convidada para a Elle Make!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}><Img src={LOGO_URL} width="80" height="auto" alt="Elle Make" style={{ margin: '0 auto' }} /></Section>
        <Section style={content}>
          <Heading style={h1}>Você foi convidada!</Heading>
          <Text style={text}>
            Você recebeu um convite para participar da{' '}
            <Link href={siteUrl} style={link}><strong>Elle Make</strong></Link>.
            Clique no botão abaixo para aceitar e criar sua conta.
          </Text>
          <Section style={btnWrap}><Button style={button} href={confirmationUrl}>Aceitar Convite</Button></Section>
          <Text style={footerText}>Se você não esperava este convite, pode ignorar este e-mail.</Text>
        </Section>
        <Section style={brand}><Text style={brandText}>Elle Make — Beleza acessível para todas 💋</Text></Section>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#f8f4f0', fontFamily: "'Segoe UI', Arial, sans-serif" }
const container = { maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '12px', overflow: 'hidden' as const }
const header = { backgroundColor: MARSALA, padding: '24px 20px', textAlign: 'center' as const }
const content = { padding: '32px 28px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: MARSALA, margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#4a4a4a', lineHeight: '1.6', margin: '0 0 16px' }
const link = { color: MARSALA, textDecoration: 'underline' }
const btnWrap = { textAlign: 'center' as const, margin: '30px 0' }
const button = { backgroundColor: MARSALA, color: '#ffffff', fontSize: '15px', borderRadius: '8px', padding: '14px 28px', textDecoration: 'none', fontWeight: 'bold' as const }
const footerText = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
const brand = { backgroundColor: '#faf6f3', padding: '16px 28px', textAlign: 'center' as const }
const brandText = { fontSize: '12px', color: '#999', margin: '0' }
