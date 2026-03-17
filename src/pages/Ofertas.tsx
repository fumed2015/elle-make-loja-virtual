import { useMemo, useState, useEffect } from "react";
import { useCollectionProducts } from "@/hooks/useCollections";
import { useAllProductsUnified } from "@/hooks/useProducts";
import ProductCard from "@/components/product/ProductCard";
import ProductPagination from "@/components/ui/ProductPagination";
import { Tag, Flame } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/layout/Footer";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";

const PRODUCTS_PER_PAGE = 24;

const Ofertas = () => {
  const [currentPage, setCurrentPage] = useState(1);
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
  const totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = useMemo(
    () => products.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE),
    [products, currentPage]
  );

  // Reset page when products change
  useEffect(() => { setCurrentPage(1); }, [products.length]);

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
          breadcrumbJsonLd([{ label: "Ofertas", href: "/ofertas" }]),
        ]}
      />

      <div className="min-h-screen">
        <Breadcrumbs items={[{ label: "Ofertas" }]} />
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
