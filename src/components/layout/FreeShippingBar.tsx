import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Truck } from "lucide-react";
import { useCart } from "@/hooks/useCart";

const FREE_SHIPPING_MIN = 199;

const FreeShippingBar = () => {
  const { cartTotal } = useCart();
  const [dismissed, setDismissed] = useState(false);
  const [prevTotal, setPrevTotal] = useState(cartTotal);

  const progress = Math.min((cartTotal / FREE_SHIPPING_MIN) * 100, 100);
  const remaining = Math.max(FREE_SHIPPING_MIN - cartTotal, 0);
  const achieved = cartTotal >= FREE_SHIPPING_MIN;

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem("freeShippingDismissed");
    if (wasDismissed) setDismissed(true);
  }, []);

  // Auto-dismiss after 30s if no product added
  useEffect(() => {
    if (dismissed || cartTotal <= 0) return;
    const timer = setTimeout(() => setDismissed(true), 30000);
    return () => clearTimeout(timer);
  }, [dismissed, cartTotal]);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("freeShippingDismissed", "1");
  };

  if (dismissed || cartTotal <= 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", damping: 22, stiffness: 300 }}
        className="fixed bottom-[4.5rem] md:bottom-5 left-3 right-3 md:left-auto md:right-5 z-50 md:w-80"
      >
        <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-lg px-3 py-2.5 flex items-center gap-2.5">
          <Truck className={`w-4 h-4 flex-shrink-0 ${achieved ? "text-accent" : "text-primary"}`} />

          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-foreground leading-tight truncate">
              {achieved
                ? "Frete grátis garantido! 🎉"
                : cartTotal > 0
                  ? <>Faltam <span className="text-primary">R$ {remaining.toFixed(2).replace('.', ',')}</span> p/ frete grátis</>
                  : "Frete grátis acima de R$ 199"
              }
            </p>
            {/* Mini progress bar */}
            <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className={`h-full rounded-full ${achieved ? "bg-accent" : "bg-primary"}`}
              />
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-muted transition-colors flex-shrink-0"
            aria-label="Fechar"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FreeShippingBar;
