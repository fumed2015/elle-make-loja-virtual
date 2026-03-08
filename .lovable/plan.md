

## Plano: Relatório Mensal de Receitas Brutas no Painel Admin

### Objetivo
Criar uma nova aba no painel administrativo para gerar e exportar o **Relatório Mensal das Receitas Brutas** (modelo MEI), com dados preenchidos automaticamente a partir dos pedidos do banco de dados.

### O que será feito

1. **Novo componente `MonthlyRevenueReportTab.tsx`** em `src/components/admin/`
   - Seletor de mês/ano para o período de apuração
   - Campos editáveis para CNPJ, nome do empreendedor, local e data
   - Tabela fiel ao modelo oficial com 3 seções:
     - **Revenda de Mercadorias (Comércio)**: Itens I, II, III
     - **Venda de Produtos Industrializados**: Itens IV, V, VI
     - **Prestação de Serviços**: Itens VII, VIII, IX
   - **Item X**: Total geral (III + VI + IX)
   - Campos de local/data e assinatura
   - Nota de rodapé sobre documentos fiscais anexados
   - Os valores de revenda de mercadorias (Item I — sem NF e Item II — com NF) serão preenchidos automaticamente a partir dos pedidos aprovados do mês selecionado. O admin pode redistribuir manualmente entre "com NF" e "sem NF"
   - Botão **"Exportar PDF"** que gera o relatório usando `window.print()` com CSS de impressão dedicado

2. **Registrar a nova aba no sidebar e no Admin.tsx**
   - Nova entrada `"revenue-report"` no sidebar, na seção Financeiro, com ícone `FileText`
   - Adicionar o case no `renderTab()` do Admin.tsx

### Dados utilizados
- Tabela `orders`: pedidos com status `approved`/`confirmed`/`processing`/`shipped`/`delivered` filtrados pelo mês selecionado, somando o campo `total`
- Tabela `profiles`: para preencher nome do empreendedor (opcional)
- Seções de Indústria e Serviços ficam zeradas (R$ 0,00) por padrão, editáveis manualmente

### Detalhes técnicos
- O relatório será renderizado em HTML/CSS com classes de impressão (`@media print`) para gerar PDF limpo
- Sem necessidade de migração de banco — usa dados existentes
- Persistência dos dados de CNPJ/nome via `site_settings` (chave `mei_settings`) para não precisar redigitar

