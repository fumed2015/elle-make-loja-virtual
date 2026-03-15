import { useMemo } from "react";
import { useCollectionProducts } from "@/hooks/useCollections";
import { useAllProductsUnified } from "@/hooks/useProducts";
import ProductCard from "@/components/product/ProductCard";
import { motion } from "framer-motion";
import { Tag, Flame } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/layout/Footer";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const Ofertas = () => {
  const { data: curatedProducts, isLoading: loadingCurated } = useCollectionProducts("ofertas");
  const { data: allProducts, isLoading: loadingAll } = useAllProductsUnified();

  // Merge curated + all products with discount, deduplicated
  const products = useMemo(() => {
    const curated = curatedProducts || [];
    const curatedIds = new Set(curated.map((p: any) => p.id));

    // Products with active discount not already curated
    const discounted = (allProducts || []).filter(
      (p) => !curatedIds.has(p.id) && p.compare_at_price && p.compare_at_price > p.price
    );

    return [...curated, ...discounted];
  }, [curatedProducts, allProducts]);

  const isLoading = loadingCurated || loadingAll;

  return (
    <>
      <SEOHead
        title="Ofertas em Maquiagem e Cosméticos"
        description="Aproveite as melhores ofertas em maquiagem e cosméticos. Descontos imperdíveis em produtos das melhores marcas com entrega rápida em Belém."
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "Ofertas - Elle Make",
            description: "Melhores ofertas em maquiagem e cosméticos",
            url: "https://www.ellemake.com.br/ofertas",
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://www.ellemake.com.br" },
              { "@type": "ListItem", position: 2, name: "Ofertas", item: "https://www.ellemake.com.br/ofertas" },
            ],
          },
        ]}
      />

      <div className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-br from-destructive/10 via-primary/5 to-accent/10 px-4 py-10 md:py-14">
          <div className="max-w-7xl mx-auto text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Flame className="w-7 h-7 text-destructive" />
              <h1 className="text-2xl md:text-4xl font-black text-foreground tracking-tight">
                Ofertas Especiais
              </h1>
              <Flame className="w-7 h-7 text-destructive" />
            </div>
            <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
              Os melhores preços em maquiagem e cosméticos. Aproveite antes que acabe!
            </p>
          </div>
        </section>

        {/* Products Grid */}
        <section className="px-4 py-8 max-w-7xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="aspect-[3/5] bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <Tag className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-lg font-semibold text-foreground">Nenhuma oferta no momento</p>
              <p className="text-sm text-muted-foreground">Novas ofertas são adicionadas frequentemente. Volte em breve!</p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4"
            >
              {products.map((product: any, index: number) => (
                <motion.div key={product.id} variants={item}>
                  <ProductCard product={product} index={index} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>

        <Footer />
      </div>
    </>
  );
};

export default Ofertas;
