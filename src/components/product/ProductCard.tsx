import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  product: any;
  index?: number;
}

const ProductCard = ({ product, index = 0 }: ProductCardProps) => {
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Link to={`/produto/${product.slug}`} className="block group">
        <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted mb-2">
          {product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
              Sem imagem
            </div>
          )}
          {hasDiscount && (
            <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] px-2 py-0.5">
              -{discountPercent}%
            </Badge>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{product.brand}</p>
          <h3 className="text-sm font-medium leading-tight line-clamp-2">{product.name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-primary">
              R$ {Number(product.price).toFixed(2).replace(".", ",")}
            </span>
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">
                R$ {Number(product.compare_at_price).toFixed(2).replace(".", ",")}
              </span>
            )}
          </div>
          {/* Swatches preview */}
          {product.swatches && JSON.parse(typeof product.swatches === 'string' ? product.swatches : JSON.stringify(product.swatches)).length > 0 && (
            <div className="flex gap-1 pt-1">
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
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
