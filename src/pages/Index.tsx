import { motion } from "framer-motion";
import { ArrowRight, Sparkles, TrendingUp, MessageCircle, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { useProducts, useCategories } from "@/hooks/useProducts";
import ProductCard from "@/components/product/ProductCard";
import UGCSection from "@/components/social/UGCSection";
import { ThemeToggle } from "@/hooks/useTheme";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const Index = () => {
  const { data: featured, isLoading } = useProducts({ featured: true });
  const { data: categories } = useCategories();
  const [showPushBanner, setShowPushBanner] = useState(false);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      const dismissed = localStorage.getItem("push-dismissed");
      if (!dismissed) {
        const timer = setTimeout(() => setShowPushBanner(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handlePushRequest = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        toast.success("Notificações ativadas! 🔔");
        new Notification("Beleza Phygital", {
          body: "Você receberá novidades e promoções exclusivas! ✨",
          icon: "/pwa-192x192.png",
        });
      }
    } catch {
      toast.error("Não foi possível ativar notificações");
    }
    setShowPushBanner(false);
  };

  const dismissPush = () => {
    setShowPushBanner(false);
    localStorage.setItem("push-dismissed", "true");
  };

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Maquiagem com Ativos Amazônicos"
        description="Descubra maquiagens e skincare com ativos amazônicos. Ciência e natureza para uma pele radiante em Belém do Pará."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Beleza Phygital Belém",
          url: window.location.origin,
          potentialAction: { "@type": "SearchAction", target: `${window.location.origin}/explorar?q={search_term_string}`, "query-input": "required name=search_term_string" },
        }}
      />
      {/* Push Notification Banner */}
      {showPushBanner && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-0 left-0 right-0 z-50 px-4 pt-3 pb-2"
        >
          <div className="max-w-lg mx-auto bg-gradient-gold rounded-xl p-3 flex items-center gap-3 shadow-gold">
            <Bell className="w-5 h-5 text-primary-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-primary-foreground">Ative as notificações!</p>
              <p className="text-[10px] text-primary-foreground/80">Receba promos exclusivas e rastreie pedidos</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <Button size="sm" onClick={handlePushRequest} className="text-[10px] bg-primary-foreground text-primary hover:bg-primary-foreground/90 h-7 px-2.5">Ativar</Button>
              <Button size="sm" variant="ghost" onClick={dismissPush} className="text-[10px] text-primary-foreground/60 hover:text-primary-foreground h-7 px-2">Depois</Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-12 pb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        {/* Floating ambient shapes */}
        <div className="absolute top-10 right-4 w-32 h-32 rounded-full bg-primary/5 blur-3xl animate-float" />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-secondary/5 blur-3xl animate-float" style={{ animationDelay: "1.5s" }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative max-w-lg mx-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium tracking-widest uppercase text-primary">
                Neuro Glow Collection
              </span>
            </div>
            <ThemeToggle />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold leading-tight mb-3">
            Beleza que{" "}
            <span className="text-gradient-gold">transforma</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm">
            Descubra maquiagens com ativos amazônicos. Ciência e natureza para uma pele radiante.
          </p>
          <div className="flex gap-3">
            <Button asChild className="bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90 min-h-[44px] px-6 animate-glow-pulse">
              <Link to="/explorar">
                Explorar <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="min-h-[44px] border-border hover:border-primary/50 transition-colors">
              <Link to="/consultora">
                <MessageCircle className="w-4 h-4 mr-1" /> Consultora IA
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Categories */}
      <section className="px-4 py-6 max-w-lg mx-auto">
        <motion.h2
          initial={{ opacity: 0, x: -10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="text-lg font-display font-semibold mb-4"
        >
          Categorias
        </motion.h2>
        <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories?.map((cat) => (
            <motion.div key={cat.id} variants={item}>
              <Link
                to={`/explorar?cat=${cat.slug}`}
                className="flex-shrink-0 px-4 py-2.5 rounded-full bg-muted text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300 min-h-[44px] flex items-center hover:shadow-gold hover:scale-105"
              >
                {cat.name}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Coupon Banner */}
      <section className="px-4 py-2 max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-teal rounded-xl px-4 py-3 flex items-center justify-between shadow-teal cursor-pointer"
        >
          <div>
            <p className="text-xs font-bold text-secondary-foreground">Use BELEM10 e ganhe 10% off! 🎉</p>
            <p className="text-[10px] text-secondary-foreground/80">Na primeira compra • Mín. R$ 50</p>
          </div>
          <Button asChild size="sm" variant="secondary" className="text-xs bg-background/20 text-secondary-foreground hover:bg-background/30 border-0">
            <Link to="/explorar">Comprar</Link>
          </Button>
        </motion.div>
      </section>

      {/* Featured */}
      <section className="px-4 py-6 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4 text-secondary" />
            <h2 className="text-lg font-display font-semibold">Em Alta</h2>
          </motion.div>
          <Link to="/explorar" className="text-xs text-primary font-medium hover:underline">Ver tudo →</Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-muted overflow-hidden">
                <div className="w-full h-full bg-gradient-to-r from-muted via-muted-foreground/5 to-muted animate-shimmer bg-[length:200%_100%]" />
              </div>
            ))}
          </div>
        ) : (
          <motion.div variants={container} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 gap-3">
            {featured?.slice(0, 4).map((product, i) => (
              <motion.div key={product.id} variants={item}>
                <ProductCard product={product} index={i} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>

      {/* UGC Section */}
      <UGCSection />
    </div>
  );
};

export default Index;
