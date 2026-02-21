import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Truck, Gift } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { Progress } from "@/components/ui/progress";

const FREE_SHIPPING_MIN = 199;

const FreeShippingBar = () => {
  const { cartTotal } = useCart();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  const progress = Math.min((cartTotal / FREE_SHIPPING_MIN) * 100, 100);
  const remaining = Math.max(FREE_SHIPPING_MIN - cartTotal, 0);
  const achieved = cartTotal >= FREE_SHIPPING_MIN;

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem("freeShippingDismissed");
    if (wasDismissed) setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("freeShippingDismissed", "1");
  };

  if (dismissed || !visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md"
      >
        <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Close */}
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition-colors z-10"
            aria-label="Fechar"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>

          <div className="px-4 pt-3.5 pb-3">
            {/* Icon + Text */}
            <div className="flex items-center gap-3 mb-2.5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                achieved ? "bg-accent/15" : "bg-primary/10"
              }`}>
                {achieved ? (
                  <Gift className="w-5 h-5 text-accent" />
                ) : (
                  <Truck className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {achieved ? (
                  <>
                    <p className="text-sm font-bold text-accent">Parabéns! Frete Grátis! 🎉</p>
                    <p className="text-[11px] text-muted-foreground">
                      Seu pedido já tem frete grátis para Belém e Região Metropolitana
                    </p>
                  </>
                ) : cartTotal > 0 ? (
                  <>
                    <p className="text-sm font-bold text-foreground">
                      Faltam <span className="text-primary">R$ {remaining.toFixed(2).replace('.', ',')}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      para frete grátis em Belém e Região Metropolitana
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold text-foreground">Frete Grátis 🚚</p>
                    <p className="text-[11px] text-muted-foreground">
                      Em compras acima de R$ 199 para Belém e Região Metropolitana
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <Progress value={progress} className="h-2.5 bg-muted" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
                <span>R$ {FREE_SHIPPING_MIN.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FreeShippingBar;
