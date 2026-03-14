import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ShoppingBag, Check, ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import OptimizedImage from "@/components/ui/optimized-image";
import confetti from "canvas-confetti";

// ─── Context ───────────────────────────────────────────────
interface AddedProduct {
  name: string;
  price: number;
  image?: string;
  quantity: number;
  swatch?: { name?: string; color?: string } | null;
}

interface CartDrawerContextType {
  showAddedProduct: (product: AddedProduct, cartCount: number, cartTotal: number) => void;
}

const CartDrawerContext = createContext<CartDrawerContextType | null>(null);

export const useCartDrawer = () => {
  const ctx = useContext(CartDrawerContext);
  if (!ctx) throw new Error("useCartDrawer must be within CartDrawerProvider");
  return ctx;
};

// ─── Provider ──────────────────────────────────────────────
export function CartDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState<AddedProduct | null>(null);
  const [cartInfo, setCartInfo] = useState({ count: 0, total: 0 });

  const showAddedProduct = useCallback(
    (p: AddedProduct, count: number, total: number) => {
      setProduct(p);
      setCartInfo({ count, total });
      setOpen(true);
      // Auto-dismiss after 5s
      setTimeout(() => setOpen(false), 5000);
    },
    []
  );

  return (
    <CartDrawerContext.Provider value={{ showAddedProduct }}>
      {children}

      <AnimatePresence>
        {open && product && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-foreground/20 backdrop-blur-[2px] z-[60]"
              onClick={() => setOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-[61] mx-auto max-w-lg"
            >
              <div className="bg-card rounded-t-2xl shadow-2xl border border-border overflow-hidden">
                {/* Grab handle */}
                <div className="flex justify-center pt-2 pb-1">
                  <div className="w-10 h-1 rounded-full bg-border" />
                </div>

                {/* Success header */}
                <div className="flex items-center justify-between px-4 pb-2">
                  <div className="flex items-center gap-2">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.15 }}
                      className="w-7 h-7 rounded-full bg-accent flex items-center justify-center"
                    >
                      <Check className="w-4 h-4 text-accent-foreground" strokeWidth={3} />
                    </motion.div>
                    <span className="text-sm font-bold text-foreground">
                      Adicionado ao carrinho!
                    </span>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Product row */}
                <div className="px-4 py-3 flex gap-3 items-center">
                  {product.image ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="w-16 h-16 rounded-lg overflow-hidden border border-border flex-shrink-0 bg-white"
                    >
                      <OptimizedImage
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        displayWidth={128}
                      />
                    </motion.div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight">
                      {product.name}
                    </p>
                    {product.swatch?.name && (
                      <div className="flex items-center gap-1.5 mt-1">
                        {product.swatch.color && (
                          <span
                            className="w-3 h-3 rounded-full border border-border inline-block"
                            style={{ backgroundColor: product.swatch.color }}
                          />
                        )}
                        <span className="text-[10px] text-muted-foreground">{product.swatch.name}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        Qtd: {product.quantity}
                      </span>
                      <span className="text-sm font-bold text-primary">
                        R$ {(product.price * product.quantity).toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cart summary bar */}
                <div className="mx-4 rounded-lg bg-muted/60 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs text-muted-foreground">
                      {cartInfo.count} {cartInfo.count === 1 ? "item" : "itens"} no carrinho
                    </span>
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    R$ {cartInfo.total.toFixed(2).replace(".", ",")}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="px-4 pt-3 pb-5 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-11 rounded-xl text-xs font-bold border-primary text-primary hover:bg-primary/5"
                    onClick={() => setOpen(false)}
                  >
                    Continuar comprando
                  </Button>
                  <Button
                    asChild
                    className="flex-1 h-11 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
                  >
                    <Link to="/carrinho" onClick={() => setOpen(false)}>
                      <Sparkles className="w-3.5 h-3.5" />
                      Ver carrinho
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </CartDrawerContext.Provider>
  );
}
