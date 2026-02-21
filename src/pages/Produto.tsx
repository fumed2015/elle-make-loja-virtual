import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProduct } from "@/hooks/useProducts";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import ReviewSection from "@/components/product/ReviewSection";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const Produto = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProduct(slug || "");
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { toggleFavorite, isFavorited } = useFavorites();
  const [selectedSwatch, setSelectedSwatch] = useState<any>(null);
  const [qty, setQty] = useState(1);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Produto não encontrado
      </div>
    );
  }

  const swatches = typeof product.swatches === 'string' ? JSON.parse(product.swatches) : (product.swatches || []);
  const hasDiscount = product.compare_at_price && Number(product.compare_at_price) > Number(product.price);
  const tags = product.tags || [];
  const favorited = isFavorited(product.id);

  const handleAddToCart = () => {
    if (!user) { navigate("/perfil"); return; }
    addToCart.mutate({ productId: product.id, quantity: qty, swatch: selectedSwatch });
  };

  const handleToggleFavorite = () => {
    if (!user) { navigate("/perfil"); return; }
    toggleFavorite.mutate(product.id);
  };

  return (
    <div className="min-h-screen max-w-lg mx-auto">
      <div className="relative aspect-square bg-muted">
        {product.images?.[0] && (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
        )}
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button onClick={handleToggleFavorite} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center">
          <Heart className={cn("w-5 h-5 transition-colors", favorited ? "fill-destructive text-destructive" : "")} />
        </button>
        {hasDiscount && (
          <Badge className="absolute bottom-4 left-4 bg-destructive text-destructive-foreground">
            -{Math.round(((Number(product.compare_at_price) - Number(product.price)) / Number(product.compare_at_price)) * 100)}%
          </Badge>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-6 space-y-5">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{product.brand}</p>
          <h1 className="text-2xl font-display font-bold">{product.name}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xl font-bold text-primary">R$ {Number(product.price).toFixed(2).replace(".", ",")}</span>
            {hasDiscount && <span className="text-sm text-muted-foreground line-through">R$ {Number(product.compare_at_price).toFixed(2).replace(".", ",")}</span>}
          </div>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag: string) => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}
          </div>
        )}

        {swatches.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-2">Cor: {selectedSwatch?.name || "Selecione"}</p>
            <div className="flex gap-2">
              {swatches.map((s: any, i: number) => (
                <button key={i} onClick={() => setSelectedSwatch(s)}
                  className={cn("w-9 h-9 rounded-full border-2 transition-all", selectedSwatch?.color === s.color ? "border-primary scale-110" : "border-border")}
                  style={{ backgroundColor: s.color }} title={s.name} />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <p className="text-sm text-foreground/80 leading-relaxed">{product.description}</p>
          {product.sensorial_description && (
            <div className="bg-card rounded-xl p-4 border border-border">
              <p className="text-xs font-medium text-primary mb-1">✨ Experiência Sensorial</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{product.sensorial_description}</p>
            </div>
          )}
        </div>

        {product.ingredients && (
          <div>
            <p className="text-xs font-medium mb-1">Ingredientes-chave</p>
            <p className="text-xs text-muted-foreground">{product.ingredients}</p>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
            <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-background transition-colors">
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center text-sm font-medium">{qty}</span>
            <button onClick={() => setQty(qty + 1)} className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-background transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={handleAddToCart} disabled={addToCart.isPending || (swatches.length > 0 && !selectedSwatch)}
            className="flex-1 bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90 min-h-[44px]">
            <ShoppingBag className="w-4 h-4 mr-2" />
            {addToCart.isPending ? "Adicionando..." : "Adicionar"}
          </Button>
        </div>

        {/* Reviews Section */}
        <ReviewSection productId={product.id} />
      </motion.div>
    </div>
  );
};

export default Produto;
