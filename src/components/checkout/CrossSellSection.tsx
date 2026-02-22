import { useMemo } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { motion } from "framer-motion";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Smart cross-sell: suggest products from same categories/brands but not already in cart
const CrossSellSection = ({ cartProductIds }: { cartProductIds: string[] }) => {
  const { data: allProducts } = useProducts({});
  const { addToCart } = useCart();

  const suggestions = useMemo(() => {
    if (!allProducts || cartProductIds.length === 0) return [];
    
    const cartProducts = allProducts.filter(p => cartProductIds.includes(p.id));
    const cartBrands = new Set(cartProducts.map(p => p.brand).filter(Boolean));
    const cartCategories = new Set(cartProducts.map(p => p.category_id).filter(Boolean));

    return allProducts
      .filter(p => 
        !cartProductIds.includes(p.id) && 
        p.is_active && 
        p.stock > 0 &&
        (cartBrands.has(p.brand) || cartCategories.has(p.category_id))
      )
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);
  }, [allProducts, cartProductIds]);

  if (suggestions.length === 0) return null;

  const handleAdd = (productId: string) => {
    addToCart.mutate({ productId, quantity: 1 }, {
      onSuccess: () => toast.success("Adicionado à sacola! 🛍️"),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-xl p-4 border border-border space-y-3"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold">Complemente seu look ✨</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {suggestions.map(p => {
          const hasDiscount = p.compare_at_price && Number(p.compare_at_price) > Number(p.price);
          return (
            <div key={p.id} className="bg-muted rounded-lg p-2.5 space-y-2">
              <div className="aspect-square rounded-md overflow-hidden bg-background">
                {p.images?.[0] && (
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                )}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">{p.brand}</p>
                <p className="text-xs font-medium line-clamp-2 leading-tight">{p.name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs font-bold text-primary">
                    R$ {Number(p.price).toFixed(2).replace(".", ",")}
                  </span>
                  {hasDiscount && (
                    <span className="text-[9px] text-muted-foreground line-through">
                      R$ {Number(p.compare_at_price).toFixed(2).replace(".", ",")}
                    </span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-[10px] gap-1"
                onClick={() => handleAdd(p.id)}
                disabled={addToCart.isPending}
              >
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default CrossSellSection;
