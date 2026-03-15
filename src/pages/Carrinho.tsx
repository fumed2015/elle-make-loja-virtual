import { useEffect } from "react";
import { ShoppingBag, Trash2, ArrowRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useShipping } from "@/hooks/useShipping";
import ShippingCalculator from "@/components/shipping/ShippingCalculator";
import FreeShippingBar from "@/components/layout/FreeShippingBar";
import CrossSellSection from "@/components/checkout/CrossSellSection";
import UrgencyBadge from "@/components/product/UrgencyBadge";
import { fbTrackViewCart } from "@/hooks/useMetaPixel";
import Breadcrumbs from "@/components/Breadcrumbs";

const Carrinho = () => {
  const { items, isLoading, removeFromCart, updateQuantity, cartTotal, cartCount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const shipping = useShipping();
  const shippingCost = shipping.selectedShipping?.price ?? 0;
  const total = cartTotal + shippingCost;
  

  // Pixel: ViewCart
  useEffect(() => {
    if (items.length === 0) return;
    const contentIds = items.map((item: any) => (item.products as any)?.id).filter(Boolean);
    const contents = items.map((item: any) => ({ id: (item.products as any)?.id, quantity: item.quantity })).filter((c: any) => c.id);
    fbTrackViewCart({ value: cartTotal, itemCount: cartCount, contentIds, contents });
  }, [items.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center gap-4">
        <ShoppingBag className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-display font-bold">Carrinho vazio</h1>
        <p className="text-sm text-muted-foreground">Explore nossos produtos e adicione seus favoritos</p>
        <Button asChild variant="outline" className="min-h-[44px]">
          <Link to="/explorar">Explorar produtos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-4 max-w-lg mx-auto">
      <Breadcrumbs items={[{ label: "Carrinho" }]} />
      <div className="px-4 pt-6">
      <h1 className="text-2xl font-display font-bold mb-6">
        Carrinho <span className="text-muted-foreground text-base">({cartCount})</span>
      </h1>

      <AnimatePresence>
        <div className="space-y-3 mb-6">
          {items.map((item) => {
            const product = item.products as any;
            const swatch = item.selected_swatch as any;
            return (
              <motion.div
                key={item.id}
                layout
                exit={{ opacity: 0, x: -100 }}
                className="flex gap-3 bg-card rounded-xl p-3 border border-border"
              >
                <Link to={`/produto/${product?.slug}`} className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {product?.images?.[0] && (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-contain" />
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/produto/${product?.slug}`}>
                    <p className="text-sm font-medium line-clamp-1 hover:text-primary transition-colors">{product?.name}</p>
                  </Link>
                  {swatch?.name && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: swatch.color }} />
                      <span className="text-[10px] text-muted-foreground">{swatch.name}</span>
                    </div>
                  )}
                  {/* Quantity controls */}
                  <div className="flex items-center gap-1 mt-1.5">
                    <button
                      onClick={() => updateQuantity.mutate({ itemId: item.id, quantity: item.quantity - 1 })}
                      className="w-7 h-7 rounded-md bg-muted flex items-center justify-center hover:bg-muted-foreground/10 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                      className="w-7 h-7 rounded-md bg-muted flex items-center justify-center hover:bg-muted-foreground/10 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    </div>
                  <p className="text-sm font-bold text-primary mt-1">
                    R$ {(Number(product?.price || 0) * item.quantity).toFixed(2).replace(".", ",")}
                  </p>
                  {/* Urgency badge */}
                  {product?.stock && product.stock <= 10 && product.stock > 0 && (
                    <UrgencyBadge stock={product.stock} compact />
                  )}
                </div>
                <motion.button
                  whileTap={{ scale: 0.8, rotate: -10 }}
                  onClick={() => removeFromCart.mutate(item.id)}
                  className="self-start p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>

      {/* Cross-sell suggestions */}
      <div className="mb-4">
        <CrossSellSection cartProductIds={items.map((item) => (item.products as any)?.id).filter(Boolean)} />
      </div>

      {/* Free shipping progress */}
      <div className="mb-4">
        <FreeShippingBar />
      </div>

      {/* Shipping Calculator */}
      <div className="mb-4">
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
          compact
        />
      </div>

      {/* Total */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">R$ {cartTotal.toFixed(2).replace(".", ",")}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Frete</span>
          {shipping.selectedShipping ? (
            shipping.selectedShipping.price !== null ? (
              <span className="font-medium">R$ {shipping.selectedShipping.price.toFixed(2).replace(".", ",")}</span>
            ) : (
              <span className="text-accent font-medium">A combinar</span>
            )
          ) : (
            <span className="text-muted-foreground text-xs">Informe o CEP</span>
          )}
        </div>
        {cartTotal >= 199 && shipping.isLocal && (
          <div className="flex justify-between text-sm">
            <span className="text-accent font-medium">Frete grátis aplicado!</span>
            <span className="text-accent font-medium line-through">R$ {shippingCost.toFixed(2).replace(".", ",")}</span>
          </div>
        )}
        <div className="border-t border-border pt-3 flex justify-between">
          <span className="font-display font-bold">Total</span>
          <span className="font-bold text-lg text-primary">
            R$ {(cartTotal >= 199 && shipping.isLocal ? cartTotal : total).toFixed(2).replace(".", ",")}
          </span>
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold text-accent">
            💰 No Pix: R$ {((cartTotal >= 199 && shipping.isLocal ? cartTotal : total) * 0.95).toFixed(2).replace(".", ",")} (5% off)
          </p>
          {(cartTotal >= 199 && shipping.isLocal ? cartTotal : total) >= 10 && (
            <p className="text-xs text-foreground/70">
              ou <span className="font-bold text-foreground">3x de R$ {((cartTotal >= 199 && shipping.isLocal ? cartTotal : total) / 3).toFixed(2).replace(".", ",")}</span> sem juros no cartão
            </p>
          )}
        </div>
        <div className="bg-primary/10 rounded-lg p-2.5 text-center">
          <p className="text-xs font-semibold text-primary">🛵 Belém e Ananindeua: entrega em até 3 horas!</p>
        </div>
        <Button onClick={() => navigate("/checkout")} className="w-full bg-primary text-primary-foreground shadow-marsala hover:bg-primary/90 min-h-[44px] press-scale">
            Garantir Meu Look ✨ <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

export default Carrinho;
