import { useState } from "react";
import OptimizedImage from "@/components/ui/optimized-image";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Heart, Minus, Plus, ShoppingBag, Truck, CreditCard, ShieldCheck, MessageCircle, MapPin, Package, Zap, Store, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useProduct } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import ReviewSection from "@/components/product/ReviewSection";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import SEOHead from "@/components/SEOHead";

const trustBadges = [
  { icon: ShieldCheck, text: "Entrega Segura", sub: "Embalagem protegida" },
  { icon: Sparkles, text: "100% Original", sub: "Registro ANVISA" },
  { icon: Heart, text: "Cruelty Free", sub: "Não testado em animais" },
  { icon: Truck, text: "Envio Rápido", sub: "Motoboy em Belém" },
];

const Produto = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProduct(slug || "");
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { toggleFavorite, isFavorited } = useFavorites();
  const [selectedSwatch, setSelectedSwatch] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [cep, setCep] = useState("");
  const [showShipping, setShowShipping] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Produto não encontrado
      </div>
    );
  }

  const swatches = typeof product.swatches === 'string' ? JSON.parse(product.swatches) : (product.swatches || []);

  // Auto-select first swatch if available
  if (swatches.length > 0 && !selectedSwatch) {
    setSelectedSwatch(swatches[0]);
  }
  const hasDiscount = product.compare_at_price && Number(product.compare_at_price) > Number(product.price);
  const tags = product.tags || [];
  const favorited = isFavorited(product.id);
  const discountPercent = hasDiscount ? Math.round(((Number(product.compare_at_price) - Number(product.price)) / Number(product.compare_at_price)) * 100) : 0;
  const pixPrice = (Number(product.price) * 0.95).toFixed(2).replace(".", ",");

  const handleAddToCart = () => {
    if (!user) { navigate("/perfil"); return; }
    addToCart.mutate({ productId: product.id, quantity: qty, swatch: selectedSwatch });
  };

  const handleToggleFavorite = () => {
    if (!user) { navigate("/perfil"); return; }
    toggleFavorite.mutate(product.id);
  };

  const handleBuyNow = () => {
    if (!user) { navigate("/perfil"); return; }
    addToCart.mutate({ productId: product.id, quantity: qty, swatch: selectedSwatch }, {
      onSuccess: () => navigate("/checkout"),
    });
  };

  const whatsappMsg = encodeURIComponent(`Olá! Gostaria de comprar: ${product.name}${selectedSwatch ? ` - Cor: ${selectedSwatch.name}` : ''} (${qty}x)`);

  return (
    <div className="min-h-screen">
      <SEOHead
        title={product.name}
        description={product.description || `${product.name} - ${product.brand}`}
        image={product.images?.[0]}
        url={`${window.location.origin}/produto/${product.slug}`}
        type="product"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.description,
            image: product.images || [],
            sku: product.id,
            brand: { "@type": "Brand", name: product.brand || "Elle Make" },
            category: tags?.[0] || "Maquiagem",
            offers: {
              "@type": "Offer",
              url: `${window.location.origin}/produto/${product.slug}`,
              price: Number(product.price).toFixed(2),
              priceCurrency: "BRL",
              availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              itemCondition: "https://schema.org/NewCondition",
              seller: { "@type": "Organization", name: "Elle Make" },
              ...(hasDiscount ? { priceValidUntil: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0] } : {}),
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: window.location.origin },
              { "@type": "ListItem", position: 2, name: "Produtos", item: `${window.location.origin}/explorar` },
              { "@type": "ListItem", position: 3, name: product.name, item: `${window.location.origin}/produto/${product.slug}` },
            ],
          },
        ]}
      />

      {/* Breadcrumb */}
      <div className="max-w-5xl mx-auto px-4 py-3">
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <Link to="/explorar" className="hover:text-primary transition-colors">Produtos</Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate">{product.name}</span>
        </nav>
      </div>

      {/* Main content — side by side on desktop */}
      <div className="max-w-5xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 md:gap-10">
          {/* Left: Image */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="relative md:max-w-[380px]">
            <div className="rounded-xl overflow-hidden bg-muted sticky top-24">
              {product.images?.[0] ? (
                <OptimizedImage src={product.images[0]} alt={product.name} aspectRatio="4/5" />
              ) : (
                <div className="aspect-[4/5] bg-muted flex items-center justify-center text-muted-foreground">Sem imagem</div>
              )}
              {hasDiscount && (
                <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-xs px-2.5 py-0.5">
                  -{discountPercent}%
                </Badge>
              )}
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleToggleFavorite}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center shadow-sm"
              >
                <Heart className={cn("w-4 h-4 transition-colors", favorited ? "fill-destructive text-destructive" : "")} />
              </motion.button>
            </div>
          </motion.div>

          {/* Right: Product info */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            {/* Brand & Title */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{product.brand}</p>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">{product.name}</h1>
            </div>

            {/* Pricing */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-3">
                {hasDiscount && (
                  <span className="text-sm text-muted-foreground line-through">De R$ {Number(product.compare_at_price).toFixed(2).replace(".", ",")}</span>
                )}
              </div>
              <p className="text-2xl md:text-3xl font-bold text-foreground">
                R$ {Number(product.price).toFixed(2).replace(".", ",")}
              </p>
              {Number(product.price) >= 30 && (
                <p className="text-sm text-muted-foreground">
                  ou 3x de <span className="font-semibold text-foreground">R$ {(Number(product.price) / 3).toFixed(2).replace(".", ",")}</span> sem juros
                </p>
              )}
              <p className="text-sm text-accent font-semibold">
                R$ {pixPrice} no Pix (5% off)
              </p>
            </div>

            {/* Swatches */}
            {swatches.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Cor: <span className="text-primary">{selectedSwatch?.name || "Selecione"}</span></p>
                <div className="flex flex-wrap gap-2.5">
                  {swatches.map((s: any, i: number) => (
                    <motion.button
                      key={i}
                      onClick={() => setSelectedSwatch(s)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={cn(
                        "w-10 h-10 rounded-full border-2 transition-all shadow-sm",
                        selectedSwatch?.color === s.color ? "border-primary ring-2 ring-primary/30 scale-110" : "border-border"
                      )}
                      style={{ backgroundColor: s.color }}
                      title={s.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                ))}
              </div>
            )}

            {/* Quantity + Stock */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-background transition-colors">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center text-sm font-semibold">{qty}</span>
                <button onClick={() => setQty(Math.min(product.stock, qty + 1))} className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-background transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="text-sm text-muted-foreground">{product.stock} em estoque</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <Button
                onClick={handleAddToCart}
                disabled={addToCart.isPending}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 min-h-[48px] text-base font-semibold shadow-marsala"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                {addToCart.isPending ? "Adicionando..." : "Adicionar à Sacola"}
              </Button>

              <Button
                onClick={handleBuyNow}
                variant="outline"
                disabled={false}
                className="w-full min-h-[48px] text-base font-semibold border-2"
              >
                <CreditCard className="w-5 h-5 mr-2 text-accent" />
                Comprar Agora
              </Button>

              <a
                href={`https://wa.me/5591983045531?text=${whatsappMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[48px] text-base font-semibold border-2 border-border rounded-md flex items-center justify-center gap-2 hover:bg-muted transition-colors"
              >
                <WhatsAppIcon className="w-5 h-5 text-accent" />
                Comprar pelo WhatsApp
              </a>
            </div>

            {/* Shipping Calculator */}
            <div className="border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">Calcular Frete</span>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Package className="w-3.5 h-3.5" />
                <span>🛵 Belém e Ananindeua: entrega em até 3h</span>
              </div>

              <div className="flex gap-2">
                <Input
                  value={cep}
                  onChange={(e) => setCep(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="00000-000"
                  className="flex-1 h-9"
                  maxLength={9}
                />
                <Button
                  size="sm"
                  onClick={() => setShowShipping(true)}
                  disabled={cep.length < 8}
                  className="bg-primary text-primary-foreground"
                >
                  Calcular
                </Button>
              </div>

              {showShipping && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Belém, PA</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      <span>Entrega Local (Belém / Ananindeua)</span>
                    </div>
                    <span className="text-sm font-semibold">R$ 20,00</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Zap className="w-4 h-4 text-muted-foreground" />
                      <span>Uber Flash / 99 Entrega</span>
                    </div>
                    <span className="text-sm font-semibold text-accent">A combinar</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <Store className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <span>Retirada na Loja</span>
                        <p className="text-[10px] text-muted-foreground">Disponível imediatamente</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-accent">Grátis</span>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Tabs: Descrição / Como Usar / Ingredientes */}
        <div className="mt-10">
          <Tabs defaultValue="descricao">
            <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-0 h-auto p-0">
              <TabsTrigger value="descricao" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium">
                Descrição
              </TabsTrigger>
              <TabsTrigger value="como-usar" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium">
                Como Usar
              </TabsTrigger>
              <TabsTrigger value="ingredientes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 text-sm font-medium">
                Ingredientes
              </TabsTrigger>
            </TabsList>
            <TabsContent value="descricao" className="pt-4">
              <p className="text-sm text-foreground/80 leading-relaxed">{product.description || "Descrição não disponível."}</p>
              {product.sensorial_description && (
                <div className="bg-card rounded-xl p-4 border border-border mt-4">
                  <p className="text-xs font-medium text-primary mb-1">✨ Experiência Sensorial</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{product.sensorial_description}</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="como-usar" className="pt-4">
              {(product as any).how_to_use ? (
                <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                  {(product as any).how_to_use}
                </div>
              ) : (
                <p className="text-sm text-foreground/80 leading-relaxed">
                  Aplique o produto conforme indicação na embalagem. Para melhores resultados, siga a rotina completa de cuidados.
                </p>
              )}
            </TabsContent>
            <TabsContent value="ingredientes" className="pt-4">
              <p className="text-sm text-foreground/80 leading-relaxed">
                {product.ingredients || "Consulte a embalagem do produto para a lista completa de ingredientes."}
              </p>
            </TabsContent>
          </Tabs>
        </div>

        {/* Reviews */}
        <div className="mt-10">
          <ReviewSection productId={product.id} />
        </div>

        {/* Trust Badges */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {trustBadges.map((badge, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-2 p-4 rounded-xl border border-border bg-card/50">
              <badge.icon className="w-6 h-6 text-primary" />
              <p className="text-xs font-bold text-foreground">{badge.text}</p>
              <p className="text-[10px] text-muted-foreground">{badge.sub}</p>
            </div>
          ))}
        </div>

        {/* WhatsApp CTA */}
        <div className="mt-10 bg-card rounded-2xl p-6 md:p-8 text-center border border-border">
          <h3 className="text-lg font-bold text-foreground mb-1">Dúvidas sobre este produto?</h3>
          <p className="text-sm text-muted-foreground mb-4">Fale com nossa consultora de beleza pelo WhatsApp</p>
          <a
            href={`https://wa.me/5591983045531?text=${encodeURIComponent(`Olá! Tenho dúvidas sobre: ${product.name}`)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90 min-h-[44px] px-6">
              <WhatsAppIcon className="w-5 h-5 mr-2" />
              WhatsApp (91) 98304-5531
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
};

export default Produto;
