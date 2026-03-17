import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronRight, ArrowUpDown, ChevronDown, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProducts, useCategories } from "@/hooks/useProducts";
import ProductCard from "@/components/product/ProductCard";
import ProductPagination from "@/components/ui/ProductPagination";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/layout/Footer";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { fbTrackViewCategory } from "@/hooks/useMetaPixel";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";

const categoryMeta: Record<string, { title: string; description: string; emoji: string }> = {
  rosto: { title: "Rosto", description: "Bases, corretivos, pós, blushes e contornos para um rosto perfeito.", emoji: "✨" },
  olhos: { title: "Olhos", description: "Sombras, paletas, delineadores e máscaras para um olhar marcante.", emoji: "👁️" },
  labios: { title: "Lábios", description: "Batons, glosses e lip tints para lábios irresistíveis.", emoji: "💋" },
  skincare: { title: "Skincare", description: "Hidratantes, protetores solares e séruns para cuidar da sua pele.", emoji: "🧴" },
  acessorios: { title: "Acessórios", description: "Pincéis, esponjas e acessórios essenciais para sua make.", emoji: "💎" },
  ofertas: { title: "Ofertas", description: "Os melhores descontos em maquiagem e cosméticos.", emoji: "🔥" },
  "kits-bundles": { title: "Kits & Bundles", description: "Kits completos e combos com preço especial.", emoji: "📦" },
  sobrancelhas: { title: "Sobrancelhas", description: "Pomadas, géis e lápis para sobrancelhas perfeitas.", emoji: "🖌️" },
};

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

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const Categoria = () => {
  const { slug } = useParams<{ slug: string }>();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [activeBrand, setActiveBrand] = useState("");
  const [activePriceRange, setActivePriceRange] = useState<number | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const meta = categoryMeta[slug || ""] || { title: slug || "Categoria", description: "", emoji: "✨" };
  const isOfertas = slug === "ofertas";

  useEffect(() => {
    if (slug) fbTrackViewCategory({ name: meta.title, slug });
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: products, isLoading } = useProducts({
    categorySlug: isOfertas ? undefined : slug,
    search: search || undefined,
  });
  const { data: categories } = useCategories();

  const brands = useMemo(() => {
    if (!products) return [];
    const brandSet = new Set(products.map((p) => p.brand).filter(Boolean));
    return Array.from(brandSet).sort() as string[];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = isOfertas
      ? products?.filter((p) => p.compare_at_price && p.compare_at_price > p.price) || []
      : products || [];

    if (search) result = result.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    if (activeBrand) result = result.filter((p) => p.brand === activeBrand);
    if (activePriceRange !== null) {
      const range = priceRanges[activePriceRange];
      result = result.filter((p) => Number(p.price) >= range.min && Number(p.price) < range.max);
    }

    switch (sortBy) {
      case "price-asc": result.sort((a, b) => Number(a.price) - Number(b.price)); break;
      case "price-desc": result.sort((a, b) => Number(b.price) - Number(a.price)); break;
      case "name": result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "discount": result.sort((a, b) => {
        const dA = a.compare_at_price ? (Number(a.compare_at_price) - Number(a.price)) / Number(a.compare_at_price) : 0;
        const dB = b.compare_at_price ? (Number(b.compare_at_price) - Number(b.price)) / Number(b.compare_at_price) : 0;
        return dB - dA;
      }); break;
    }
    return result;
  }, [products, search, activeBrand, activePriceRange, sortBy, isOfertas]);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [activeBrand, activePriceRange, sortBy, search, slug]);

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = useMemo(
    () => filteredProducts.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE),
    [filteredProducts, currentPage]
  );

  const activeFiltersCount = [activeBrand, activePriceRange !== null].filter(Boolean).length;
  const otherCategories = categories?.filter(c => c.slug !== slug) || [];

  const clearFilters = () => { setActiveBrand(""); setActivePriceRange(null); setSortBy("recent"); };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title={meta.title}
        description={meta.description}
        jsonLd={breadcrumbJsonLd([
          { label: "Explorar", href: "/explorar" },
          { label: meta.title, href: `/categoria/${slug}` },
        ])}
      />

      <Breadcrumbs items={[
        { label: "Explorar", href: "/explorar" },
        { label: meta.title },
      ]} />

      {/* Category header */}
      <div className="bg-background border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="flex items-start gap-3 mb-2">
              <span className="text-3xl">{meta.emoji}</span>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{meta.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">{meta.description}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {filteredProducts.length} {filteredProducts.length === 1 ? "produto encontrado" : "produtos encontrados"}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex-1">
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <div className="sticky top-28 space-y-6">
              {/* Search within category */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={`Buscar em ${meta.title}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-card border-border min-h-[40px] rounded-lg text-sm"
                />
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
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-destructive w-full justify-center gap-1">
                  <X className="w-3 h-3" /> Limpar filtros
                </Button>
              )}

              {/* Other categories */}
              {otherCategories.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3">Outras categorias</h3>
                  <div className="space-y-1">
                    {otherCategories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/categoria/${cat.slug}`}
                        className="block px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        {categoryMeta[cat.slug]?.emoji || "✨"} {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Products area */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center gap-2 mb-5">
              {/* Mobile search */}
              <div className="relative flex-1 lg:hidden">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={`Buscar em ${meta.title}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-card border-border min-h-[40px] rounded-lg text-sm"
                />
              </div>

              {/* Mobile filter button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="lg:hidden text-xs gap-1.5 h-9 relative flex-shrink-0"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] flex items-center justify-center font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>

              {/* Sort */}
              <div className="relative ml-auto lg:ml-0">
                <Button variant="outline" size="sm" onClick={() => setShowSortMenu(!showSortMenu)} className="text-xs gap-1.5 h-9">
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

            {/* Active filter chips */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
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

            {/* Mobile filter panel */}
            <AnimatePresence>
              {showMobileFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-5 lg:hidden"
                >
                  <div className="bg-card rounded-xl p-5 border border-border space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-foreground">Filtros</h3>
                      <button onClick={() => setShowMobileFilters(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
                    </div>
                    {/* Price */}
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Faixa de preço</p>
                      <div className="flex flex-wrap gap-1.5">
                        {priceRanges.map((range, i) => (
                          <button key={i} onClick={() => setActivePriceRange(activePriceRange === i ? null : i)}
                            className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors", activePriceRange === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                          >{range.label}</button>
                        ))}
                      </div>
                    </div>
                    {/* Brand */}
                    {brands.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Marca</p>
                        <div className="flex flex-wrap gap-1.5">
                          {brands.map((brand) => (
                            <button key={brand} onClick={() => setActiveBrand(activeBrand === brand ? "" : brand)}
                              className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors", activeBrand === brand ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}
                            >{brand}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Product grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
                <p className="text-sm text-muted-foreground mb-4">Tente buscar com outro termo</p>
                {search && (
                  <Button variant="outline" size="sm" onClick={() => setSearch("")} className="text-xs">Limpar busca</Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {paginatedProducts.map((product, i) => (
                    <ProductCard key={product.id} product={product} index={i} />
                  ))}
                </div>
                <ProductPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Categoria;
