import { motion } from "framer-motion";
import { useRef, useEffect } from "react";
import { ArrowRight, Truck, CreditCard, ShieldCheck, Star, ChevronDown, Heart, Eye, Sparkles, Droplets, Package, Paintbrush, Gem, Palette, Wind, Tag, Zap, Scissors, ShowerHead, SprayCan, Smile, Sun } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProducts, useCategories } from "@/hooks/useProducts";
import ProductCard from "@/components/product/ProductCard";
import UGCSection from "@/components/social/UGCSection";
import Footer from "@/components/layout/Footer";
import InlineConsultant from "@/components/chat/InlineConsultant";
import { useState } from "react";
import heroBanner from "@/assets/hero-banner.mp4";
import { useCoupon } from "@/hooks/useCoupon";
import { toast } from "sonner";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const benefits = [
  { icon: Truck, text: "Entrega Rápida", sub: "Motoboy express em Belém" },
  { icon: ShieldCheck, text: "100% Original", sub: "Registro ANVISA" },
  { icon: CreditCard, text: "Pix com 5% Off", sub: "Cartão até 3x s/ juros" },
  { icon: Star, text: "Brindes", sub: "Pedidos acima de R$200" },
];

const testimonials = [
  { name: "Carla M.", text: "Chegou super rápido! Maquiagem de qualidade incrível, já virei cliente fiel.", rating: 5 },
  { name: "Ana Beatriz", text: "Amei a paleta de olhos! As cores são lindas e a pigmentação é perfeita.", rating: 5 },
  { name: "Juliana S.", text: "Melhor loja de Belém! O atendimento pelo WhatsApp é sensacional.", rating: 5 },
];

const faqs = [
  { q: "Qual o prazo de entrega em Belém?", a: "Oferecemos entrega flash em até 3 horas para a região metropolitana de Belém (Belém e Ananindeua). Para bairros mais distantes, o prazo é de até 24h." },
  { q: "Aceitam Pix?", a: "Sim! Aceitamos Pix com 5% de desconto, cartão de crédito (até 3x sem juros), cartão de débito e boleto bancário." },
  { q: "Como funciona a troca ou devolução?", a: "Você tem até 7 dias após o recebimento para solicitar troca ou devolução. Basta falar conosco pelo WhatsApp." },
  { q: "Os produtos são originais?", a: "Sim! Todos os nossos produtos são 100% originais e adquiridos diretamente dos fabricantes ou distribuidores autorizados." },
  { q: "Qual base ideal para pele oleosa?", a: "Para pele oleosa, recomendamos bases com acabamento matte como a Base Líquida Matte Ruby Rose. Use junto com o Primer Facial Hidratante e o Pó Compacto Velvet Phallebeauty para controlar a oleosidade o dia todo." },
  { q: "Preciso de protetor solar com maquiagem?", a: "Sim! Mesmo usando base com FPS, é importante usar protetor solar antes. O Protetor Solar Facial FPS50 Max Love tem toque seco e acabamento matte, perfeito sob a maquiagem." },
  { q: "Quais marcas vocês trabalham?", a: "Trabalhamos com as melhores marcas nacionais: Ruby Rose, Max Love, Sarah Beauty, Phallebeauty, Luisance e Macrilan. Todas com excelente custo-benefício." },
  { q: "Como escolher o tom certo de base?", a: "O ideal é testar na mandíbula. Se não puder vir pessoalmente, envie uma foto pelo WhatsApp e nossa equipe ajuda a encontrar o tom perfeito!" },
];

const categoryIcons: Record<string, React.ElementType> = {
  labios: Heart,
  rosto: Smile,
  olhos: Eye,
  skincare: Droplets,
  "kits-bundles": Package,
  sobrancelhas: Paintbrush,
  unhas: Gem,
  acessorios: Gem,
  paletas: Palette,
  perfumaria: Wind,
  ofertas: Tag,
  novidades: Zap,
  cabelos: Scissors,
  "corpo-banho": ShowerHead,
  "primers-fixadores": SprayCan,
  protecao: Sun,
};

