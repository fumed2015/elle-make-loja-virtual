import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X, ArrowUpDown, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProducts, useCategories } from "@/hooks/useProducts";
import ProductCard from "@/components/product/ProductCard";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import SEOHead from "@/components/SEOHead";

type SortOption = "recent" | "price-asc" | "price-desc" | "name" | "discount";

const sortLabels: Record<SortOption, string> = {
  recent: "Mais recentes",
  "price-asc": "Menor preço",
  "price-desc": "Maior preço",
  name: "A-Z",
  discount: "Maior desconto",
};

const priceRanges = [
  { label: "Até R$20", min: 0, max: 20 },
  { label: "R$20-50", min: 20, max: 50 },
  { label: "R$50-100", min: 50, max: 100 },
  { label: "R$100+", min: 100, max: 99999 },
];

const Explorar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const activeCat = searchParams.get("cat") || "";
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [activeBrand, setActiveBrand] = useState("");
  const [activePriceRange, setActivePriceRange] = useState<number | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: products, isLoading } = useProducts({
    search: searchQuery || undefined,
    categorySlug: activeCat || undefined,
  });
  const { data: categories } = useCategories();

  // Extract unique brands
  const brands = useMemo(() => {
    if (!products) return [];
    const brandSet = new Set(products.map((p) => p.brand).filter(Boolean));
    return Array.from(brandSet).sort() as string[];
  }, [products]);

  // Autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2 || !products) return [];
    const q = searchQuery.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [searchQuery, products]);

  // Filter and sort
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let result = [...products];

    if (activeBrand) {
      result = result.filter((p) => p.brand === activeBrand);
    }
    if (activePriceRange !== null) {
      const range = priceRanges[activePriceRange];
      result = result.filter((p) => Number(p.price) >= range.min && Number(p.price) < range.max);
    }

    switch (sortBy) {
      case "price-asc":
        result.sort((a, b) => Number(a.price) - Number(b.price));
        break;
      case "price-desc":
        result.sort((a, b) => Number(b.price) - Number(a.price));
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "discount":
        result.sort((a, b) => {
          const discA = a.compare_at_price ? (Number(a.compare_at_price) - Number(a.price)) / Number(a.compare_at_price) : 0;
          const discB = b.compare_at_price ? (Number(b.compare_at_price) - Number(b.price)) / Number(b.compare_at_price) : 0;
          return discB - discA;
        });
        break;
    }
    return result;
  }, [products, activeBrand, activePriceRange, sortBy]);

  const activeFiltersCount = [activeBrand, activePriceRange !== null, activeCat].filter(Boolean).length;

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setShowSuggestions(value.length >= 2);
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

  const clearFilters = () => {
    setActiveBrand("");
    setActivePriceRange(null);
    setSortBy("recent");
    handleCatFilter("");
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      <SEOHead title="Explorar Produtos" description="Explore nossa coleção de maquiagens e skincare. Filtros por categoria, marca e preço com busca inteligente." />
      <h1 className="text-2xl font-display font-bold mb-4">Explorar</h1>

      {/* Search with autocomplete */}
      <div className="relative mb-3" ref={searchRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
        <Input
          placeholder="Buscar por produto, marca ou ingrediente..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
          className="pl-10 pr-10 bg-muted border-none min-h-[44px]"
        />
        {searchQuery && (
          <button onClick={() => handleSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Autocomplete dropdown */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full left-0 right-0 bg-card border border-border rounded-lg mt-1 shadow-lg z-50 overflow-hidden"
            >
              {suggestions.map((s) => (
                <button
                  key={s.slug}
                  onClick={() => {
                    setShowSuggestions(false);
                    window.location.href = `/produto/${s.slug}`;
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center gap-2.5"
                >
                  <div className="w-8 h-8 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {s.images?.[0] && <img src={s.images[0]} alt="" className="w-full h-full object-cover" loading="lazy" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{s.name}</p>
                    <p className="text-[10px] text-primary font-bold">R$ {Number(s.price).toFixed(2).replace(".", ",")}</p>
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Filter & Sort bar */}
      <div className="flex items-center gap-2 mb-3">
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="text-xs gap-1.5 h-8 relative"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtros
          {activeFiltersCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </Button>

        <div className="relative ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="text-xs gap-1.5 h-8"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortLabels[sortBy]}
            <ChevronDown className="w-3 h-3" />
          </Button>
          <AnimatePresence>
            {showSortMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[160px] overflow-hidden"
              >
                {(Object.entries(sortLabels) as [SortOption, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { setSortBy(key); setShowSortMenu(false); }}
                    className={cn("w-full text-left px-3 py-2 text-xs transition-colors", sortBy === key ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted")}
                  >
                    {label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Badge variant="secondary" className="text-[10px] h-6">
          {filteredProducts.length} {filteredProducts.length === 1 ? "produto" : "produtos"}
        </Badge>
      </div>

      {/* Expandable filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="bg-card rounded-xl p-4 border border-border space-y-3">
              {/* Brand filter */}
              {brands.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Marca</p>
                  <div className="flex flex-wrap gap-1.5">
                    {brands.map((brand) => (
                      <button
                        key={brand}
                        onClick={() => setActiveBrand(activeBrand === brand ? "" : brand)}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors",
                          activeBrand === brand ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                        )}
                      >
                        {brand}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price filter */}
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Faixa de preço</p>
                <div className="flex flex-wrap gap-1.5">
                  {priceRanges.map((range, i) => (
                    <button
                      key={i}
                      onClick={() => setActivePriceRange(activePriceRange === i ? null : i)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors",
                        activePriceRange === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-destructive h-7 gap-1">
                  <X className="w-3 h-3" /> Limpar filtros
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-4">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => handleCatFilter("")}
          className={cn(
            "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px]",
            !activeCat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          Todos
        </motion.button>
        {categories?.map((cat) => (
          <motion.button
            key={cat.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleCatFilter(cat.slug)}
            className={cn(
              "flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px]",
              activeCat === cat.slug ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {cat.name}
          </motion.button>
        ))}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground space-y-2">
          <Search className="w-8 h-8 mx-auto text-muted-foreground/50" />
          <p className="text-sm">Nenhum produto encontrado</p>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
              Limpar filtros
            </Button>
          )}
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-2 gap-3">
          {filteredProducts.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default Explorar;
