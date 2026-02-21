import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import OptimizedImage from "@/components/ui/optimized-image";

interface ProductCardProps {
  product: any;
  index?: number;
}

const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;
  const { addToCart } = useCart();
  const { user } = useAuth();

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    addToCart.mutate({ productId: product.id, quantity: 1 });
  };

  return (
    <Link to={`/produto/${product.slug}`} className="block group">
      <motion.div
        whileHover={{ y: -4, boxShadow: "0 8px 30px -10px hsl(var(--foreground) / 0.1)" }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="bg-card rounded-lg overflow-hidden border border-border"
      >
        {/* Image with lazy loading */}
        <div className="relative">
          {product.images?.[0] ? (
            <OptimizedImage
              src={product.images[0]}
              alt={product.name}
              className="group-hover:scale-105 transition-transform duration-700 ease-out"
              aspectRatio="1/1"
            />
          ) : (
            <div className="aspect-square bg-muted flex items-center justify-center text-muted-foreground text-xs">
              Sem imagem
            </div>
          )}
          {hasDiscount && (
            <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-sm">
              -{discountPercent}%
            </Badge>
          )}
        </div>

        {/* Info */}
        <div className="p-3 space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{product.brand}</p>
          <h3 className="text-sm font-medium leading-tight line-clamp-2 text-foreground">{product.name}</h3>
          <div className="space-y-0.5">
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through block">
                R$ {Number(product.compare_at_price).toFixed(2).replace(".", ",")}
              </span>
            )}
            <span className="text-base font-bold text-primary">
              R$ {Number(product.price).toFixed(2).replace(".", ",")}
            </span>
            {Number(product.price) >= 30 && (
              <p className="text-[10px] text-muted-foreground">
                ou 3x de R$ {(Number(product.price) / 3).toFixed(2).replace(".", ",")} sem juros
              </p>
            )}
          </div>
          {product.swatches && JSON.parse(typeof product.swatches === 'string' ? product.swatches : JSON.stringify(product.swatches)).length > 0 && (
            <div className="flex gap-1 pt-0.5">
              {JSON.parse(typeof product.swatches === 'string' ? product.swatches : JSON.stringify(product.swatches)).slice(0, 4).map((s: any, i: number) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.3 }}
                  className="w-4 h-4 rounded-full border border-border"
                  style={{ backgroundColor: s.color }}
                  title={s.name}
                />
              ))}
            </div>
          )}
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              onClick={handleQuickAdd}
              className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full text-xs h-9 font-semibold press-scale"
              size="sm"
            >
              <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
              Adicionar
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </Link>
  );
};

export default ProductCard;
