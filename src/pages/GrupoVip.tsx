import { useEffect, useState, useRef, useCallback } from "react";
import grupoVipLogo from "@/assets/grupo-vip-logo-cropped.png";
import { motion } from "framer-motion";
import { Zap, Ticket, Rocket, Truck, Star, Lock, ChevronRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import SEOHead from "@/components/SEOHead";

const VIP_LINK = "https://chat.whatsapp.com/ELKPRGGU2wMJHV4ex1xAQX";

// ── Intersection Observer hook ──
const useInView = (threshold = 0.15) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
};

const Section = ({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) => {
  const { ref, inView } = useInView();
  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.section>
  );
};

const CTAButton = ({ children, className = "", size = "lg" }: { children: React.ReactNode; className?: string; size?: "lg" | "default" }) => (
  <a href={VIP_LINK} target="_blank" rel="noopener noreferrer" className="inline-block">
    <Button
      size={size}
      className={`bg-[#F5C842] hover:bg-[#e0b636] text-[#7B1C2A] font-bold text-base md:text-lg rounded-full px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 animate-[pulse_2.5s_ease-in-out_infinite] hover:animate-none ${className}`}
    >
      {children}
    </Button>
  </a>
);

// ── PAGE ──
const GrupoVip = () => {
  // Rotating social proof
  const proofs = [
    "🟢 127 pessoas entraram essa semana",
    "🟢 Grupo com mais de 500 membros",
    "🟢 Novas ofertas toda semana",
  ];
  const [proofIdx, setProofIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setProofIdx(i => (i + 1) % proofs.length), 3000);
    return () => clearInterval(t);
  }, []);

  // Decreasing spots counter
  const [spots, setSpots] = useState(47);
  useEffect(() => {
    const t = setInterval(() => setSpots(s => (s > 12 ? s - 1 : 12)), 18000);
    return () => clearInterval(t);
  }, []);

  // Sticky CTA on mobile
  const [showSticky, setShowSticky] = useState(false);
  const handleScroll = useCallback(() => setShowSticky(window.scrollY > 300), []);
  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const benefits = [
    { icon: <Zap className="w-7 h-7" />, title: "Ofertas Relâmpago", desc: "Promoções exclusivas em maquiagem e skincare com tempo limitado — antes de aparecer em qualquer lugar." },
    { icon: <Ticket className="w-7 h-7" />, title: "Cupom Mensal", desc: "Todo mês um cupom de desconto especial pra você usar como quiser nos produtos da Elle Make." },
    { icon: <Rocket className="w-7 h-7" />, title: "Lançamentos em Primeira Mão", desc: "Seja a primeira a saber quando um produto novo chega — e garanta antes de esgotar." },
    { icon: <Truck className="w-7 h-7" />, title: "Frete Grátis*", desc: "Condições especiais de frete para membros do grupo em pedidos selecionados." },
  ];

  const testimonials = [
    { name: "Ana C.", loc: "Belém/PA", text: "Entrei no grupo e na mesma semana já peguei um batom pela metade do preço. Vale muito!" },
    { name: "Juliana M.", loc: "Ananindeua/PA", text: "O cupom mensal já me economizou mais de R$80 esse mês. Indico pra todas as amigas." },
    { name: "Fernanda R.", loc: "Castanhal/PA", text: "Fui a primeira a comprar o novo sérum antes de esgotar. Adorei a exclusividade do grupo!" },
  ];

  const steps = [
    { emoji: "👆", title: "Clique no botão abaixo" },
    { emoji: "📱", title: "Entre no grupo do WhatsApp" },
    { emoji: "🎁", title: "Receba ofertas exclusivas toda semana" },
  ];

  const faqs = [
    { q: "É pago para entrar no grupo?", a: "Não! A entrada no grupo VIP da Elle Make é 100% gratuita." },
    { q: "Qual é o link do grupo?", a: "O link é enviado ao clicar no botão desta página. É direto para o nosso WhatsApp oficial." },
    { q: "Com que frequência chegam as ofertas?", a: "As ofertas relâmpago chegam sem aviso prévio, por isso é importante estar no grupo. O cupom mensal chega todo início de mês." },
    { q: "Posso sair quando quiser?", a: "Sim, você pode sair do grupo a qualquer momento. Mas quem sai perde os benefícios imediatamente." },
    { q: "O frete grátis vale para qualquer pedido?", a: "O frete grátis é oferecido em pedidos selecionados divulgados exclusivamente dentro do grupo." },
  ];

  return (
    <>
      <SEOHead
        title="Grupo VIP Elle Make — Ofertas Exclusivas de Make e Skincare"
        description="Entre no grupo secreto da Elle Make e receba cupom mensal, ofertas relâmpago e lançamentos de maquiagem e skincare antes de todo mundo."
      />

      <div className="font-['DM_Sans',sans-serif] overflow-x-hidden">
        {/* ═══ HERO ═══ */}
        <section className="relative bg-gradient-to-br from-[#7B1C2A] via-[#5e1520] to-[#3d0e15] text-white pt-6 md:pt-8 pb-16 md:pb-24 overflow-hidden">
          {/* subtle texture overlay */}
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/svg%3E\")" }} />

          <div className="relative max-w-5xl mx-auto px-4 text-center">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-[#F5C842]/30 rounded-full px-5 py-2 mb-8 text-sm"
            >
              <Lock className="w-4 h-4 text-[#F5C842]" />
              <span className="vip-shimmer font-semibold tracking-wide text-[#F5C842]">ACESSO EXCLUSIVO — GRUPO VIP</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="font-['Playfair_Display',serif] text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6"
            >
              Faça Parte do Grupo Secreto de{" "}
              <span className="text-[#F5C842]">Maquiagem e Skincare</span>{" "}
              da Elle Make
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="text-base md:text-lg text-white/80 max-w-2xl mx-auto mb-10"
            >
              Cupom mensal, ofertas relâmpago, lançamentos antes de todo mundo e frete grátis* — só para quem está dentro.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <CTAButton className="text-lg md:text-xl px-10 py-7">
                ✨ QUERO ENTRAR NO GRUPO VIP
              </CTAButton>
            </motion.div>

            {/* Rotating social proof */}
            <div className="mt-8 h-6 relative">
              {proofs.map((p, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: i === proofIdx ? 1 : 0, y: i === proofIdx ? 0 : 10 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-x-0 text-sm text-white/70"
                >
                  {p}
                </motion.p>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ BENEFÍCIOS ═══ */}
        <Section className="py-16 md:py-24 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="font-['Playfair_Display',serif] text-2xl md:text-4xl font-bold text-center text-[#7B1C2A] mb-12">
              O Que Só Quem Está Dentro Recebe:
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="group bg-[#7B1C2A]/5 border border-[#F5C842]/20 rounded-2xl p-6 hover:shadow-lg hover:shadow-[#F5C842]/10 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-full bg-[#F5C842]/15 flex items-center justify-center text-[#7B1C2A] mb-4 group-hover:bg-[#F5C842]/25 transition-colors">
                    {b.icon}
                  </div>
                  <h3 className="font-bold text-[#7B1C2A] text-lg mb-2">{b.title}</h3>
                  <p className="text-sm text-[#7B1C2A]/70 leading-relaxed">{b.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══ DEPOIMENTOS ═══ */}
        <Section className="py-16 md:py-24 bg-[#faf7f2]">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="font-['Playfair_Display',serif] text-2xl md:text-4xl font-bold text-center text-[#7B1C2A] mb-12">
              O Que as Meninas Estão Falando:
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.12 }}
                  className="bg-white rounded-2xl p-6 shadow-md border border-[#F5C842]/10"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-full bg-[#7B1C2A] flex items-center justify-center text-white font-bold text-sm">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-[#7B1C2A] text-sm">{t.name}</p>
                      <p className="text-xs text-[#7B1C2A]/50">{t.loc}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-[#F5C842] text-[#F5C842]" />
                    ))}
                  </div>
                  <p className="text-sm text-[#7B1C2A]/80 leading-relaxed italic">"{t.text}"</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ═══ COMO FUNCIONA ═══ */}
        <Section className="py-16 md:py-24 bg-white">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="font-['Playfair_Display',serif] text-2xl md:text-4xl font-bold text-[#7B1C2A] mb-12">
              Entrar é Simples — São Só 3 Passos:
            </h2>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-4">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.7 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.15 }}
                    className="flex flex-col items-center text-center w-48"
                  >
                    <div className="w-16 h-16 rounded-full bg-[#7B1C2A] flex items-center justify-center text-3xl mb-3 shadow-lg">
                      {s.emoji}
                    </div>
                    <p className="text-sm font-semibold text-[#7B1C2A]">
                      <span className="text-[#F5C842] font-bold">Passo {i + 1}</span>
                      <br />
                      {s.title}
                    </p>
                  </motion.div>
                  {i < steps.length - 1 && (
                    <ChevronRight className="hidden md:block w-6 h-6 text-[#F5C842] flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-10">
              <CTAButton>✨ QUERO ENTRAR NO GRUPO VIP</CTAButton>
            </div>
          </div>
        </Section>

        {/* ═══ URGÊNCIA ═══ */}
        <Section className="py-16 md:py-20 bg-[#F5C842]">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="font-['Playfair_Display',serif] text-2xl md:text-4xl font-bold text-[#7B1C2A] mb-4">
              ⚠️ Atenção: As Vagas São Limitadas
            </h2>
            <p className="text-[#7B1C2A]/80 mb-8">
              O grupo tem capacidade limitada de membros. Quando fechar, fecha.
            </p>
            <motion.div
              initial={{ scale: 0.9 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              className="inline-block bg-[#7B1C2A] text-white rounded-2xl px-8 py-5 mb-8 shadow-xl"
            >
              <p className="text-sm uppercase tracking-widest text-[#F5C842] mb-1">Vagas restantes</p>
              <p className="font-['Playfair_Display',serif] text-5xl font-bold">{spots}</p>
            </motion.div>
            <div>
              <a href={VIP_LINK} target="_blank" rel="noopener noreferrer">
                <Button className="bg-[#7B1C2A] hover:bg-[#5e1520] text-white font-bold text-base md:text-lg rounded-full px-8 py-6 shadow-lg">
                  GARANTIR MINHA VAGA AGORA <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </a>
            </div>
          </div>
        </Section>

        {/* ═══ FAQ ═══ */}
        <Section className="py-16 md:py-24 bg-white">
          <div className="max-w-2xl mx-auto px-4">
            <h2 className="font-['Playfair_Display',serif] text-2xl md:text-4xl font-bold text-center text-[#7B1C2A] mb-10">
              Dúvidas Frequentes
            </h2>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((f, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border border-[#7B1C2A]/10 rounded-xl px-5 overflow-hidden"
                >
                  <AccordionTrigger className="text-[#7B1C2A] font-semibold text-left hover:no-underline text-sm md:text-base">
                    ❓ {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-[#7B1C2A]/70 text-sm leading-relaxed">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </Section>

        {/* ═══ CTA FINAL ═══ */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-[#7B1C2A] via-[#5e1520] to-[#3d0e15] text-white text-center">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="font-['Playfair_Display',serif] text-3xl md:text-5xl font-bold mb-4">
              Não Fique De Fora 💄
            </h2>
            <p className="text-white/70 mb-10 text-base md:text-lg">
              Maquiagem e skincare com desconto real, toda semana. É de graça entrar.
            </p>
            <CTAButton className="text-lg md:text-xl px-10 py-7">
              ✨ ENTRAR NO GRUPO VIP AGORA
            </CTAButton>
            <p className="mt-6 text-xs text-white/40 flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3" /> Grupo oficial da Elle Make • @ellemakebelem
            </p>
          </div>
        </section>
      </div>

      {/* Sticky CTA mobile */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: showSticky ? 0 : 100 }}
        className="fixed bottom-0 inset-x-0 z-50 p-3 bg-[#7B1C2A]/95 backdrop-blur border-t border-[#F5C842]/20 md:hidden"
      >
        <a href={VIP_LINK} target="_blank" rel="noopener noreferrer" className="block">
          <Button className="w-full bg-[#F5C842] hover:bg-[#e0b636] text-[#7B1C2A] font-bold rounded-full py-5 text-base flex items-center justify-center gap-2">
            <MessageCircle className="w-5 h-5" /> ENTRAR NO GRUPO VIP
          </Button>
        </a>
      </motion.div>
    </>
  );
};

export default GrupoVip;
