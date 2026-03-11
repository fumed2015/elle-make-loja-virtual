import { memo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Heart, Eye } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { motion } from "framer-motion";
import OptimizedImage from "@/components/ui/optimized-image";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { trackAddToCart } from "@/hooks/useTikTokPixel";
import { fbTrackAddToCart } from "@/hooks/useMetaPixel";

interface ProductCardProps {
  product: any;
  index?: number;
}

const ProductCard = memo(({ product, index = 0 }: ProductCardProps) => {
  const navigate = useNavigate();
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { toggleFavorite, isFavorited } = useFavorites();
  const favorited = user ? isFavorited(product.id) : false;
  const lowStock = product.stock > 0 && product.stock <= 5;
  const pixPrice = (Number(product.price) * 0.95).toFixed(2).replace(".", ",");

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) return;
    // If product has swatches, navigate to product page instead
    const swatches = typeof product.swatches === 'string' ? JSON.parse(product.swatches) : (product.swatches || []);
    if (swatches.length > 0) {
      navigate(`/produto/${product.slug}`);
      return;
    }
    addToCart.mutate({ productId: product.id, quantity: 1 });
    const atcParams = { id: product.id, name: product.name, price: Number(product.price), quantity: 1 };
    trackAddToCart(atcParams);
    fbTrackAddToCart(atcParams);
  };

  const handleToggleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate("/perfil"); return; }
    toggleFavorite.mutate(product.id);
  };

  const swatches = typeof product.swatches === 'string' ? JSON.parse(product.swatches) : (product.swatches || []);

  return (
    <Link to={`/produto/${product.slug}`} className="block group">
      <motion.div
        whileHover={{ y: -4, boxShadow: "0 8px 30px -10px hsl(var(--foreground) / 0.1)" }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="bg-card rounded-lg overflow-hidden border border-border relative"
      >
        {/* Image */}
        <div className="relative">
          {product.images?.[0] ? (
            <OptimizedImage
              src={product.images[0]}
              alt={product.name}
              className="transition-opacity duration-300"
              aspectRatio="1/1"
              displayWidth={400}
            />
          ) : (
            <div className="aspect-square bg-white flex items-center justify-center text-muted-foreground text-[9px]">
              Sem imagem
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-1 left-1 flex flex-col gap-0.5">
            {hasDiscount && (
              <Badge className="bg-destructive text-destructive-foreground text-[8px] px-1.5 py-0 rounded-sm leading-tight">
                -{discountPercent}%
              </Badge>
            )}
            {lowStock && (
              <Badge className="bg-primary text-primary-foreground text-[7px] px-1 py-0 rounded-sm leading-tight animate-pulse">
                Últimas unid.
              </Badge>
            )}
          </div>

          {/* Favorite button */}
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={handleToggleFav}
            className="absolute top-1 right-1 w-7 h-7 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          >
            <Heart className={cn("w-3.5 h-3.5 transition-colors", favorited ? "fill-destructive text-destructive" : "text-foreground/60")} />
          </motion.button>

        </div>

        {/* Info */}
        <div className="p-2.5 space-y-1">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider leading-none">{product.brand}</p>
          <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-foreground">{product.name}</h3>

          {/* Swatches preview */}
          {swatches.length > 0 && (
            <div className="flex items-center gap-0.5">
              {swatches.slice(0, 5).map((s: any, i: number) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full border border-border"
                  style={{ backgroundColor: s.color }}
                  title={s.name}
                />
              ))}
              {swatches.length > 5 && (
                <span className="text-[9px] text-muted-foreground">+{swatches.length - 5}</span>
              )}
            </div>
          )}

          {/* Price */}
          <div className="pt-0.5">
            {hasDiscount && (
              <span className="text-[13px] text-muted-foreground line-through block leading-none">
                R$ {Number(product.compare_at_price).toFixed(2).replace(".", ",")}
              </span>
            )}
            <span className="text-base font-bold text-primary">
              R$ {Number(product.price).toFixed(2).replace(".", ",")}
            </span>
            <p className="text-[10px] text-accent font-semibold leading-none mt-0.5">
              R$ {pixPrice} no Pix
            </p>
            {Number(product.price) >= 10 && (
              <p className="text-[10px] text-foreground/70 font-medium leading-none mt-0.5">
                ou <span className="font-bold text-foreground">3x de R$ {(Number(product.price) / 3).toFixed(2).replace(".", ",")}</span> s/ juros
              </p>
            )}
          </div>

          {/* Add to cart button - always visible on mobile, hover on desktop */}
          <div className="md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
            <Button
              onClick={handleQuickAdd}
              disabled={product.stock <= 0}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full text-[10px] h-7 font-semibold mt-1.5"
              size="sm"
            >
              <ShoppingBag className="w-3 h-3 mr-1" />
              {product.stock <= 0 ? "Esgotado" : swatches.length > 0 ? "Ver cores" : "Adicionar"}
            </Button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