const Index = () => {
  const { data: featured, isLoading } = useProducts({ featured: true });
  const { data: allProducts, isLoading: loadingAll } = useProducts({});
  const { data: categories } = useCategories();
  const [couponCode, setCouponCode] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.play().catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Maquiagem e Cosméticos em Belém"
        description="Loja de maquiagem com delivery rápido em Belém do Pará. Frete grátis acima de R$ 199. Entrega em até 3h na região metropolitana."
        url={window.location.origin}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Elle Make",
            url: window.location.origin,
            potentialAction: { "@type": "SearchAction", target: `${window.location.origin}/explorar?q={search_term_string}`, "query-input": "required name=search_term_string" },
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Elle Make",
            url: window.location.origin,
            logo: `${window.location.origin}/pwa-512x512.png`,
            contactPoint: {
              "@type": "ContactPoint",
              telephone: "+55-91-98304-5531",
              contactType: "customer service",
              areaServed: "BR",
              availableLanguage: "Portuguese",
            },
            address: {
              "@type": "PostalAddress",
              addressLocality: "Belém",
              addressRegion: "PA",
              addressCountry: "BR",
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            name: "Elle Make",
            image: `${window.location.origin}/pwa-512x512.png`,
            address: {
              "@type": "PostalAddress",
              addressLocality: "Belém",
              addressRegion: "PA",
              addressCountry: "BR",
            },
            priceRange: "$$",
          },
        ]}
      />

      {/* Hero with Video Banner */}
      <section className="relative overflow-hidden bg-background">
        <video
          ref={videoRef}
          src={heroBanner}
          loop
          muted
          playsInline
          autoPlay
          preload="auto"
          className="w-full h-[320px] md:h-[480px] object-cover"
        />
        {/* Gradient overlay — lateral + bottom */}
        <div className="absolute inset-0 bg-gradient-to-l from-background/90 via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="absolute inset-0 flex items-center justify-end px-6 md:px-16"
        >
          <div className="max-w-lg text-right">
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="font-serif-accent text-3xl md:text-5xl font-bold leading-tight text-foreground mb-4"
              style={{ textShadow: '0 2px 20px hsl(var(--background) / 0.8), 0 1px 4px hsl(var(--background) / 0.6)' }}
            >
              Maquiagem e{" "}
              <span className="text-primary" style={{ textShadow: '0 2px 16px hsl(var(--primary) / 0.4)' }}>
                Cosméticos
              </span>
              <br />em Belém
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
              className="text-sm md:text-lg font-semibold text-foreground/90 mb-3"
              style={{ textShadow: '0 1px 8px hsl(var(--background) / 0.7)' }}
            >
              Frete grátis acima de R$ 199
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9, type: "spring", stiffness: 200 }}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-xs md:text-sm font-bold px-5 py-2 rounded-full mb-6 shadow-lg"
              style={{ boxShadow: '0 0 20px hsl(var(--primary) / 0.4), 0 4px 12px hsl(var(--primary) / 0.3)' }}
            >
              <span className="animate-pulse">🛵</span>
              Entrega em até 3h · Belém e Ananindeua
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="flex flex-wrap gap-3 justify-end"
            >
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-[48px] px-8 rounded-full font-semibold shadow-lg relative overflow-hidden group">
                <Link to="/explorar">
                  <span className="relative z-10 flex items-center">
                    Ver Produtos <ArrowRight className="w-4 h-4 ml-1.5" />
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </Link>
              </Button>
              <Button variant="outline" asChild className="min-h-[48px] px-6 rounded-full border-accent text-accent hover:bg-accent hover:text-accent-foreground font-semibold bg-background/70 backdrop-blur-sm shadow-lg">
                <a href="https://wa.me/5591983045531?text=Olá! Gostaria de fazer um pedido" target="_blank" rel="noopener noreferrer">
                  <WhatsAppIcon className="w-4 h-4 mr-1.5" /> Comprar no WhatsApp
                </a>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Benefits bar */}
      <section className="border-b border-border bg-card/50 backdrop-blur-sm px-4 py-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
          {benefits.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.05, y: -3 }}
              className="flex flex-col items-center text-center gap-2 p-4 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <b.icon className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xs font-bold text-foreground">{b.text}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{b.sub}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured / Novidades */}
      <section className="px-4 py-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-foreground">Novidades</h2>
          <Link to="/explorar" className="text-xs text-primary font-semibold hover:underline">Ver tudo →</Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-lg bg-muted overflow-hidden">
                <div className="w-full h-full bg-gradient-to-r from-muted via-muted-foreground/5 to-muted animate-shimmer bg-[length:200%_100%]" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {featured?.slice(0, 5).map((product, i) => (
              <motion.div key={product.id} variants={item}>
                <ProductCard product={product} index={i} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* Super Ofertas */}
      <section className="px-4 py-8 max-w-5xl mx-auto bg-cream/50">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-primary">🔥 Super Ofertas</h2>
          <Link to="/explorar" className="text-xs text-primary font-semibold hover:underline">Ver tudo →</Link>
        </div>
        {loadingAll ? (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-lg bg-muted animate-shimmer" />
            ))}
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {allProducts?.filter(p => p.compare_at_price && p.compare_at_price > p.price).slice(0, 5).map((product, i) => (
              <motion.div key={product.id} variants={item}>
                <ProductCard product={product} index={i} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* Glow – Consultora IA inline */}
      <InlineConsultant />

      {/* Categories Sections */}
      {categories && categories.length > 0 && (
        <section className="px-4 py-6 max-w-5xl mx-auto">
          <h2 className="text-lg font-bold text-foreground mb-3">Categorias</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {categories.map((cat, i) => {
              const IconComp = categoryIcons[cat.slug] || Sparkles;
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.03 }}
                  className="flex-shrink-0"
                >
                  <Link
                    to={`/explorar?cat=${cat.slug}`}
                    className="flex flex-col items-center gap-1 w-14 text-center group"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                      <IconComp className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-[9px] font-medium text-muted-foreground group-hover:text-primary transition-colors leading-tight truncate w-full">{cat.name}</p>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* Coupon Section */}
      <section className="px-4 py-8 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-card border-2 border-dashed border-primary/30 rounded-xl p-6 text-center"
        >
          <h2 className="text-lg font-bold text-foreground mb-1">🎟️ Tem um cupom de desconto?</h2>
          <p className="text-xs text-muted-foreground mb-4">Aplique seu cupom e economize na sua compra</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (couponCode.trim()) {
                toast.success(`Cupom "${couponCode}" salvo! Aplique no checkout.`);
                localStorage.setItem("saved-coupon", couponCode.trim().toUpperCase());
              }
            }}
            className="flex gap-2 max-w-sm mx-auto"
          >
            <Input
              placeholder="Digite seu cupom"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              className="rounded-full text-center font-semibold uppercase tracking-wider"
            />
            <Button type="submit" className="bg-primary text-primary-foreground rounded-full px-6 font-semibold hover:bg-primary/90">
              Aplicar
            </Button>
          </form>
        </motion.div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-8 max-w-5xl mx-auto">
        <h2 className="text-xl font-bold text-foreground mb-5 text-center">Veja a opinião de quem já comprou</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-lg p-5"
            >
              <div className="flex gap-0.5 mb-2">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-gold-star text-gold-star" />
                ))}
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-3">"{t.text}"</p>
              <p className="text-xs font-semibold text-muted-foreground">— {t.name}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-8 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-foreground mb-5 text-center">Perguntas Frequentes</h2>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="bg-card border border-border rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span className="text-sm font-semibold text-foreground">{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
              </button>
              {openFaq === i && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-5 pb-4"
                >
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* UGC */}
      <UGCSection />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
