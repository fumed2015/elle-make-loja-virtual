import { MessageCircle, Instagram, MapPin, Phone, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Footer = () => {
  return (
    <>
      {/* WhatsApp CTA Section */}
      <section className="bg-gradient-whatsapp px-4 py-10 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <MessageCircle className="w-12 h-12 text-accent-foreground mx-auto" />
          <h2 className="text-2xl font-bold text-accent-foreground">
            Sua beleza perfeita está a uma mensagem de distância
          </h2>
          <p className="text-sm text-accent-foreground/80">
            Atendimento personalizado com nossas consultoras
          </p>
          <Button
            asChild
            className="bg-card text-accent hover:bg-card/90 font-bold px-8 min-h-[48px] rounded-full shadow-whatsapp"
          >
            <a href="https://wa.me/5591999999999?text=Olá! Gostaria de saber mais sobre os produtos" target="_blank" rel="noopener noreferrer">
              Falar com Consultora Agora
            </a>
          </Button>
        </div>
      </section>

      {/* Institutional Footer */}
      <footer className="bg-foreground text-background/80 px-4 py-10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <h3 className="text-lg font-bold text-background tracking-wider mb-3">ELLE MAKE</h3>
            <p className="text-xs leading-relaxed text-background/60">
              Maquiagem e cosméticos com entrega rápida em Belém do Pará. Qualidade e sofisticação para realçar sua beleza.
            </p>
          </div>

          {/* Institutional */}
          <div>
            <h4 className="text-xs font-bold text-background uppercase tracking-wider mb-3">Institucional</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-xs hover:text-background transition-colors">Sobre nós</Link></li>
              <li><Link to="/" className="text-xs hover:text-background transition-colors">Política de Privacidade</Link></li>
              <li><Link to="/" className="text-xs hover:text-background transition-colors">Termos de Uso</Link></li>
              <li><Link to="/" className="text-xs hover:text-background transition-colors">Trocas e Devoluções</Link></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-xs font-bold text-background uppercase tracking-wider mb-3">Ajuda</h4>
            <ul className="space-y-2">
              <li><Link to="/pedidos" className="text-xs hover:text-background transition-colors">Meus Pedidos</Link></li>
              <li><Link to="/consultora" className="text-xs hover:text-background transition-colors">Fale Conosco</Link></li>
              <li><Link to="/" className="text-xs hover:text-background transition-colors">Central de Ajuda</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-bold text-background uppercase tracking-wider mb-3">Contato</h4>
            <ul className="space-y-2">
              <li className="flex items-center gap-2 text-xs"><MapPin className="w-3.5 h-3.5 flex-shrink-0" /> Belém, PA</li>
              <li className="flex items-center gap-2 text-xs"><Phone className="w-3.5 h-3.5 flex-shrink-0" /> (91) 99999-9999</li>
              <li className="flex items-center gap-2 text-xs"><Mail className="w-3.5 h-3.5 flex-shrink-0" /> contato@ellemake.com</li>
            </ul>
            <div className="flex gap-3 mt-4">
              <a href="#" className="w-8 h-8 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-8 pt-6 border-t border-background/10 text-center">
          <p className="text-[10px] text-background/40">© 2026 Elle Make. Todos os direitos reservados. CNPJ: 00.000.000/0001-00</p>
        </div>
      </footer>
    </>
  );
};

export default Footer;
