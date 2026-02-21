import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const useFavorites = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const favoritesQuery = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("favorites")
        .select("*, products(id, name, slug, price, compare_at_price, images, swatches, brand)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const toggleFavorite = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error("Faça login para favoritar");
      // Check if already favorited
      const { data: existing } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("favorites").delete().eq("id", existing.id);
        if (error) throw error;
        return { added: false };
      } else {
        const { error } = await supabase.from("favorites").insert({ user_id: user.id, product_id: productId });
        if (error) throw error;
        return { added: true };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(result.added ? "Adicionado aos favoritos ❤️" : "Removido dos favoritos");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isFavorited = (productId: string) => {
    return favoritesQuery.data?.some((f) => f.product_id === productId) || false;
  };

  return { favorites: favoritesQuery.data || [], isLoading: favoritesQuery.isLoading, toggleFavorite, isFavorited };
};
