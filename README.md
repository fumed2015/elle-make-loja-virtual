# 🛍️ Elle Make — E-commerce de Maquiagem & Cosméticos

> Loja online de maquiagem com delivery expresso em Belém do Pará. Entrega em até 3 horas na região metropolitana.

**URL de Produção:** [ellemake2.lovable.app](https://ellemake2.lovable.app)

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Stack Tecnológica](#stack-tecnológica)
- [Arquitetura](#arquitetura)
- [Módulos do Sistema](#módulos-do-sistema)
- [Regras de Negócio](#regras-de-negócio)
- [Integrações Externas](#integrações-externas)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Banco de Dados](#banco-de-dados)
- [Edge Functions](#edge-functions)
- [Painel Administrativo](#painel-administrativo)
- [SEO & Performance](#seo--performance)
- [Como Rodar Localmente](#como-rodar-localmente)

---

## 🎯 Visão Geral

**Elle Make** é um e-commerce completo de maquiagem e cosméticos focado no mercado de **Belém e Ananindeua (PA)**. O diferencial é a **entrega expressa em até 3 horas** via motoboy local, além de envio nacional via Melhor Envio.

### Marcas Trabalhadas
Ruby Rose · Max Love · Phallebeauty · Sarah Beauty · Luisance · Macrilan · Creamy

### Público-Alvo
Mulheres de 18-45 anos na região metropolitana de Belém que buscam maquiagem de qualidade com preço acessível e entrega rápida.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Estilização** | Tailwind CSS + shadcn/ui |
| **Estado** | Zustand (carrinho) + TanStack React Query (server state) |
| **Animações** | Framer Motion |
| **Backend** | Lovable Cloud (Supabase) |
| **Banco de Dados** | PostgreSQL com RLS (Row Level Security) |
| **Edge Functions** | Deno (Supabase Edge Functions) |
| **Pagamento** | Mercado Pago (checkout transparente) |
| **Frete** | Melhor Envio (Correios) + Logística local |
| **Notificações** | WhatsApp via Z-API |
| **IA** | Google Gemini (consultora de beleza + importação de catálogo) |
| **PWA** | vite-plugin-pwa |

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│  React + Vite + Tailwind + shadcn/ui            │
│  ┌──────┐ ┌──────┐ ┌────────┐ ┌──────────────┐ │
│  │ Loja │ │ Cart │ │Checkout│ │ Admin Panel   │ │
│  └──────┘ └──────┘ └────────┘ └──────────────┘ │
└──────────────────────┬──────────────────────────┘
                       │ Supabase JS SDK
┌──────────────────────▼──────────────────────────┐
│               LOVABLE CLOUD                      │
│  ┌──────────────┐  ┌─────────────────────────┐  │
│  │  PostgreSQL   │  │    Edge Functions        │  │
│  │  + RLS        │  │  • mercadopago-payment   │  │
│  │  + Realtime   │  │  • melhor-envio-shipping │  │
│  │               │  │  • whatsapp-notifications│  │
│  │  24 tabelas   │  │  • beauty-consultant     │  │
│  │               │  │  • catalog-drive-import  │  │
│  │               │  │  • ai-content-generator  │  │
│  │               │  │  • cart-recovery         │  │
│  │               │  │  • seo-report / sitemap  │  │
│  └──────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────┘
           │                    │
    ┌──────▼──────┐     ┌──────▼──────┐
    │ Mercado Pago│     │  Melhor     │
    │ API         │     │  Envio API  │
    └─────────────┘     └─────────────┘
           │
    ┌──────▼──────┐
    │  Z-API      │
    │ (WhatsApp)  │
    └─────────────┘
```

---

## 📦 Módulos do Sistema

### 1. 🛒 Loja (Frontend Público)

| Página | Rota | Descrição |
|--------|------|-----------|
| Home | `/` | Hero banner, destaques, ofertas, categorias |
| Explorar | `/explorar` | Catálogo completo com filtros |
| Categoria | `/categoria/:slug` | Produtos filtrados por categoria |
| Marca | `/marca/:slug` | Produtos filtrados por marca |
| Produto | `/produto/:slug` | PDP com galeria, avaliações, frete, cross-sell |
| Carrinho | `/carrinho` | Resumo, cupom, cálculo de frete |
| Checkout | `/checkout` | Endereço, pagamento (PIX/Boleto/Cartão), order bumps |
| Favoritos | `/favoritos` | Wishlist do usuário |
| Pedidos | `/pedidos` | Histórico de pedidos |
| Perfil | `/perfil` | Dados pessoais, endereços, pontos |
| Consultora | `/consultora/:codigo` | Landing page de influenciadora |
| Sobre | `/sobre` | Institucional |
| Privacidade/Termos | `/privacidade`, `/termos` | Legal |

### 2. 🔐 Autenticação
- Cadastro com email, nome, telefone e data de nascimento
- Login com email/senha
- Recuperação de senha via email
- Perfil automático criado via trigger no banco

### 3. 🛍️ Carrinho & Checkout
- Carrinho persistido no banco (logado) ou Zustand (anônimo)
- Cálculo de frete em tempo real (Melhor Envio / local)
- Cupons de desconto com validação
- Order bumps e cross-sell inteligente
- Trust badges e urgência (estoque baixo)
- Checkout transparente Mercado Pago (PIX, Boleto, Cartão até 3x s/ juros)

### 4. 📊 Painel Administrativo (`/admin`)

| Aba | Funcionalidade |
|-----|---------------|
| **Produtos** | CRUD completo, imagens, variantes (swatches), SEO |
| **Pedidos** | Gestão de status, rastreio, envio de notificação WhatsApp |
| **Estoque** | Controle de estoque com alertas de baixo estoque |
| **Logística** | Gestão de devoluções/trocas |
| **Financeiro** | CMV, premissas, precificação por Markup Divisor, DRE, auditoria |
| **Comercial** | Cupons, influenciadoras, comissões |
| **Marketing** | Campanhas, conversão, tracking pixels |
| **CRM** | Perfis de clientes, fidelidade, segmentação |
| **WhatsApp** | Templates de mensagens personalizados |
| **SEO/Conteúdo** | Blog, relatórios SEO, gerador de conteúdo IA |
| **Catálogo Drive** | Importação de catálogos de fornecedores via PDF/imagem com IA |
| **Inteligência** | Dashboard de vendas e análise de catálogo |

### 5. 💰 Módulo Financeiro
- **CMV Real**: custo base + rateio de frete SP→PA por unidade
- **Precificação**: Markup Divisor incluindo taxas de gateway (PIX, crédito, débito)
- **Premissas**: custos fixos customizáveis (plataforma, WhatsGW, extras)
- **DRE Simplificado**: receita, custos, margem bruta/líquida
- **Auditoria**: score de saúde financeira, alertas de margem negativa

### 6. 🤖 IA Integrada
- **Consultora de Beleza**: chatbot que sugere produtos baseado no tom de pele e preferências
- **Gerador de Conteúdo**: cria descrições, posts e textos de marketing
- **Importação de Catálogo**: extrai produtos de PDFs/imagens de fornecedores via Gemini Vision
- **Consultor de Catálogo**: analisa catálogo e sugere estratégias

### 7. 📱 PWA
- Instalável como app nativo
- Ícones 192x192 e 512x512
- Service worker para cache offline

---

## 💼 Regras de Negócio

| Regra | Detalhe |
|-------|---------|
| **Desconto PIX** | 5% de desconto automático |
| **Parcelamento** | Até 3x sem juros no cartão |
| **Frete Grátis** | Pedidos acima de R$ 199 para Belém/Ananindeua |
| **Entrega Express** | Até 3h na região metropolitana de Belém |
| **Brinde** | Compras acima de R$ 200 |
| **Selo "OFF"** | Automático quando `compare_at_price > price` |
| **"Últimas unid."** | Automático quando `stock ≤ 5` |
| **Comissão Influencer** | 10% padrão (configurável por influenciadora) |
| **Programa Fidelidade** | Pontos por compra, tiers: Bronze → Prata → Ouro → Diamante |
| **Recuperação Carrinho** | Notificação automática via WhatsApp |

---

## 🔌 Integrações Externas

### Mercado Pago
- Checkout transparente (server-side via Edge Function)
- Métodos: PIX (QR Code), Boleto, Cartão de Crédito/Débito
- Webhook de confirmação de pagamento

### Melhor Envio
- Cálculo de frete em tempo real (Correios)
- CEPs de Belém/Ananindeua = frete local (motoboy)

### Z-API (WhatsApp)
- Notificações automáticas por evento:
  - Pedido criado, pago, enviado, entregue, cancelado
- Templates customizáveis pelo admin
- Formatação rica com emojis e markdown WhatsApp

### Google Gemini (IA)
- Modelos: gemini-2.5-flash, gemini-2.5-pro
- Usos: consultora de beleza, importação de catálogo, geração de conteúdo

---

## 📁 Estrutura de Pastas

```
src/
├── components/
│   ├── admin/          # Painéis administrativos (14 abas)
│   ├── chat/           # Consultora IA inline
│   ├── checkout/       # Cross-sell, order bump, trust badges
│   ├── icons/          # Ícones customizados (WhatsApp)
│   ├── layout/         # Header, Footer, BottomNav, FloatingWhatsApp
│   ├── payment/        # Formulário de cartão
│   ├── product/        # Card, galeria, reviews, urgência
│   ├── shipping/       # Calculadora de frete
│   ├── social/         # UGC (conteúdo gerado por usuário)
│   └── ui/             # shadcn/ui components
├── hooks/
│   ├── useAuth.ts      # Autenticação
│   ├── useCart.ts       # Carrinho (Zustand)
│   ├── useProducts.ts  # Queries de produtos
│   ├── useOrders.ts    # Pedidos + realtime
│   ├── useShipping.ts  # Cálculo de frete
│   ├── usePayment.ts   # Integração Mercado Pago
│   ├── useCoupon.ts    # Validação de cupons
│   ├── useFavorites.ts # Wishlist
│   ├── useLoyalty.ts   # Programa de fidelidade
│   ├── useAdmin.ts     # Verificação de role admin
│   └── ...
├── pages/              # Rotas da aplicação
├── integrations/
│   └── supabase/       # Client + Types (auto-gerados)
└── lib/
    └── utils.ts        # Utilitários (cn, formatação)

supabase/
└── functions/
    ├── ai-content-generator/   # Gerador de conteúdo IA
    ├── beauty-consultant/      # Consultora de beleza IA
    ├── cart-recovery/          # Recuperação de carrinho
    ├── catalog-consultant/     # Consultor de catálogo IA
    ├── catalog-drive-import/   # Importação de catálogo via IA
    ├── melhor-envio-shipping/  # Cálculo de frete
    ├── mercadopago-payment/    # Processamento de pagamento
    ├── seo-report/             # Relatório SEO automático
    ├── sitemap/                # Geração de sitemap dinâmico
    └── whatsapp-notifications/ # Notificações WhatsApp
```

---

## 🗄️ Banco de Dados

### Tabelas Principais (24 tabelas)

| Tabela | Descrição |
|--------|-----------|
| `products` | Catálogo de produtos (nome, preço, imagens, swatches, SEO) |
| `categories` | Categorias hierárquicas (com parent_id) |
| `orders` | Pedidos (itens JSON, endereço, status, rastreio) |
| `cart_items` | Itens do carrinho persistido |
| `profiles` | Perfis de usuário (nome, CPF, endereço, fidelidade) |
| `reviews` | Avaliações de produtos com moderação |
| `favorites` | Wishlist do usuário |
| `coupons` | Cupons de desconto (%, fixo, influencer) |
| `influencers` | Influenciadoras parceiras |
| `influencer_commissions` | Comissões por pedido |
| `notifications` | Log de notificações WhatsApp |
| `message_templates` | Templates de mensagens por evento |
| `saved_addresses` | Endereços salvos do usuário |
| `loyalty_points` | Histórico de pontos de fidelidade |
| `financial_premises` | Premissas financeiras (custos, taxas, margens) |
| `financial_transactions` | Transações financeiras |
| `product_costs` | CMV por produto (custo base + frete) |
| `catalog_items` | Itens de catálogo de fornecedores |
| `catalog_imports` | Histórico de importações de catálogo |
| `catalog_import_failures` | Falhas de importação |
| `promotions` | Banners e promoções ativas |
| `blog_posts` | Posts do blog (SEO) |
| `tracking_pixels` | Pixels de rastreamento (Meta, Google) |
| `user_roles` | Roles: admin, moderator, customer, staff |
| `returns` | Devoluções e trocas |
| `ugc_posts` | Conteúdo gerado por usuários |
| `push_subscriptions` | Assinaturas push notification |
| `seo_reports` | Relatórios SEO automáticos |
| `marketing_campaigns` | Campanhas de marketing |

### Segurança (RLS)
Todas as tabelas possuem **Row Level Security** ativo com políticas granulares:
- Dados públicos: produtos ativos, categorias, cupons ativos, promoções ativas
- Dados do usuário: pedidos, favoritos, carrinho, perfil (somente próprios)
- Dados admin: gestão total via `has_role(auth.uid(), 'admin')`
- Service role: inserções de sistema (notificações, SEO reports)

---

## ⚡ Edge Functions

| Função | Descrição | JWT |
|--------|-----------|-----|
| `mercadopago-payment` | Cria pagamento (PIX/Boleto/Cartão) no Mercado Pago | Não |
| `melhor-envio-shipping` | Calcula frete via API Melhor Envio | Não |
| `whatsapp-notifications` | Envia mensagens via Z-API | Não |
| `beauty-consultant` | Chat IA para recomendação de produtos | Não |
| `ai-content-generator` | Gera conteúdo de marketing via IA | Não |
| `catalog-drive-import` | Importa catálogos PDF/imagem via Gemini Vision | Não |
| `catalog-consultant` | Análise de catálogo via IA | Não |
| `cart-recovery` | Processa recuperação de carrinhos abandonados | Não |
| `seo-report` | Gera relatórios SEO automáticos | Não |
| `sitemap` | Gera sitemap.xml dinâmico | Não |

---

## 🔍 SEO & Performance

- **Meta tags dinâmicas** via componente `SEOHead`
- **JSON-LD** estruturado (Product, LocalBusiness, BreadcrumbList)
- **Sitemap dinâmico** gerado via Edge Function
- **robots.txt** configurado
- **Open Graph** com imagem personalizada
- **Lazy loading** de imagens com componente `OptimizedImage`
- **Cache agressivo**: 5-10min para produtos, 10-30min para categorias
- **PWA** com service worker

---

## 🚀 Como Rodar Localmente

```bash
# 1. Clone o repositório
git clone <URL_DO_REPOSITORIO>
cd elle-make

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
# O arquivo .env é gerado automaticamente pelo Lovable Cloud

# 4. Inicie o servidor de desenvolvimento
npm run dev

# 5. Acesse
# http://localhost:5173
```

---

## 📊 Secrets Necessárias

| Secret | Serviço | Uso |
|--------|---------|-----|
| `MERCADOPAGO_ACCESS_TOKEN` | Mercado Pago | Processamento de pagamentos |
| `MELHOR_ENVIO_TOKEN` | Melhor Envio | Cálculo de frete |
| `ZAPI_INSTANCE_ID` | Z-API | ID da instância WhatsApp |
| `ZAPI_TOKEN` | Z-API | Token de autenticação WhatsApp |
| `ZAPI_CLIENT_TOKEN` | Z-API | Token do cliente Z-API |
| `GOOGLE_DRIVE_API_KEY` | Google | Importação de catálogos do Drive |

---

## 📝 Licença

Projeto proprietário — Elle Make © 2026. Todos os direitos reservados.
