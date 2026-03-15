import { motion, AnimatePresence } from "framer-motion";
import { useEffect, lazy, Suspense, useMemo, useRef, useCallback } from "react";
import { ArrowRight, Truck, CreditCard, ShieldCheck, Star, ChevronDown, ChevronLeft, ChevronRight, Heart, Eye, Sparkles, Tag } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { Link, useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAllProductsUnified, useCategories } from "@/hooks/useProducts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/product/ProductCard";

import Footer from "@/components/layout/Footer";
import { useState } from "react";
import { toast } from "sonner";

// Lazy load heavy InlineConsultant (pulls react-markdown ~69KB)
const InlineConsultant = lazy(() => import("@/components/chat/InlineConsultant"));
const NewsletterPopup = lazy(() => import("@/components/newsletter/NewsletterPopup"));

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


const Index = () => {
  const { data: allProducts, isLoading } = useAllProductsUnified();
  const { data: categories } = useCategories();
  const [couponCode, setCouponCode] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Fetch curated section configs from promotions
  const { data: sectionConfigs } = useQuery({
    queryKey: ["homepage-section-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("promotions")
        .select("position, product_ids")
        .eq("type", "homepage_section")
        .eq("is_active", true);
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch best-selling product IDs from orders
  const { data: bestSellerIds } = useQuery({
    queryKey: ["best-seller-ids"],
    queryFn: async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("items")
        .not("status", "in", '("cancelled","refunded")');
      if (!orders) return [];
      // Count sales per product_id
      const counts: Record<string, number> = {};
      for (const order of orders) {
        const items = order.items as any[];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          const pid = item.product_id;
          if (pid) counts[pid] = (counts[pid] || 0) + (item.quantity || 1);
        }
      }
      // Sort by count descending
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);
    },
    staleTime: 1000 * 60 * 10,
  });

  // Helper: get curated products for a section, respecting order
  const getCuratedProducts = (sectionKey: string, fallbackFn: () => typeof allProducts) => {
    const config = sectionConfigs?.find((c) => c.position === sectionKey);
    if (config?.product_ids && config.product_ids.length > 0 && allProducts) {
      return config.product_ids
        .map((id: string) => allProducts.find((p) => p.id === id))
        .filter(Boolean);
    }
    return fallbackFn();
  };

  // Novidades: curated > best sellers > featured > newest
  const featured = useMemo(() => getCuratedProducts(
    "novidades",
    () => {
      if (!allProducts?.length) return [];
      // Try best sellers first
      if (bestSellerIds?.length) {
        const bestSellers = bestSellerIds
          .map(id => allProducts.find(p => p.id === id))
          .filter(Boolean)
          .slice(0, 5);
        if (bestSellers.length >= 3) return bestSellers;
      }
      // Fallback: featured products, then newest
      const feat = allProducts.filter(p => p.is_featured);
      return feat.length > 0 ? feat.slice(0, 5) : allProducts.slice(0, 5);
    }
  ), [allProducts, sectionConfigs, bestSellerIds]);

  // Super Ofertas: curated > products with discount > random selection
  const offers = useMemo(() => getCuratedProducts(
    "super_ofertas",
    () => {
      if (!allProducts?.length) return [];
      const withDiscount = allProducts.filter(p => p.compare_at_price && p.compare_at_price > p.price);
      if (withDiscount.length > 0) return withDiscount.slice(0, 5);
      // Fallback: cheapest products as "ofertas"
      const sorted = [...allProducts].sort((a, b) => a.price - b.price);
      return sorted.slice(0, 5);
    }
  ), [allProducts, sectionConfigs]);

  // Mais Produtos: curated > remaining products
  const moreProducts = useMemo(() => getCuratedProducts(
    "mais_produtos",
    () => {
      if (!allProducts?.length) return [];
      const usedIds = new Set([...featured, ...offers].map((p: any) => p?.id).filter(Boolean));
      const remaining = allProducts.filter(p => !usedIds.has(p.id));
      return remaining.length > 0 ? remaining.slice(0, 10) : allProducts.slice(0, 10);
    }
  ), [allProducts, sectionConfigs, featured, offers]);

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
const heroSlides = [
  {
    image: "/hero-banner.jpg",
    label: "Maquiagem & Cosméticos",
    title: "ELLE\nMAKE",
    cta: "Ver Catálogo",
    link: "/explorar",
  },
  {
    image: "/hero-banner-2.jpg",
    label: "Lábios Perfeitos",
    title: "BATONS\n& GLOSS",
    cta: "Ver Coleção",
    link: "/categoria/labios",
  },
  {
    image: "/hero-banner-3.jpg",
    label: "Base & Skincare",
    title: "PELE\nPERFEITA",
    cta: "Ver Catálogo",
    link: "/categoria/rosto",
  },
];

// Moved OUTSIDE Index to prevent re-creation on parent re-renders
const HeroCarousel = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => setCurrent(c => (c + 1) % heroSlides.length), 15000);
    return () => clearInterval(timer);
  }, []);

  const prev = () => setCurrent(c => (c - 1 + heroSlides.length) % heroSlides.length);
  const next = () => setCurrent(c => (c + 1) % heroSlides.length);

  const slide = heroSlides[current];

  return (
    <section className="relative overflow-hidden -mt-[88px] md:-mt-[120px]" style={{ backgroundColor: 'hsl(20 30% 88%)' }}>
      {/* All images stay mounted — toggle opacity instead of AnimatePresence to avoid duplicate loads */}
      {heroSlides.map((s, i) => (
        <img
          key={s.image}
          src={s.image}
          alt={s.label}
          className={`w-full h-[520px] md:h-[620px] lg:h-[660px] object-cover transition-opacity duration-700 ${i === 0 ? '' : 'absolute inset-0'}`}
          style={{
            objectPosition: "center",
            opacity: i === current ? 1 : 0,
            zIndex: i === current ? 1 : 0,
          }}
          loading={i === 0 ? "eager" : "lazy"}
          fetchPriority={i === 0 ? "high" : "auto"}
          decoding={i === 0 ? "sync" : "async"}
        />
      ))}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent hidden md:block pointer-events-none z-[2]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 md:hidden pointer-events-none z-[2]" />

      {/* Clickable banner overlay */}
      <Link to={slide.link} className="absolute inset-0 z-[3]" aria-label={slide.label} />

      {/* Desktop: left-aligned content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`desktop-${current}`}
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 hidden md:flex items-center px-16 lg:px-24 pt-[100px] z-[4]"
        >
          <div className="max-w-lg">
            <span
              className="inline-block text-xs font-medium tracking-[0.3em] uppercase px-5 py-2 mb-5 rounded-md"
              style={{
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#FAF3E8',
                fontFamily: 'Montserrat, sans-serif',
              }}
            >
              {slide.label}
            </span>

            <h1
              className="text-6xl lg:text-8xl font-bold leading-[0.85] mb-8 tracking-tight whitespace-pre-line"
              style={{
                color: '#FAF3E8',
                textShadow: '0 4px 16px rgba(20,10,5,0.7), 0 1px 3px rgba(0,0,0,0.5)',
                fontFamily: '"Playfair Display", Didot, "Bodoni MT", Georgia, serif',
              }}
            >
              {slide.title}
            </h1>

            <div className="flex gap-3">
              <Button asChild className="bg-primary hover:bg-primary/90 min-h-[48px] px-10 rounded-sm shadow-xl relative overflow-hidden group border-0">
                <Link to={slide.link}>
                  <span className="relative z-10 font-medium text-sm uppercase tracking-[0.1em]" style={{ color: '#FAF3E8', fontFamily: 'Montserrat, sans-serif' }}>{slide.cta}</span>
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                </Link>
              </Button>
              <a
                href="https://wa.me/5591936180774?text=Ol%C3%A1!%20Vim%20pelo%20site%20e%20gostaria%20de%20comprar!"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[48px] px-6 rounded-sm shadow-xl flex items-center gap-2 transition-colors hover:brightness-110"
                style={{ backgroundColor: '#25D366', color: '#fff', fontFamily: 'Montserrat, sans-serif' }}
              >
                <WhatsAppIcon className="w-5 h-5" />
                <span className="font-medium text-sm uppercase tracking-[0.05em]">Comprar no WhatsApp</span>
              </a>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Mobile: centered content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`mobile-${current}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pt-[80px] md:hidden z-[4]"
        >
          <span
            className="inline-block text-[11px] font-medium tracking-[0.3em] uppercase px-4 py-2 rounded-md mb-4"
            style={{
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#FAF3E8',
              fontFamily: 'Montserrat, sans-serif',
            }}
          >
            {slide.label}
          </span>

          <h1
            className="text-4xl font-bold leading-none mb-6 tracking-tight whitespace-pre-line"
            style={{
              color: '#FAF3E8',
              textShadow: '0 4px 14px rgba(20,10,5,0.7), 0 1px 3px rgba(0,0,0,0.5)',
              fontFamily: '"Playfair Display", Didot, "Bodoni MT", Georgia, serif',
            }}
          >
            {slide.title}
          </h1>

          <div className="flex flex-col gap-3 items-center">
            <Button asChild className="bg-primary hover:bg-primary/90 min-h-[44px] px-8 rounded-sm shadow-lg border-0">
              <Link to={slide.link}>
                <span className="font-medium text-xs uppercase tracking-[0.1em]" style={{ color: '#FAF3E8', fontFamily: 'Montserrat, sans-serif' }}>{slide.cta}</span>
              </Link>
            </Button>
            <a
              href="https://wa.me/5591936180774?text=Ol%C3%A1!%20Vim%20pelo%20site%20e%20gostaria%20de%20comprar!"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] px-6 rounded-sm shadow-lg flex items-center gap-2"
              style={{ backgroundColor: '#25D366', color: '#fff', fontFamily: 'Montserrat, sans-serif' }}
            >
              <WhatsAppIcon className="w-4 h-4" />
              <span className="font-medium text-xs uppercase tracking-[0.05em]">Comprar no WhatsApp</span>
            </a>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Side arrows */}
      <button onClick={prev} className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-colors z-10">
        <ChevronLeft className="w-5 h-5 text-foreground" />
      </button>
      <button onClick={next} className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-lg hover:bg-white transition-colors z-10">
        <ChevronRight className="w-5 h-5 text-foreground" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2.5 z-10">
        {heroSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`rounded-full transition-all duration-300 ${i === current ? 'w-3 h-3 bg-white' : 'w-2 h-2 bg-white/50 hover:bg-white/70'}`}
          />
        ))}
      </div>
    </section>
  );
};



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
              telephone: "+55-91-93618-0774",
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
          sameAs: [
            "https://instagram.com/ellemakebelem",
            "https://wa.me/5591936180774",
          ],
          },
          {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "@id": "https://www.ellemake.com.br/#localbusiness",
            name: "Elle Make - Maquiagem e Cosméticos em Belém",
            image: `${window.location.origin}/pwa-512x512.png`,
            url: "https://www.ellemake.com.br",
            telephone: "+5591936180774",
            address: {
              "@type": "PostalAddress",
              addressLocality: "Belém",
              addressRegion: "PA",
              postalCode: "66000-000",
              addressCountry: "BR",
            },
            geo: {
              "@type": "GeoCoordinates",
              latitude: -1.4557,
              longitude: -48.5024,
            },
            areaServed: {
              "@type": "GeoCircle",
              geoMidpoint: { "@type": "GeoCoordinates", latitude: -1.4557, longitude: -48.5024 },
              geoRadius: "50000",
            },
            priceRange: "$$",
            openingHoursSpecification: {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
              opens: "08:00",
              closes: "20:00",
            },
            sameAs: ["https://instagram.com/ellemakebelem"],
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

      {/* Hero Carousel — extends behind header */}
      <HeroCarousel />

      {/* Categories — right after hero */}
      {categories && categories.length > 0 && (
        <section className="px-4 py-8 max-w-7xl mx-auto">
          <h2 className="text-lg font-bold text-foreground mb-4">Categorias</h2>
          <div className="flex gap-5 overflow-x-auto scrollbar-hide pb-2 px-2 md:justify-center">
            {categories.map((cat) => {
               const categoryImage = `/categories/${cat.slug}.png`;
              return (
                <div key={cat.id} className="flex-shrink-0">
                  <Link
                    to={`/explorar?cat=${cat.slug}`}
                    className="flex flex-col items-center gap-2 w-24 md:w-28 text-center group"
                  >
                    <div className="w-[72px] h-[72px] md:w-[88px] md:h-[88px] rounded-full bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md overflow-visible">
                      <img
                        src={categoryImage}
                        alt={cat.name}
                        width={96}
                        height={96}
                        className="w-[80px] h-[80px] md:w-[96px] md:h-[96px] object-contain drop-shadow-lg -mt-2"
                        loading="lazy"
                      />
                    </div>
                    <p className="text-[10px] md:text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors leading-tight">{cat.name}</p>
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Benefits bar — trust strip */}
      <section className="bg-background py-6 px-4 border-b border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-border rounded-xl overflow-hidden">
            {benefits.map((b, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-5 py-4 ${i < benefits.length - 1 ? 'border-b md:border-b-0 md:border-r border-border' : ''} ${i === 1 ? 'border-r-0 md:border-r border-border' : ''}`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-foreground leading-tight">{b.text}</p>
                  <p className="text-xs text-muted-foreground">{b.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured / Novidades */}
      <section className="px-4 py-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">✨ Novidades</h2>
            <p className="text-xs text-muted-foreground">Acabou de chegar na loja</p>
          </div>
          <Link to="/explorar" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">Ver tudo <ArrowRight className="w-3 h-3" /></Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-lg bg-muted overflow-hidden">
                <div className="w-full h-full bg-gradient-to-r from-muted via-muted-foreground/5 to-muted animate-shimmer bg-[length:200%_100%]" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {featured.map((product, i) => (
              <motion.div key={product.id} variants={item}>
                <ProductCard product={product} index={i} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* Free shipping bar */}
      <section className="px-4 py-3 max-w-7xl mx-auto">
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
      <section className="px-4 py-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-primary">🔥 Super Ofertas</h2>
            <p className="text-xs text-muted-foreground">Economize até 50% em produtos selecionados</p>
          </div>
          <Link to="/explorar" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">Ver tudo <ArrowRight className="w-3 h-3" /></Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-lg bg-muted animate-shimmer" />
            ))}
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {offers.map((product, i) => (
              <motion.div key={product.id} variants={item}>
                <ProductCard product={product} index={i} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* Mais Produtos */}
      <section className="px-4 py-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">🛍️ Mais Produtos</h2>
            <p className="text-xs text-muted-foreground">Explore todo nosso catálogo</p>
          </div>
          <Link to="/explorar" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">Ver catálogo <ArrowRight className="w-3 h-3" /></Link>
        </div>
        {!isLoading && (
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 gap-3">
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
      <section className="px-4 py-8 max-w-7xl mx-auto">
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
      <section className="px-4 py-8 max-w-3xl mx-auto">
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

      {/* Footer */}
      <Footer />

      {/* Newsletter Popup */}
      <Suspense fallback={null}>
        <NewsletterPopup />
      </Suspense>
    </div>
  );
};

export default Index;
