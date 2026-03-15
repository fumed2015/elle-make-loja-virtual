

## Plano: Popular Coleções e Automatizar "Mais Vendidos"

### Situação Atual
- 45 produtos ativos no catálogo, nenhum com `compare_at_price` (sem desconto configurado)
- Apenas 1 produto na coleção "ofertas" atualmente
- Hook `useBestSellingProducts` já calcula vendas dos últimos 90 dias

### O que será feito

**1. Popular coleções manualmente (via SQL insert)**

| Coleção | Critério de seleção | Qtd |
|---------|---------------------|-----|
| **Lançamentos** | 20 produtos mais recentes (por `created_at` DESC) | 20 |
| **Ofertas** | 20 produtos com melhor custo-benefício (preços mais baixos) | 20 |
| **Tendências** | 20 produtos em categorias trending 2026 (lip tints, séruns, paletas, delineadores, skincare) | 20 |

**2. Automatizar "Mais Vendidos"**

Criar uma **database function** `sync_best_sellers()` que:
- Analisa pedidos confirmados dos últimos 90 dias
- Rankeia produtos por volume de vendas
- Limpa e repopula a coleção `mais-vendidos` com os top 20
- Fallback: se não houver vendas suficientes, preenche com produtos `is_featured` e depois os mais recentes

Agendar via **pg_cron** para rodar a cada 6 horas, mantendo a coleção sempre atualizada.

**3. Código**

Atualizar `useCollections.ts` para que a página "Mais Vendidos" use a coleção do banco (já populada automaticamente) em vez de calcular no client-side, mantendo consistência.

### Detalhes Técnicos

- Inserção das 3 coleções manuais via `insert tool` (SQL INSERT com ON CONFLICT para evitar duplicatas)
- Migration para criar a function `sync_best_sellers()` em PL/pgSQL
- Cron job via `insert tool` rodando a cada 6h chamando a function diretamente (sem edge function necessária)
- Haverá sobreposição de produtos entre coleções (esperado, já que são apenas 45 produtos)

