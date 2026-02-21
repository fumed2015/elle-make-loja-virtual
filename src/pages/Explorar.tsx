import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useProducts, useCategories } from "@/hooks/useProducts";
import ProductCard from "@/components/product/ProductCard";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import SEOHead from "@/components/SEOHead";

const Explorar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const activeCat = searchParams.get("cat") || "";

  const { data: products, isLoading } = useProducts({
    search: searchQuery || undefined,
    categorySlug: activeCat || undefined,
  });
  const { data: categories } = useCategories();

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    const params = new URLSearchParams(searchParams);
    if (value) params.set("q", value);
    else params.delete("q");
    setSearchParams(params, { replace: true });
  };

  const handleCatFilter = (slug: string) => {
    const params = new URLSearchParams(searchParams);
    if (slug === activeCat) params.delete("cat");
    else params.set("cat", slug);
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      <SEOHead title="Explorar Produtos" description="Explore nossa coleção de maquiagens e skincare com ativos amazônicos. Filtros por categoria e busca inteligente." />
      <h1 className="text-2xl font-display font-bold mb-4">Explorar</h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por produto, ingrediente ou problema..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 bg-muted border-none min-h-[44px]"
        />
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-4">
        <button
          onClick={() => handleCatFilter("")}
          className={cn(
            "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px]",
            !activeCat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          Todos
        </button>
        {categories?.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCatFilter(cat.slug)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px]",
              activeCat === cat.slug ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : products?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Nenhum produto encontrado</p>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-2 gap-3">
          {products?.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default Explorar;
