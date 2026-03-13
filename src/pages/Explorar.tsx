import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, SlidersHorizontal, X, ArrowUpDown, ChevronDown, ChevronRight, LayoutGrid, List, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { useCollectionProducts, useBestSellingProducts, type CollectionSlug } from "@/hooks/useCollections";
import ProductCard from "@/components/product/ProductCard";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/layout/Footer";

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
  { label: "R$20 – R$50", min: 20, max: 50 },
  { label: "R$50 – R$100", min: 50, max: 100 },
  { label: "Acima de R$100", min: 100, max: 99999 },
];

const categoryIcons: Record<string, string> = {
  labios: "💋",
  rosto: "✨",
  olhos: "👁️",
  skincare: "🧴",
  acessorios: "💎",
  ofertas: "🔥",
  "kits-bundles": "📦",
  sobrancelhas: "🖌️",
  paletas: "🎨",
};

// Map URL query params to collection slugs
const COLLECTION_MAP: Record<string, CollectionSlug> = {
  lancamento: "lancamentos",
  vendido: "mais-vendidos",
  tendencia: "tendencias",
};

const COLLECTION_TITLES: Record<CollectionSlug, string> = {
  lancamentos: "Lançamentos",
  "mais-vendidos": "Mais Vendidos",
  tendencias: "Tendências",
};

