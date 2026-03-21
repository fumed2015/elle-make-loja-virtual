import { memo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Heart } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useCartDrawer } from "@/components/cart/AddToCartDrawer";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import OptimizedImage from "@/components/ui/optimized-image";

import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { trackAddToCart, trackAddToWishlist } from "@/hooks/useTikTokPixel";
import { fbTrackAddToCart, fbTrackAddToWishlist } from "@/hooks/useMetaPixel";

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
  const { addToCart, cartCount, cartTotal } = useCart();
  const { showAddedProduct } = useCartDrawer();
  const { user } = useAuth();
  const { toggleFavorite, isFavorited } = useFavorites();
  const favorited = user ? isFavorited(product.id) : false;
  const lowStock = product.stock > 0 && product.stock <= 5;
  const pixPrice = (Number(product.price) * 0.95).toFixed(2).replace(".", ",");

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stock <= 0) return;
    const swatches = typeof product.swatches === 'string' ? JSON.parse(product.swatches) : (product.swatches || []);
    if (swatches.length > 0) {
      navigate(`/produto/${product.slug}`);
      return;
    }
    addToCart.mutate({ productId: product.id, quantity: 1 }, {
      onSuccess: () => {
        showAddedProduct(
          { name: product.name, price: Number(product.price), image: product.images?.[0], quantity: 1 },
          cartCount + 1,
          cartTotal + Number(product.price)
        );
      }
    });
    const atcParams = { id: product.id, name: product.name, price: Number(product.price), quantity: 1 };
    trackAddToCart(atcParams);
    fbTrackAddToCart(atcParams);
  };

  const handleToggleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { navigate("/perfil"); return; }
    if (!favorited) {
      const wishlistParams = { id: product.id, name: product.name, price: Number(product.price) };
      fbTrackAddToWishlist(wishlistParams);
      trackAddToWishlist(wishlistParams);
    }
    toggleFavorite.mutate(product.id);
  };

  const swatches = typeof product.swatches === 'string' ? JSON.parse(product.swatches) : (product.swatches || []);

  return (
    <Link to={`/produto/${product.slug}`} className="block group">
      <div
        className="bg-card rounded-lg overflow-hidden border border-border relative transition-transform transition-shadow duration-200 hover:-translate-y-1 hover:shadow-md"
      >
        {/* Image */}
        <div className="relative overflow-hidden rounded-t-lg" style={{ aspectRatio: '1/1', backgroundColor: '#f8f5f2' }}>
          {product.images?.[0] ? (
            <OptimizedImage
              src={product.images[0]}
              alt={product.name}
              aspectRatio="1/1"
              displayWidth={400}
              placeholderColor="#f8f5f2"
              className="w-full h-full"
              width={400}
              height={400}
            />
          ) : (
            <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-1 text-muted-foreground">
              <ShoppingBag className="w-8 h-8 opacity-20" />
              <span className="text-[0.5625rem] font-medium opacity-40">Foto em breve</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-[0.625rem] left-[0.625rem] flex flex-col gap-0.5 z-10">
            {hasDiscount && (
              <Badge className="bg-destructive text-destructive-foreground text-[0.5rem] px-1.5 py-0 rounded-sm leading-tight">
                -{discountPercent}%
              </Badge>
            )}
            {lowStock && (
              <Badge className="bg-primary text-primary-foreground text-[0.4375rem] px-1 py-0 rounded-sm leading-tight animate-pulse">
                Últimas unid.
              </Badge>
            )}
          </div>

          {/* Favorite button — no backdrop-blur */}
          <button
            onClick={handleToggleFav}
            className="absolute top-[0.625rem] right-[0.625rem] z-10 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 transition-opacity active:scale-90"
          >
            <Heart className={cn("w-3.5 h-3.5 transition-colors", favorited ? "fill-destructive text-destructive" : "text-foreground/60")} />
          </button>
        </div>

        {/* Info */}
        <div className="p-2.5 space-y-1">
          <p className="text-[0.6875rem] text-muted-foreground uppercase tracking-wider leading-none">{product.brand}</p>
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
                <span className="text-[0.5625rem] text-muted-foreground">+{swatches.length - 5}</span>
              )}
            </div>
          )}

          {/* Price */}
          <div className="pt-0.5">
            {hasDiscount && (
              <span className="text-[0.8125rem] text-muted-foreground line-through block leading-none">
                R$ {Number(product.compare_at_price).toFixed(2).replace(".", ",")}
              </span>
            )}
            <span className="text-lg font-bold text-primary">
              R$ {Number(product.price).toFixed(2).replace(".", ",")}
            </span>
            <p className="text-[0.625rem] text-emerald-600 font-semibold leading-none mt-0.5">
              R$ {pixPrice} no Pix
            </p>
            {Number(product.price) >= 10 && (
              <p className="text-[0.625rem] text-foreground/70 font-medium leading-none mt-0.5">
                ou <span className="font-bold text-foreground">3x de R$ {(Number(product.price) / 3).toFixed(2).replace(".", ",")}</span> s/ juros
              </p>
            )}
          </div>

          {/* Add to cart */}
          <div className="flex gap-1.5 mt-1.5">
            {product.stock <= 0 ? (
              <Button
                disabled
                className="flex-1 rounded-md text-[0.625rem] h-[2rem] font-bold uppercase tracking-wide"
                size="sm"
              >
                Esgotado
              </Button>
            ) : swatches.length > 0 ? (
              <Button
                onClick={handleQuickAdd}
                variant="outline"
                className="flex-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-md text-[0.625rem] h-[2rem] font-bold uppercase tracking-wide"
                size="sm"
                title="Escolher cor e comprar"
              >
                Ver cores
              </Button>
            ) : (
              <Button
                onClick={handleQuickAdd}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-[0.625rem] h-[2rem] font-bold uppercase tracking-wide"
                size="sm"
              >
                Comprar
              </Button>
            )}
            <Button
              onClick={handleQuickAdd}
              disabled={product.stock <= 0}
              variant="outline"
              className="w-[2rem] h-[2rem] p-0 rounded-md border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              size="sm"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;
