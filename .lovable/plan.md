

## Reconfiguração Z-API — Plano

### Situação Atual
Os 3 secrets Z-API já existem no projeto: `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN`. Como você trocou de telefone, precisamos atualizar os valores.

### Passo a Passo (seu lado)

1. Acesse [z-api.io](https://www.z-api.io/) → Painel
2. Crie uma nova instância ou acesse a existente
3. Conecte o novo número escaneando o QR Code no celular
4. Copie os 3 valores da instância conectada:
   - **Instance ID**
   - **Token**
   - **Client Token**

### O que vou fazer (implementação)

1. **Solicitar os 3 secrets atualizados** via ferramenta de secrets — você insere os novos valores
2. **Verificar a edge function `whatsapp-notifications`** para garantir que está usando os secrets corretamente
3. **Testar a conectividade** fazendo um curl de teste na edge function

### Funcionalidades que usam Z-API no site
- Notificações de pedido (criado, pago, enviado, entregue, cancelado)
- Recuperação de carrinho abandonado (após 30min)
- Lembrete de PIX pendente (após 15min)
- Campanhas de marketing em massa
- Automações de aniversário e recompra

Nenhuma alteração de código é necessária — apenas a atualização dos valores dos secrets.