const Explorar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const activeCat = searchParams.get("cat") || "";
  const urlQ = searchParams.get("q") || "";
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [activeBrand, setActiveBrand] = useState("");
  const [activePriceRange, setActivePriceRange] = useState<number | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [gridCols, setGridCols] = useState<2 | 3>(2);
  const searchRef = useRef<HTMLDivElement>(null);

  // Detect if this is a curated collection page
  const collectionSlug = activeCat === "novidades" && COLLECTION_MAP[urlQ] ? COLLECTION_MAP[urlQ] : null;
  const isCollectionPage = !!collectionSlug;

  // Regular products (for non-collection pages)
  const { data: products, isLoading } = useProducts({
    search: !isCollectionPage ? (searchQuery || undefined) : undefined,
    categorySlug: !isCollectionPage ? (activeCat || undefined) : undefined,
  });

  // Collection products
  const { data: collectionProducts, isLoading: collectionLoading } = useCollectionProducts(
    collectionSlug || "lancamentos"
  );
  const { data: salesCount } = useBestSellingProducts();

  const { data: categories } = useCategories();

  const brands = useMemo(() => {
    const source = isCollectionPage ? collectionProducts : products;
    if (!source) return [];
    const brandSet = new Set(source.map((p: any) => p.brand).filter(Boolean));
    return Array.from(brandSet).sort() as string[];
  }, [products, collectionProducts, isCollectionPage]);

  const suggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2 || !products) return [];
    const q = searchQuery.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5);
  }, [searchQuery, products]);

  const filteredProducts = useMemo(() => {
    let source: any[] = [];
    
    if (isCollectionPage) {
      source = collectionProducts ? [...collectionProducts] : [];
      // For "mais-vendidos", sort by sales count (best selling first)
      if (collectionSlug === "mais-vendidos" && salesCount) {
        source.sort((a: any, b: any) => {
          const salesA = salesCount[a.id] || 0;
          const salesB = salesCount[b.id] || 0;
          return salesB - salesA;
        });
      }
    } else {
      source = products ? [...products] : [];
    }

    if (activeBrand) source = source.filter((p: any) => p.brand === activeBrand);
    if (activePriceRange !== null) {
      const range = priceRanges[activePriceRange];
      source = source.filter((p: any) => Number(p.price) >= range.min && Number(p.price) < range.max);
    }
    if (!isCollectionPage || collectionSlug !== "mais-vendidos") {
      switch (sortBy) {
        case "price-asc": source.sort((a, b) => Number(a.price) - Number(b.price)); break;
        case "price-desc": source.sort((a, b) => Number(b.price) - Number(a.price)); break;
        case "name": source.sort((a, b) => a.name.localeCompare(b.name)); break;
        case "discount": source.sort((a, b) => {
          const dA = a.compare_at_price ? (Number(a.compare_at_price) - Number(a.price)) / Number(a.compare_at_price) : 0;
          const dB = b.compare_at_price ? (Number(b.compare_at_price) - Number(b.price)) / Number(b.compare_at_price) : 0;
          return dB - dA;
        }); break;
      }
    }
    return source;
  }, [products, collectionProducts, isCollectionPage, collectionSlug, salesCount, activeBrand, activePriceRange, sortBy]);

  const activeFiltersCount = [activeBrand, activePriceRange !== null, activeCat].filter(Boolean).length;

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setShowSuggestions(value.length >= 2);
    const params = new URLSearchParams(searchParams);
    if (value) params.set("q", value); else params.delete("q");
    setSearchParams(params, { replace: true });
  };

  const handleCatFilter = (slug: string) => {
    const params = new URLSearchParams(searchParams);
    if (slug === activeCat) params.delete("cat"); else params.set("cat", slug);
    setSearchParams(params, { replace: true });
  };

  const clearFilters = () => {
    setActiveBrand("");
    setActivePriceRange(null);
    setSortBy("recent");
    handleCatFilter("");
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeCategoryName = isCollectionPage && collectionSlug
    ? COLLECTION_TITLES[collectionSlug]
    : categories?.find(c => c.slug === activeCat)?.name;

  // Sidebar filter section (reused desktop + mobile drawer)
  const FilterPanel = ({ className }: { className?: string }) => (
    <div className={cn("space-y-6", className)}>
      {/* Categories */}
      <div>
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Categorias</h3>
        <div className="space-y-0.5">
          <button
            onClick={() => handleCatFilter("")}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between",
              !activeCat ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span>Todos os produtos</span>
            {!activeCat && <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCatFilter(cat.slug)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between gap-2",
                activeCat === cat.slug ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-2">
                <span className="text-xs">{categoryIcons[cat.slug] || "✨"}</span>
                {cat.name}
              </span>
              {activeCat === cat.slug && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Faixa de preço</h3>
        <div className="space-y-1">
          {priceRanges.map((range, i) => (
            <button
              key={i}
              onClick={() => setActivePriceRange(activePriceRange === i ? null : i)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                activePriceRange === i ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Brands */}
      {brands.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Marca</h3>
          <div className="space-y-1">
            {brands.map((brand) => (
              <button
                key={brand}
                onClick={() => setActiveBrand(activeBrand === brand ? "" : brand)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                  activeBrand === brand ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeFiltersCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-destructive w-full justify-center gap-1 h-8">
          <X className="w-3 h-3" /> Limpar todos os filtros
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead title="Explorar Produtos" description="Explore nossa coleção de maquiagens e skincare. Filtros por categoria, marca e preço com busca inteligente." />

      {/* Breadcrumb */}
      <div className="bg-muted/50 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-colors">Início</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">
              {activeCategoryName ? activeCategoryName : "Explorar"}
            </span>
          </nav>
        </div>
      </div>

      {/* Header area */}
      <div className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {activeCategoryName || "Explorar Produtos"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredProducts.length} {filteredProducts.length === 1 ? "produto encontrado" : "produtos encontrados"}
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full md:max-w-sm" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
              <Input
                placeholder="Buscar produto, marca..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                className="pl-10 pr-10 bg-card border-border min-h-[44px] rounded-lg"
              />
              {searchQuery && (
                <button onClick={() => handleSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full left-0 right-0 bg-card border border-border rounded-lg mt-1 shadow-xl z-50 overflow-hidden"
                  >
                    {suggestions.map((s) => (
                      <Link
                        key={s.slug}
                        to={`/produto/${s.slug}`}
                        onClick={() => setShowSuggestions(false)}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {s.images?.[0] && <img src={s.images[0]} alt="" className="w-full h-full object-contain" loading="lazy" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate text-foreground">{s.name}</p>
                          <p className="text-xs text-primary font-bold">R$ {Number(s.price).toFixed(2).replace(".", ",")}</p>
                        </div>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex-1">
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-28">
              <FilterPanel />
            </div>
          </aside>

          {/* Products area */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-5">
              {/* Mobile filter trigger */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="lg:hidden text-xs gap-1.5 h-9 relative"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filtros
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>

              {/* Mobile category pills */}
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide lg:hidden flex-1">
                {categories?.slice(0, 6).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCatFilter(cat.slug)}
                    className={cn(
                      "flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all whitespace-nowrap",
                      activeCat === cat.slug ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Sort & view options */}
              <div className="flex items-center gap-2 ml-auto">
                {/* View toggle (desktop only) */}
                <div className="hidden md:flex items-center border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setGridCols(2)}
                    className={cn("p-1.5 transition-colors", gridCols === 2 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setGridCols(3)}
                    className={cn("p-1.5 transition-colors", gridCols === 3 ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Sort dropdown */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="text-xs gap-1.5 h-9"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{sortLabels[sortBy]}</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                  <AnimatePresence>
                    {showSortMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl z-50 min-w-[170px] overflow-hidden"
                      >
                        {(Object.entries(sortLabels) as [SortOption, string][]).map(([key, label]) => (
                          <button
                            key={key}
                            onClick={() => { setSortBy(key); setShowSortMenu(false); }}
                            className={cn("w-full text-left px-4 py-2.5 text-sm transition-colors", sortBy === key ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-foreground")}
                          >
                            {label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Active filter chips */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {activeCat && activeCategoryName && (
                  <Badge variant="secondary" className="gap-1 text-xs py-1 px-2.5 bg-primary/10 text-primary border-0">
                    {activeCategoryName}
                    <button onClick={() => handleCatFilter("")}><X className="w-3 h-3" /></button>
                  </Badge>
                )}
                {activeBrand && (
                  <Badge variant="secondary" className="gap-1 text-xs py-1 px-2.5 bg-primary/10 text-primary border-0">
                    {activeBrand}
                    <button onClick={() => setActiveBrand("")}><X className="w-3 h-3" /></button>
                  </Badge>
                )}
                {activePriceRange !== null && (
                  <Badge variant="secondary" className="gap-1 text-xs py-1 px-2.5 bg-primary/10 text-primary border-0">
                    {priceRanges[activePriceRange].label}
                    <button onClick={() => setActivePriceRange(null)}><X className="w-3 h-3" /></button>
                  </Badge>
                )}
                <button onClick={clearFilters} className="text-xs text-destructive hover:underline">Limpar tudo</button>
              </div>
            )}

            {/* Mobile filter drawer */}
            <AnimatePresence>
              {showMobileFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-5 lg:hidden"
                >
                  <div className="bg-card rounded-xl p-5 border border-border">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-foreground">Filtros</h3>
                      <button onClick={() => setShowMobileFilters(false)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
                    </div>
                    <FilterPanel />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Product grid */}
            {isLoading ? (
              <div className={cn("grid gap-3", gridCols === 3 ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-2 md:grid-cols-3")}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Search className="w-7 h-7 text-muted-foreground/50" />
                </div>
                <p className="text-foreground font-semibold mb-1">Nenhum produto encontrado</p>
                <p className="text-sm text-muted-foreground mb-4">Tente ajustar os filtros ou a busca</p>
                {activeFiltersCount > 0 && (
                  <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs gap-1">
                    <X className="w-3 h-3" /> Limpar filtros
                  </Button>
                )}
              </div>
            ) : (
              <motion.div
                layout
                className={cn("grid gap-3", gridCols === 3 ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-2 md:grid-cols-3")}
              >
                {filteredProducts.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} />
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Explorar;
