import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/product/ProductCard";
import { motion } from "framer-motion";

const Favoritos = () => {
  const { user } = useAuth();
  const { favorites, isLoading } = useFavorites();

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center gap-4">
        <Heart className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-display font-bold">Favoritos</h1>
        <p className="text-sm text-muted-foreground">Faça login para ver seus favoritos</p>
        <Button asChild className="bg-gradient-gold text-primary-foreground min-h-[44px]">
          <Link to="/perfil">Entrar</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center gap-4">
        <Heart className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-display font-bold">Sem favoritos</h1>
        <p className="text-sm text-muted-foreground">Explore produtos e toque no ❤️ para salvar</p>
        <Button asChild variant="outline" className="min-h-[44px]">
          <Link to="/explorar">Explorar produtos</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-display font-bold mb-6">Favoritos</h1>
      <motion.div layout className="grid grid-cols-2 gap-3">
        {favorites.map((fav, i) => (
          <ProductCard key={fav.id} product={fav.products} index={i} />
        ))}
      </motion.div>
    </div>
  );
};

export default Favoritos;
