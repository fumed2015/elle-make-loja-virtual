import { motion } from "framer-motion";
import { useRef, useEffect, lazy, Suspense, useMemo } from "react";
import { ArrowRight, Truck, CreditCard, ShieldCheck, Star, ChevronDown, Heart, Eye, Sparkles, Droplets, Package, Paintbrush, Gem, Palette, Wind, Tag, Zap, Scissors, ShowerHead, SprayCan, Smile, Sun } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAllProductsUnified, useCategories } from "@/hooks/useProducts";
import ProductCard from "@/components/product/ProductCard";

import Footer from "@/components/layout/Footer";
import { useState } from "react";
import { toast } from "sonner";

// Lazy load heavy InlineConsultant (pulls react-markdown ~69KB)
const InlineConsultant = lazy(() => import("@/components/chat/InlineConsultant"));

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const benefits = [
  { icon: Truck, text: "Entrega em até 3h", sub: "Motoboy express em Belém" },
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
  // Single unified query instead of 2 separate ones
  const { data: allProducts, isLoading } = useAllProductsUnified();
  const { data: categories } = useCategories();
  const [couponCode, setCouponCode] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  // Derive featured + offers from single query (no extra network calls)
  const featured = useMemo(() => allProducts?.filter(p => p.is_featured).slice(0, 5) || [], [allProducts]);
  const offers = useMemo(() => allProducts?.filter(p => p.compare_at_price && p.compare_at_price > p.price).slice(0, 5) || [], [allProducts]);
  const moreProducts = useMemo(() => allProducts?.filter(p => !p.is_featured).slice(0, 10) || [], [allProducts]);

  useEffect(() => {
    // Immediate scroll
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    // Deferred scroll after paint to beat browser restore
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    const timeout = setTimeout(() => {
      if (video.readyState < 2) setVideoFailed(true);
    }, 6000);

    const tryPlay = () => {
      const p = video.play();
      if (p !== undefined) {
        p.then(() => setVideoFailed(false)).catch(() => {
          setVideoFailed(true);
          // Wait for user interaction (Safari often needs this)
          const resume = () => {
            video.play().then(() => setVideoFailed(false)).catch(() => {});
          };
          document.addEventListener('touchstart', resume, { once: true });
          document.addEventListener('click', resume, { once: true });
        });
      }
    };

    // Safari needs data loaded before play
    if (video.readyState >= 2) {
      tryPlay();
    } else {
      video.addEventListener('loadeddata', tryPlay, { once: true });
    }

    video.addEventListener('error', () => setVideoFailed(true));

    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Maquiagem e Cosméticos em Belém"
        description="Loja de maquiagem com delivery rápido em Belém do Pará. Frete grátis acima de R$ 199. Entrega em até 3h na região metropolitana."
        url={window.location.origin}
        image={`${window.location.origin}/og-image.jpg`}
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
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map(f => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
      />

      {/* Hero — video with instant poster + lazy video load */}
      <section className="relative overflow-hidden bg-background">
        {/* Poster image shown immediately while video loads */}
        {(!videoReady || videoFailed) && (
          <img
            src="/pwa-512x512.png"
            alt="Elle Make - Maquiagem e Cosméticos"
            className="w-full h-[320px] md:h-[480px] object-cover absolute inset-0"
            style={{ objectPosition: "center" }}
          />
        )}
        <video
          ref={videoRef}
          loop
          muted
          playsInline
          autoPlay
          preload="metadata"
          className={`w-full h-[320px] md:h-[480px] object-cover transition-opacity duration-500 ${videoReady && !videoFailed ? 'opacity-100' : 'opacity-0'}`}
          style={{ objectPosition: "200% center" }}
          onCanPlay={(e) => {
            setVideoReady(true);
            setVideoFailed(false);
            e.currentTarget.play().catch(() => {});
          }}
          onError={() => setVideoFailed(true)}
        >
          <source src="/hero-banner.mp4" type="video/mp4" />
        </video>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/50 via-transparent to-transparent" />

        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="absolute inset-0 flex items-center px-6 md:px-16"
        >
          <div className="max-w-lg text-left">
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
              initial={{ opacity: 0, x: -20 }}
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
              className="flex flex-wrap gap-3"
            >
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-[48px] px-8 rounded-full font-semibold shadow-lg relative overflow-hidden group">
                <Link to="/explorar">
                  <span className="relative z-10 flex items-center">
                    Ver Catálogo <ArrowRight className="w-4 h-4 ml-1.5" />
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

      {/* Benefits bar — removed individual whileInView, single container animation */}
      <section className="border-b border-border bg-card/50 backdrop-blur-sm px-4 py-4">
        <div className="max-w-5xl mx-auto flex justify-between gap-2 overflow-x-auto scrollbar-hide">
          {benefits.map((b, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg min-w-fit flex-1 animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <b.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-foreground whitespace-nowrap">{b.text}</p>
                <p className="text-[10px] text-muted-foreground whitespace-nowrap">{b.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured / Novidades */}
      <section className="px-4 py-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">✨ Novidades</h2>
            <p className="text-xs text-muted-foreground">Acabou de chegar na loja</p>
          </div>
          <Link to="/explorar" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">Ver tudo <ArrowRight className="w-3 h-3" /></Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-lg bg-muted overflow-hidden">
                <div className="w-full h-full bg-gradient-to-r from-muted via-muted-foreground/5 to-muted animate-shimmer bg-[length:200%_100%]" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {featured.map((product, i) => (
              <motion.div key={product.id} variants={item}>
                <ProductCard product={product} index={i} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* Free shipping bar */}
      <section className="px-4 py-3 max-w-5xl mx-auto">
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex items-center gap-3">
          <Truck className="w-6 h-6 text-accent flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold text-foreground">Frete GRÁTIS acima de R$ 199</p>
            <p className="text-[10px] text-muted-foreground">Entrega rápida para Belém e região metropolitana • Motoboy em até 3h</p>
          </div>
          <Link to="/explorar">
            <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-full border-accent text-accent hover:bg-accent hover:text-accent-foreground">
              Comprar
            </Button>
          </Link>
        </div>
      </section>

      {/* Super Ofertas */}
      <section className="px-4 py-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-primary">🔥 Super Ofertas</h2>
            <p className="text-xs text-muted-foreground">Economize até 50% em produtos selecionados</p>
          </div>
          <Link to="/explorar" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">Ver tudo <ArrowRight className="w-3 h-3" /></Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-lg bg-muted animate-shimmer" />
            ))}
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {offers.map((product, i) => (
              <motion.div key={product.id} variants={item}>
                <ProductCard product={product} index={i} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* Mais Produtos */}
      <section className="px-4 py-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">🛍️ Mais Produtos</h2>
            <p className="text-xs text-muted-foreground">Explore todo nosso catálogo</p>
          </div>
          <Link to="/explorar" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">Ver catálogo <ArrowRight className="w-3 h-3" /></Link>
        </div>
        {!isLoading && (
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {moreProducts.map((product, i) => (
              <motion.div key={product.id} variants={item}>
                <ProductCard product={product} index={i} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* Glow – Consultora IA inline (lazy loaded) */}
      <Suspense fallback={
        <div className="px-4 py-10 max-w-3xl mx-auto text-center">
          <div className="h-[400px] bg-muted rounded-2xl animate-pulse flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Carregando consultora...</p>
          </div>
        </div>
      }>
        <InlineConsultant />
      </Suspense>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="px-4 py-6 max-w-5xl mx-auto">
          <h2 className="text-lg font-bold text-foreground mb-3">Categorias</h2>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {categories.map((cat) => {
              const IconComp = categoryIcons[cat.slug] || Sparkles;
              return (
                <div key={cat.id} className="flex-shrink-0">
                  <Link
                    to={`/explorar?cat=${cat.slug}`}
                    className="flex flex-col items-center gap-1 w-14 text-center group"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                      <IconComp className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-[9px] font-medium text-muted-foreground group-hover:text-primary transition-colors leading-tight truncate w-full">{cat.name}</p>
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Coupon Section — removed whileInView */}
      <section className="px-4 py-8 max-w-lg mx-auto">
        <div className="bg-card border-2 border-dashed border-primary/30 rounded-xl p-6 text-center">
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
        </div>
      </section>

      {/* Testimonials — removed individual whileInView, CSS animation */}
      <section className="px-4 py-8 max-w-5xl mx-auto">
        <h2 className="text-xl font-bold text-foreground mb-5 text-center">Veja a opinião de quem já comprou</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-lg p-5 animate-fade-in"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex gap-0.5 mb-2">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-gold-star text-gold-star" />
                ))}
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-3">"{t.text}"</p>
              <p className="text-xs font-semibold text-muted-foreground">— {t.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ — removed individual whileInView */}
      <section className="px-4 py-8 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-foreground mb-5 text-center">Perguntas Frequentes</h2>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div
              key={i}
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
            </div>
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
