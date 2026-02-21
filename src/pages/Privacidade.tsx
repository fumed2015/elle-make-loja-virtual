import SEOHead from "@/components/SEOHead";

const Privacidade = () => (
  <div className="max-w-3xl mx-auto px-4 py-12 pb-24">
    <SEOHead title="Política de Privacidade" description="Política de Privacidade da Elle Make — como coletamos, usamos e protegemos seus dados." />
    <h1 className="text-3xl font-display font-bold mb-8 text-foreground">Política de Privacidade</h1>

    <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
      <p><strong className="text-foreground">Última atualização:</strong> Fevereiro de 2026</p>

      <section>
        <h2 className="text-lg font-semibold text-foreground">1. Dados Coletados</h2>
        <p>Coletamos as seguintes informações quando você utiliza nossa loja:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Nome completo, e-mail, telefone e data de nascimento (cadastro)</li>
          <li>Endereço de entrega (pedidos)</li>
          <li>Dados de navegação (cookies, IP, páginas visitadas)</li>
          <li>Histórico de compras e favoritos</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">2. Uso dos Dados</h2>
        <p>Utilizamos seus dados para:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Processar e entregar seus pedidos</li>
          <li>Enviar comunicações sobre promoções e novidades (com seu consentimento)</li>
          <li>Personalizar sua experiência de compra</li>
          <li>Programa de fidelidade e cupons de aniversário</li>
          <li>Melhorar nossos produtos e serviços</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">3. Compartilhamento</h2>
        <p>Seus dados podem ser compartilhados com:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Transportadoras para entrega (Melhor Envio)</li>
          <li>Processadores de pagamento (Yampi)</li>
          <li>Ferramentas de análise (Google Analytics)</li>
        </ul>
        <p>Não vendemos nem compartilhamos seus dados pessoais com terceiros para fins de marketing.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">4. Segurança</h2>
        <p>Utilizamos criptografia SSL/TLS, autenticação segura e controle de acesso baseado em funções (RLS) para proteger seus dados.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">5. Seus Direitos (LGPD)</h2>
        <p>Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Acessar seus dados pessoais</li>
          <li>Corrigir dados incompletos ou desatualizados</li>
          <li>Solicitar exclusão dos seus dados</li>
          <li>Revogar consentimento para comunicações</li>
        </ul>
        <p>Para exercer seus direitos, entre em contato pelo WhatsApp (91) 98304-5531 ou pelo e-mail contato@ellemake.com.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">6. Cookies</h2>
        <p>Utilizamos cookies para manter sua sessão, salvar itens no carrinho e melhorar sua experiência. Você pode desativá-los nas configurações do seu navegador.</p>
      </section>
    </div>
  </div>
);

export default Privacidade;
