import { Instagram, MapPin, Phone, Mail, Clock, Truck, ShieldCheck, CreditCard, Gift, Lock, Globe, Award } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import mercadopagoSelos from "@/assets/mercadopago-selos.png";
import logoEllemake from "@/assets/logo-ellemake.png";

const Footer = () => {
  return (
    <>
      {/* Trust badges */}
      <section className="border-t border-border bg-card px-4 py-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
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
        <div className="max-md mx-auto space-y-4">
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
            <a href="https://wa.me/5591936180774?text=Olá! Gostaria de saber mais sobre os produtos" target="_blank" rel="noopener noreferrer">
              <WhatsAppIcon className="w-4 h-4 mr-2" />
              Falar no WhatsApp
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary [--primary-foreground:0_0%_100%] text-primary-foreground px-4 pt-10 pb-24 md:pb-10 font-bold">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <img src={logoEllemake} alt="Elle Make" className="h-8 object-contain brightness-0 invert" />
            <p className="text-xs leading-relaxed text-primary-foreground/50">
              Maquiagem e cosméticos com entrega rápida em Belém do Pará.
            </p>
            <div className="flex gap-3">
              <a href="https://wa.me/5591936180774" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors" aria-label="WhatsApp">
                <WhatsAppIcon className="w-4 h-4" />
              </a>
              <a href="https://instagram.com/ellemakebelem" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors" aria-label="Instagram">
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Institutional */}
          <div>
            <h4 className="text-[11px] font-bold text-primary-foreground uppercase tracking-wider mb-4">Institucional</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Sobre Nós", to: "/sobre" },
                { label: "Blog", to: "/blog" },
                { label: "Quiz de Beleza", to: "/quiz-beleza" },
                { label: "Glossário", to: "/glossario" },
                { label: "Política de Privacidade", to: "/privacidade" },
                { label: "Termos de Uso", to: "/termos" },
                { label: "Contato", to: "/consultora" },
                { label: "Programa de Fidelidade", to: "/perfil" },
                { label: "Trocas e Devoluções", to: "/termos" },
              ].map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-xs hover:text-primary-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Minha Conta */}
          <div>
            <h4 className="text-[11px] font-bold text-primary-foreground uppercase tracking-wider mb-4">Minha Conta</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Meus Pedidos", to: "/pedidos" },
                { label: "Meus Favoritos", to: "/favoritos" },
                { label: "Meu Perfil", to: "/perfil" },
                { label: "Meu Carrinho", to: "/carrinho" },
              ].map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-xs hover:text-primary-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="text-[11px] font-bold text-primary-foreground uppercase tracking-wider mb-4">Contato</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2.5 text-xs">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-primary-foreground/50" />
                Belém, PA
              </li>
              <li className="flex items-center gap-2.5 text-xs">
                <Phone className="w-3.5 h-3.5 flex-shrink-0 text-primary-foreground/50" />
                <a href="tel:+5591936180774" className="hover:text-primary-foreground transition-colors">(91) 93618-0774</a>
              </li>
              <li className="flex items-center gap-2.5 text-xs">
                <Mail className="w-3.5 h-3.5 flex-shrink-0 text-primary-foreground/50" />
                <a href="mailto:ellemakeloja@gmail.com" className="hover:text-primary-foreground transition-colors">ellemakeloja@gmail.com</a>
              </li>
              <li className="flex items-start gap-2.5 text-xs mt-2">
                <Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-primary-foreground/50" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-primary-foreground text-[11px]">Atendimento</p>
                  <p>Seg–Sex: 9h às 18h</p>
                  <p>Sáb: 9h às 13h</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Security Badges + Payment */}
        <div className="max-w-7xl mx-auto mt-10 pt-8 border-t border-primary-foreground/10">
          <div className="flex flex-col items-center gap-8">
            {/* Security seals */}
            <div className="flex items-center gap-8 md:gap-12">
              {[
                { icon: ShieldCheck, label: "Site Protegido", detail: "Ambiente 100% seguro" },
                { icon: Lock, label: "Pagamento Seguro", detail: "Criptografia SSL 256-bit" },
                { icon: Globe, label: "Loja Verificada", detail: "CNPJ 65.548.306/0001-22" },
              ].map((seal) => (
                <div key={seal.label} className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary-foreground/10 border border-primary-foreground/20 flex items-center justify-center">
                    <seal.icon className="w-7 h-7 md:w-9 md:h-9 text-primary-foreground/80" />
                  </div>
                  <span className="text-[11px] md:text-xs font-bold text-primary-foreground/70 text-center leading-tight tracking-wide uppercase">{seal.label}</span>
                  <span className="text-[10px] text-primary-foreground/40 text-center leading-tight">{seal.detail}</span>
                </div>
              ))}
            </div>

            {/* Mercado Pago seals */}
            <div className="flex flex-col items-center gap-2">
              <img
                src={mercadopagoSelos}
                alt="Selos Mercado Pago - Compra Garantida, Visa, MasterCard, American Express, Boleto"
                className="h-20 md:h-24 w-auto object-contain brightness-150"
                loading="lazy"
              />
              <span className="text-[10px] text-primary-foreground/50">Pagamentos processados pelo Mercado Pago</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="max-w-7xl mx-auto mt-5 pt-5 border-t border-primary-foreground/10 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-[10px] text-primary-foreground/40 text-center md:text-left">
            <p>© 2026 Elle Make. Todos os direitos reservados.</p>
            <p className="mt-0.5">CNPJ: 65.548.306/0001-22 — Isabelly Miranda Linhares</p>
          </div>
          <div className="flex gap-3 text-[10px] text-primary-foreground/30">
            <Link to="/privacidade" className="hover:text-primary-foreground/50 transition-colors">Privacidade</Link>
            <Link to="/termos" className="hover:text-primary-foreground/50 transition-colors">Termos</Link>
            <span>🛵 Belém e Ananindeua: entrega em até 3h</span>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;