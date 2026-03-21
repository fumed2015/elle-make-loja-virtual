# Guia de Configuração de Secrets — Projeto Destino

## Projeto Destino: `osgkokctbwkcadrgteva.supabase.co`

Todos os secrets abaixo devem ser configurados no **dashboard do Supabase** do projeto destino em:
**Settings → Edge Functions → Secrets**

---

## 1. Secrets Obrigatórios (Pagamento e Frete)

| Secret | Onde obter | Descrição |
|--------|-----------|-----------|
| `MERCADO_PAGO_ACCESS_TOKEN` | [Mercado Pago Developers](https://www.mercadopago.com.br/developers/panel/app) → Suas integrações → Credenciais de produção | Token de acesso para processar pagamentos (PIX, Boleto, Cartão) |
| `MERCADO_PAGO_PUBLIC_KEY` | Mesmo painel acima | Chave pública para tokenização de cartão no frontend |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Definido por você | Chave HMAC-SHA256 para validar webhooks do Mercado Pago |
| `MELHOR_ENVIO_TOKEN` | [Melhor Envio](https://melhorenvio.com.br) → Configurações → Tokens | Token de API para cálculo de frete nacional (Correios) |

## 2. Secrets de Notificação (WhatsApp via Z-API)

| Secret | Onde obter | Descrição |
|--------|-----------|-----------|
| `ZAPI_INSTANCE_ID` | [Z-API](https://www.z-api.io/) → Painel → Sua instância | ID da instância WhatsApp conectada |
| `ZAPI_TOKEN` | Mesmo painel → Token da instância | Token de autenticação da instância |
| `ZAPI_CLIENT_TOKEN` | Mesmo painel → Token do cliente | Token de segurança para webhooks |

## 3. Secrets de IA e Catálogo

| Secret | Onde obter | Descrição |
|--------|-----------|-----------|
| `GOOGLE_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) | Chave para Gemini (consultor de beleza, gerador de conteúdo) |

## 4. Secrets de Marketplace (se utilizar)

| Secret | Onde obter | Descrição |
|--------|-----------|-----------|
| `YAMPI_USER_TOKEN` | [Yampi](https://app.yampi.com.br/) → Configurações → API | Token de usuário Yampi |
| `YAMPI_USER_SECRET_KEY` | Mesmo painel | Chave secreta Yampi |

## 5. Secrets Automáticos (já existem no projeto destino)

Estes são gerados automaticamente pelo Supabase e **não precisam ser copiados**:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` / `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

## 6. Variáveis de Ambiente do Frontend (.env)

No deploy externo (Vercel, Hostinger), configure:

```env
VITE_SUPABASE_URL=https://osgkokctbwkcadrgteva.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[ANON_KEY_DO_PROJETO_DESTINO]
VITE_SUPABASE_PROJECT_ID=osgkokctbwkcadrgteva
```

---

## Checklist Pós-Configuração

- [ ] Mercado Pago: testar pagamento PIX e cartão em sandbox
- [ ] Melhor Envio: testar cálculo de frete com CEP válido
- [ ] Z-API: verificar envio de mensagem de teste via WhatsApp
- [ ] Google AI: testar consultor de beleza no chat
- [ ] Verificar Leaked Password Protection em Auth → Settings
- [ ] Configurar webhook do Mercado Pago apontando para a URL do projeto destino
