import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";

interface ProductCardProps {
  product: any;
  index?: number;
}

const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;
  const [imgLoaded, setImgLoaded] = useState(false);
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
      <div className="bg-card rounded-lg overflow-hidden border border-border hover:shadow-md transition-shadow">
        {/* Image */}
        <div className="relative aspect-square bg-muted">
          {product.images?.[0] ? (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted-foreground/5 to-muted animate-shimmer bg-[length:200%_100%]" />
              )}
              <img
                src={product.images[0]}
                alt={product.name}
                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
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
          </div>
          {product.swatches && JSON.parse(typeof product.swatches === 'string' ? product.swatches : JSON.stringify(product.swatches)).length > 0 && (
            <div className="flex gap-1 pt-0.5">
              {JSON.parse(typeof product.swatches === 'string' ? product.swatches : JSON.stringify(product.swatches)).slice(0, 4).map((s: any, i: number) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full border border-border"
                  style={{ backgroundColor: s.color }}
                  title={s.name}
                />
              ))}
            </div>
          )}
          <Button
            onClick={handleQuickAdd}
            className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full text-xs h-9 font-semibold"
            size="sm"
          >
            <ShoppingBag className="w-3.5 h-3.5 mr-1.5" />
            Adicionar
          </Button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
