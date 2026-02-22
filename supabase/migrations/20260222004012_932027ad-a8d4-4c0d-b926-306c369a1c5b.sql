
CREATE TABLE public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL UNIQUE,
  template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage templates"
ON public.message_templates FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role reads templates"
ON public.message_templates FOR SELECT
USING (auth.role() = 'service_role'::text);

-- Seed default templates
INSERT INTO public.message_templates (event_type, template) VALUES
('order.created', '🛒 Oi {first_name}! Seu pedido na *{merchant}* foi recebido com sucesso! 🎉

{products_list}

💰 Total: R$ {total}

Vamos te avisar assim que houver atualização! 💕'),
('order.paid', '✅ {first_name}, seu pagamento foi *confirmado*! 🎉

{products_list}

Estamos preparando seu pedido com muito carinho! 💖
Em breve ele sai para entrega. Fique de olho! 👀'),
('order.shipped', '📦 {first_name}, seus produtos estão *a caminho*! 🚚✨

{products_list}

🔎 Rastreie sua entrega:
Código: *{tracking_code}*
{tracking_url}

Qualquer dúvida, estamos aqui! 💕'),
('order.delivered', '🎉 {first_name}, seu pedido foi *entregue*! 💖

{products_list}

Esperamos que você ame tudo! 😍
Conta pra gente o que achou? Sua opinião é super importante! ⭐

Obrigada por comprar na *{merchant}*! 🌸'),
('checkout.abandoned', '💄 Oi {first_name}, tudo bem? Vi que você passou na *{merchant}* e acabou esquecendo seus produtos:

{products_list}

Eles ainda estão te esperando! 😊
👉 {link}

Precisa de ajuda? Estamos aqui! 💕');
