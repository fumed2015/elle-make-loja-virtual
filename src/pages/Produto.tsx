import { useState, useEffect } from "react";
import ProductImageGallery from "@/components/product/ProductImageGallery";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Heart, Minus, Plus, ShoppingBag, Truck, CreditCard, ShieldCheck, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useProduct, useProducts } from "@/hooks/useProducts";
import ProductCard from "@/components/product/ProductCard";
import { useCart } from "@/hooks/useCart";
import { useCartDrawer } from "@/components/cart/AddToCartDrawer";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { useShipping } from "@/hooks/useShipping";
import ShippingCalculator from "@/components/shipping/ShippingCalculator";
import ReviewSection from "@/components/product/ReviewSection";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import SEOHead from "@/components/SEOHead";
import UrgencyBadge from "@/components/product/UrgencyBadge";
import { trackViewContent, trackAddToCart, trackAddToWishlist, trackContact } from "@/hooks/useTikTokPixel";
import { fbTrackViewContent, fbTrackAddToCart, fbTrackAddToWishlist, fbTrackContact } from "@/hooks/useMetaPixel";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";

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
  const { addToCart, cartCount, cartTotal } = useCart();
  const { showAddedProduct } = useCartDrawer();
  const { user } = useAuth();
  const { toggleFavorite, isFavorited } = useFavorites();
  const [selectedSwatch, setSelectedSwatch] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const shipping = useShipping();

  // Auto-select first available swatch when product loads
  useEffect(() => {
    if (!product) return;
    const sw = typeof product.swatches === 'string' ? JSON.parse(product.swatches) : (product.swatches || []);
    const firstAvailable = sw.find((s: any) => s.available !== false) || sw[0];
    if (firstAvailable) {
      setSelectedSwatch(firstAvailable);
    }
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pixels: ViewContent
  useEffect(() => {
    if (!product) return;
    const params = { id: product.id, name: product.name, price: Number(product.price), brand: product.brand || undefined };
    trackViewContent(params);
    fbTrackViewContent(params);
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const hasDiscount = product.compare_at_price && Number(product.compare_at_price) > Number(product.price);
  const tags = product.tags || [];
  const favorited = isFavorited(product.id);
  const discountPercent = hasDiscount ? Math.round(((Number(product.compare_at_price) - Number(product.price)) / Number(product.compare_at_price)) * 100) : 0;
  const pixPrice = (Number(product.price) * 0.95).toFixed(2).replace(".", ",");

  const handleAddToCart = () => {
    addToCart.mutate({ productId: product.id, quantity: qty, swatch: selectedSwatch }, {
      onSuccess: () => {
        showAddedProduct(
          {
            name: product.name,
            price: Number(product.price),
            image: product.images?.[0],
            quantity: qty,
            swatch: selectedSwatch,
          },
          cartCount + qty,
          cartTotal + Number(product.price) * qty
        );
      }
    });
    const atcParams = { id: product.id, name: product.name, price: Number(product.price), quantity: qty };
    trackAddToCart(atcParams);
    fbTrackAddToCart(atcParams);
  };

  const handleToggleFavorite = () => {
    if (!user) { navigate("/perfil"); return; }
    if (!isFavorited(product.id)) {
      const wishlistParams = { id: product.id, name: product.name, price: Number(product.price) };
      fbTrackAddToWishlist(wishlistParams);
      trackAddToWishlist(wishlistParams);
    }
    toggleFavorite.mutate(product.id);
  };

  const handleBuyNow = () => {
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
          breadcrumbJsonLd([
            { label: "Produtos", href: "/explorar" },
            { label: product.name, href: `/produto/${product.slug}` },
          ]),
        ]}
      />

      <Breadcrumbs items={[
        { label: "Produtos", href: "/explorar" },
        { label: product.name },
      ]} />

      {/* Main content — side by side on desktop */}
      <div className="max-w-7xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-6 md:gap-10">
          {/* Left: Image */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="relative md:max-w-[380px]">
            <div className="sticky top-24">
              <ProductImageGallery images={product.images || []} alt={product.name}>
                {hasDiscount && (
                  <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-xs px-2.5 py-0.5 z-10">
                    -{discountPercent}%
                  </Badge>
                )}
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={handleToggleFavorite}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center shadow-sm z-10"
                >
                  <Heart className={cn("w-4 h-4 transition-colors", favorited ? "fill-destructive text-destructive" : "")} />
                </motion.button>
              </ProductImageGallery>
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
            <div className="space-y-1.5">
              <div className="flex items-baseline gap-3">
                {hasDiscount && (
                  <span className="text-sm text-muted-foreground line-through">De R$ {Number(product.compare_at_price).toFixed(2).replace(".", ",")}</span>
                )}
              </div>
              <p className="text-2xl md:text-3xl font-bold text-foreground">
                R$ {Number(product.price).toFixed(2).replace(".", ",")}
              </p>
              {Number(product.price) >= 10 && (
                <div className="bg-muted/50 rounded-lg px-3 py-1.5 inline-block">
                  <p className="text-sm text-foreground">
                    ou <span className="font-bold text-primary text-base">3x de R$ {(Number(product.price) / 3).toFixed(2).replace(".", ",")}</span> <span className="text-muted-foreground">sem juros</span>
                  </p>
                </div>
              )}
              <p className="text-sm text-accent font-semibold">
                💰 R$ {pixPrice} no Pix (5% off)
              </p>
            </div>

            {/* Swatches */}
            {swatches.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Cor: <span className="text-primary">{selectedSwatch?.name || "Selecione"}</span>
                  {selectedSwatch?.available === false && <span className="text-destructive text-xs ml-2">(Indisponível)</span>}
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {swatches.map((s: any, i: number) => {
                    const isUnavailable = s.available === false;
                    return (
                      <motion.button
                        key={i}
                        onClick={() => !isUnavailable && setSelectedSwatch(s)}
                        whileHover={!isUnavailable ? { scale: 1.1 } : {}}
                        whileTap={!isUnavailable ? { scale: 0.9 } : {}}
                        className={cn(
                          "w-10 h-10 rounded-full border-2 transition-all shadow-sm relative",
                          selectedSwatch?.color === s.color && !isUnavailable ? "border-primary ring-2 ring-primary/30 scale-110" : "border-border",
                          isUnavailable && "opacity-40 cursor-not-allowed"
                        )}
                        style={{ backgroundColor: s.color }}
                        title={isUnavailable ? `${s.name} - Indisponível` : s.name}
                        disabled={isUnavailable}
                      >
                        {isUnavailable && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="w-[120%] h-[2px] bg-foreground/60 rotate-45 absolute" />
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
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

            {/* Urgency alert */}
            <UrgencyBadge stock={product.stock} />

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <Button
                onClick={handleAddToCart}
                disabled={addToCart.isPending || product.stock <= 0}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 min-h-[48px] text-base font-semibold shadow-marsala"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                {product.stock <= 0 ? "Esgotado" : addToCart.isPending ? "Adicionando..." : "Adicionar à Sacola"}
              </Button>

              <Button
                onClick={handleBuyNow}
                variant="outline"
                disabled={addToCart.isPending || product.stock <= 0}
                className="w-full min-h-[48px] text-base font-semibold border-2"
              >
                <CreditCard className="w-5 h-5 mr-2 text-accent" />
                Comprar Agora
              </Button>

              <a
                href={`https://wa.me/5591936180774?text=${whatsappMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => { fbTrackContact(); trackContact(); }}
                className="w-full min-h-[48px] text-base font-semibold border-2 border-border rounded-md flex items-center justify-center gap-2 hover:bg-muted transition-colors"
              >
                <WhatsAppIcon className="w-5 h-5 text-[#25D366]" />
                Comprar pelo WhatsApp
              </a>
            </div>

            {/* Shipping Calculator */}
            <ShippingCalculator
              cep={shipping.cep}
              onCepChange={shipping.setCep}
              onCalculate={shipping.calculateShipping}
              loading={shipping.loading}
              error={shipping.error}
              options={shipping.options}
              selectedOption={shipping.selectedOption}
              onSelectOption={shipping.selectOption}
              isLocal={shipping.isLocal}
              addressInfo={shipping.addressInfo}
            />
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
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {tags.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                  ))}
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
            href={`https://wa.me/5591936180774?text=${encodeURIComponent(`Olá! Tenho dúvidas sobre: ${product.name}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 min-h-[44px] px-6 rounded-md font-semibold text-sm text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#25D366' }}
          >
            <WhatsAppIcon className="w-5 h-5" />
            WhatsApp (91) 93618-0774
          </a>
        </div>
      </div>
    </div>
  );
};

export default Produto;
