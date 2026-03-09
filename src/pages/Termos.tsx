import SEOHead from "@/components/SEOHead";

const Termos = () => (
  <div className="max-w-3xl mx-auto px-4 py-12 pb-24">
    <SEOHead title="Termos de Uso" description="Termos de Uso da Elle Make — condições de compra, trocas, devoluções e mais." />
    <h1 className="text-3xl font-display font-bold mb-8 text-foreground">Termos de Uso</h1>

    <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
      <p><strong className="text-foreground">Última atualização:</strong> Fevereiro de 2026</p>

      <section>
        <h2 className="text-lg font-semibold text-foreground">1. Sobre a Elle Make</h2>
        <p>A Elle Make é uma loja virtual de maquiagem e cosméticos sediada em Belém do Pará, especializada em delivery rápido para a região metropolitana.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">2. Cadastro</h2>
        <p>Para realizar compras, é necessário criar uma conta com informações válidas. Você é responsável por manter a confidencialidade da sua senha.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">3. Produtos e Preços</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Todos os preços estão em Reais (BRL) e incluem impostos</li>
          <li>Desconto de 5% para pagamentos via Pix</li>
          <li>Parcelamento em até 3x sem juros no cartão (pedidos acima de R$ 30)</li>
          <li>Preços e disponibilidade sujeitos a alteração sem aviso prévio</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">4. Entregas</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Belém e Ananindeua:</strong> entrega em até 3 horas (motoboy)</li>
          <li><strong>Uber Flash:</strong> entrega expressa disponível</li>
          <li><strong>Retirada:</strong> disponível mediante agendamento</li>
          <li>Frete grátis para pedidos acima de R$ 199 na região metropolitana</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">5. Trocas e Devoluções</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Prazo de 7 dias após o recebimento para solicitar troca ou devolução</li>
          <li>Produto deve estar lacrado/sem uso para devolução</li>
          <li>Produtos com defeito são substituídos sem custo adicional</li>
          <li>Solicite pelo WhatsApp (91) 92004-8471</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">6. Garantia e Originalidade</h2>
        <p>Todos os produtos comercializados são 100% originais, adquiridos diretamente de fabricantes e distribuidores autorizados. Produtos com registro ANVISA quando aplicável.</p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">7. Programa de Fidelidade</h2>
        <p>Ao comprar conosco, você acumula pontos que podem ser trocados por descontos. Consulte as regras completas na sua área de perfil.</p>
      </section>
    </div>
  </div>
);

export default Termos;
