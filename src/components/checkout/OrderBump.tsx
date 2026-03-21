import { useMemo } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { motion } from "framer-motion";
import { Zap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Order bump: offer a low-price complementary product before payment
const OrderBump = ({ cartProductIds }: { cartProductIds: string[] }) => {
  const { data: allProducts } = useProducts({});
  const { addToCart } = useCart();

  const bumpProduct = useMemo(() => {
    if (!allProducts) return null;
    // Find cheap products not in cart (accessories, esponjas, etc.)
    return allProducts
      .filter(p => 
        !cartProductIds.includes(p.id) &&
        p.is_active &&
        p.stock > 0 &&
        Number(p.price) <= 25 &&
        Number(p.price) >= 5
      )
      .sort(() => Math.random() - 0.5)[0] || null;
  }, [allProducts, cartProductIds]);

  if (!bumpProduct) return null;

  const handleAdd = () => {
    addToCart.mutate({ productId: bumpProduct.id, quantity: 1 }, {
      onSuccess: () => toast.success("Adicionado ao pedido! 🎉"),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-4 border-2 border-dashed border-primary/30 space-y-2"
    >
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        <p className="text-xs font-bold text-primary">🔥 Oferta especial para este pedido!</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {bumpProduct.images?.[0] && (
            <img src={bumpProduct.images[0]} alt={bumpProduct.name} className="w-full h-full object-contain" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium line-clamp-1">{bumpProduct.name}</p>
          <p className="text-[10px] text-muted-foreground">{bumpProduct.brand}</p>
          <p className="text-sm font-bold text-primary">
            + R$ {Number(bumpProduct.price).toFixed(2).replace(".", ",")}
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={addToCart.isPending}
          className="h-8 text-xs gap-1 bg-primary text-primary-foreground"
        >
          <Check className="w-3 h-3" /> Sim!
        </Button>
      </div>
    </motion.div>
  );
};

export default OrderBump;
