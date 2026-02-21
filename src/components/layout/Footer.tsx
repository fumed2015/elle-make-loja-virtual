import { Instagram, MapPin, Phone, Mail, Clock, Truck, ShieldCheck, CreditCard, Gift } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Footer = () => {
  return (
    <>
      {/* Trust badges */}
      <section className="border-t border-border bg-card px-4 py-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Truck, title: "Entrega Rápida", sub: "Motoboy express em Belém" },
            { icon: ShieldCheck, title: "100% Original", sub: "Registro ANVISA" },
            { icon: CreditCard, title: "Pix com 5% Off", sub: "Cartão até 3x s/ juros" },
            { icon: Gift, title: "Brindes", sub: "Pedidos acima de R$200" },
          ].map((b) => (
            <div key={b.title} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <b.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">{b.title}</p>
                <p className="text-[10px] text-muted-foreground">{b.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* WhatsApp CTA */}
      <section className="bg-gradient-whatsapp px-4 py-10 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <WhatsAppIcon className="w-10 h-10 text-accent-foreground mx-auto" />
          <h2 className="text-xl font-bold text-accent-foreground">
            Precisa de ajuda? Fale com a gente!
          </h2>
          <p className="text-sm text-accent-foreground/80">
            Atendimento personalizado via WhatsApp
          </p>
          <Button
            asChild
            className="bg-card text-accent hover:bg-card/90 font-bold px-8 min-h-[48px] rounded-full shadow-whatsapp"
          >
            <a href="https://wa.me/5591983045531?text=Olá! Gostaria de saber mais sobre os produtos" target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="w-4 h-4 mr-2" />
              Falar no WhatsApp
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background/70 px-4 pt-10 pb-24 md:pb-10">
        <div className="max-w-5xl mx-auto grid grid-cols-4 gap-6 md:gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-background tracking-wider">ELLE MAKE</h3>
            <p className="text-xs leading-relaxed text-background/50">
              Maquiagem e cosméticos com entrega rápida em Belém do Pará.
            </p>
            <div className="flex gap-3">
              <a href="https://wa.me/5591983045531" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors" aria-label="WhatsApp">
                <WhatsAppIcon className="w-4 h-4" />
              </a>
              <a href="https://instagram.com/michelle_makestore" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors" aria-label="Instagram">
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Institutional */}
          <div>
            <h4 className="text-[11px] font-bold text-background uppercase tracking-wider mb-4">Institucional</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Sobre Nós", to: "/" },
                { label: "Contato", to: "/consultora" },
                { label: "Dúvidas Frequentes", to: "/" },
                { label: "Programa de Fidelidade", to: "/" },
                { label: "Formas de Pagamento", to: "/" },
                { label: "Regulamento de Entrega", to: "/" },
                { label: "Trocas e Devoluções", to: "/" },
              ].map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-xs hover:text-background transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Minha Conta */}
          <div>
            <h4 className="text-[11px] font-bold text-background uppercase tracking-wider mb-4">Minha Conta</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Meus Pedidos", to: "/pedidos" },
                { label: "Meus Favoritos", to: "/favoritos" },
                { label: "Meu Perfil", to: "/perfil" },
                { label: "Meu Carrinho", to: "/carrinho" },
              ].map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-xs hover:text-background transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="text-[11px] font-bold text-background uppercase tracking-wider mb-4">Contato</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2.5 text-xs">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-background/50" />
                Belém, PA
              </li>
              <li className="flex items-center gap-2.5 text-xs">
                <Phone className="w-3.5 h-3.5 flex-shrink-0 text-background/50" />
                <a href="tel:+5591983045531" className="hover:text-background transition-colors">(91) 98304-5531</a>
              </li>
              <li className="flex items-center gap-2.5 text-xs">
                <Mail className="w-3.5 h-3.5 flex-shrink-0 text-background/50" />
                contato@ellemake.com
              </li>
              <li className="flex items-start gap-2.5 text-xs mt-2">
                <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-background/50" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-background text-[11px]">Atendimento</p>
                  <p>Seg–Sex: 9h às 18h</p>
                  <p>Sáb: 9h às 13h</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="max-w-5xl mx-auto mt-8 pt-5 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[10px] text-background/40">© 2026 Elle Make. Todos os direitos reservados.</p>
          <p className="text-[10px] text-background/30">🛵 Belém e Ananindeua: entrega em até 3 horas!</p>
        </div>
      </footer>
    </>
  );
};

export default Footer;