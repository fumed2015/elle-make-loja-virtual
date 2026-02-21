import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Star, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useProducts, useCategories } from "@/hooks/useProducts";
import ProductCard from "@/components/product/ProductCard";

const Index = () => {
  const { data: featured, isLoading } = useProducts({ featured: true });
  const { data: categories } = useCategories();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-12 pb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative max-w-lg mx-auto"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium tracking-widest uppercase text-primary">
              Neuro Glow Collection
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold leading-tight mb-3">
            Beleza que{" "}
            <span className="text-gradient-gold">transforma</span>
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm">
            Descubra maquiagens com ativos amazônicos. Ciência e natureza para uma pele radiante.
          </p>
          <div className="flex gap-3">
            <Button asChild className="bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90 min-h-[44px] px-6">
              <Link to="/explorar">
                Explorar <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
            <Button variant="outline" asChild className="min-h-[44px] border-border">
              <Link to="/explorar?cat=kits-bundles">
                Ver Kits
              </Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Categories */}
      <section className="px-4 py-6 max-w-lg mx-auto">
        <h2 className="text-lg font-display font-semibold mb-4">Categorias</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories?.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                to={`/explorar?cat=${cat.slug}`}
                className="flex-shrink-0 px-4 py-2.5 rounded-full bg-muted text-sm font-medium text-foreground hover:bg-primary hover:text-primary-foreground transition-colors min-h-[44px] flex items-center"
              >
                {cat.name}
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="px-4 py-6 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-secondary" />
            <h2 className="text-lg font-display font-semibold">Em Alta</h2>
          </div>
          <Link to="/explorar" className="text-xs text-primary font-medium">
            Ver tudo →
          </Link>
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {featured?.slice(0, 4).map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* UGC Section */}
      <section className="px-4 py-8 max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-display font-semibold">Quem usou e amou</h2>
        </div>
        <div className="bg-card rounded-2xl p-6 border border-border">
          <p className="text-sm text-muted-foreground italic">
            "A Base Neuro Glow é incrível! Minha pele nunca ficou tão bonita. O acabamento é natural e dura o dia todo."
          </p>
          <div className="flex items-center gap-2 mt-4">
            <div className="w-8 h-8 rounded-full bg-gradient-teal flex items-center justify-center text-xs font-bold text-secondary-foreground">
              MA
            </div>
            <div>
              <p className="text-xs font-medium">Maria Alencar</p>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-primary text-primary" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
