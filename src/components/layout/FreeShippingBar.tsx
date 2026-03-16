import { Truck } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { motion } from "framer-motion";

const FREE_SHIPPING_MIN = 199;

const FreeShippingBar = () => {
  const { cartTotal } = useCart();

  const progress = Math.min((cartTotal / FREE_SHIPPING_MIN) * 100, 100);
  const remaining = Math.max(FREE_SHIPPING_MIN - cartTotal, 0);
  const achieved = cartTotal >= FREE_SHIPPING_MIN;

  if (cartTotal <= 0) return null;

  return (
    <>
      {/* Mobile: simple inline text bar, no popup */}
      <div className="md:hidden bg-muted/60 border-b border-border px-3 py-1.5 flex items-center gap-2">
        <Truck className={`w-3.5 h-3.5 flex-shrink-0 ${achieved ? "text-accent" : "text-primary"}`} />
        <p className="text-[0.625rem] font-medium text-foreground truncate">
          {achieved
            ? "Frete grátis garantido! 🎉"
            : <>Faltam <span className="text-primary font-bold">R$ {remaining.toFixed(2).replace('.', ',')}</span> p/ frete grátis</>
          }
        </p>
      </div>

      {/* Desktop: card with progress bar */}
      <div className="hidden md:flex bg-card border border-border rounded-xl px-3 py-2.5 items-center gap-2.5">
        <Truck className={`w-4 h-4 flex-shrink-0 ${achieved ? "text-accent" : "text-primary"}`} />
        <div className="flex-1 min-w-0">
          <p className="text-[0.6875rem] font-semibold text-foreground leading-tight truncate">
            {achieved
              ? "Frete grátis garantido! 🎉"
              : <>Faltam <span className="text-primary">R$ {remaining.toFixed(2).replace('.', ',')}</span> p/ frete grátis (Belém/Ananindeua)</>
            }
          </p>
          <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={`h-full rounded-full ${achieved ? "bg-accent" : "bg-primary"}`}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default FreeShippingBar;
