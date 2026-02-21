import { ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const Carrinho = () => {
  const { items, isLoading, removeFromCart, cartTotal, cartCount } = useCart();
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center gap-4">
        <ShoppingBag className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-display font-bold">Seu carrinho</h1>
        <p className="text-sm text-muted-foreground">Faça login para ver seu carrinho</p>
        <Button asChild className="bg-gradient-gold text-primary-foreground min-h-[44px]">
          <Link to="/perfil">Entrar</Link>
        </Button>
      </div>
    );
  }

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
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
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
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {product?.images?.[0] && (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{product?.name}</p>
                  {swatch?.name && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: swatch.color }} />
                      <span className="text-[10px] text-muted-foreground">{swatch.name}</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Qtd: {item.quantity}</p>
                  <p className="text-sm font-bold text-primary mt-1">
                    R$ {(Number(product?.price || 0) * item.quantity).toFixed(2).replace(".", ",")}
                  </p>
                </div>
                <button
                  onClick={() => removeFromCart.mutate(item.id)}
                  className="self-start p-2 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>

      {/* Total */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">R$ {cartTotal.toFixed(2).replace(".", ",")}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Frete</span>
          <span className="text-secondary font-medium">Calcular na finalização</span>
        </div>
        <div className="border-t border-border pt-3 flex justify-between">
          <span className="font-display font-bold">Total</span>
          <span className="font-bold text-lg text-primary">
            R$ {cartTotal.toFixed(2).replace(".", ",")}
          </span>
        </div>
        <Button asChild className="w-full bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90 min-h-[44px]">
          <Link to="/checkout">
            Finalizar Compra <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default Carrinho;
