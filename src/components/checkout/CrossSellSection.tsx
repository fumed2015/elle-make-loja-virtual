import { useMemo, useState, useEffect, useRef } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { motion } from "framer-motion";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ROTATE_INTERVAL = 10_000; // 10 seconds

const CrossSellSection = ({ cartProductIds }: { cartProductIds: string[] }) => {
  const { data: allProducts } = useProducts({});
  const { addToCart } = useCart();
  const [offset, setOffset] = useState(0);

  // Build a stable pool of eligible products (sorted by id for determinism)
  const pool = useMemo(() => {
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
      .sort((a, b) => a.id.localeCompare(b.id)); // stable sort
  }, [allProducts, cartProductIds]);

  // Rotate every 10s
  useEffect(() => {
    if (pool.length <= 2) return;
    const timer = setInterval(() => {
      setOffset(prev => (prev + 2) % pool.length);
    }, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [pool.length]);

  // Pick 2 items from pool at current offset
  const suggestions = useMemo(() => {
    if (pool.length === 0) return [];
    if (pool.length <= 2) return pool;
    const items: typeof pool = [];
    for (let i = 0; i < 2; i++) {
      items.push(pool[(offset + i) % pool.length]);
    }
    return items;
  }, [pool, offset]);

  if (suggestions.length === 0) return null;

  const handleAdd = (productId: string) => {
    addToCart.mutate({ productId, quantity: 1 }, {
      onSuccess: () => toast.success("Adicionado à sacola! 🛍️"),
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-lg p-3 border border-border space-y-2"
    >
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-primary" />
        <p className="text-xs font-semibold">Complemente seu look ✨</p>
      </div>
      <div className="flex gap-2">
        {suggestions.map(p => (
          <div key={p.id} className="flex-1 bg-muted rounded-md p-2 flex items-center gap-2">
            <div className="w-12 h-12 rounded-md overflow-hidden bg-background flex-shrink-0">
              {p.images?.[0] && (
                <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium line-clamp-1 leading-tight">{p.name}</p>
              <span className="text-[10px] font-bold text-primary">
                R$ {Number(p.price).toFixed(2).replace(".", ",")}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-6 w-6 p-0 flex-shrink-0"
              onClick={() => handleAdd(p.id)}
              disabled={addToCart.isPending}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default CrossSellSection;
