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
    <div className="bg-card border border-border rounded-xl px-3 py-2.5 flex items-center gap-2.5">
      <Truck className={`w-4 h-4 flex-shrink-0 ${achieved ? "text-accent" : "text-primary"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-foreground leading-tight truncate">
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
  );
};

export default FreeShippingBar;
