import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const useCart = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const cartQuery = useQuery({
    queryKey: ["cart", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("cart_items")
        .select("*, products(id, name, slug, price, images, swatches)")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addToCart = useMutation({
    mutationFn: async ({ productId, quantity = 1, swatch }: { productId: string; quantity?: number; swatch?: any }) => {
      if (!user) throw new Error("Faça login para adicionar ao carrinho");
      const { error } = await supabase.from("cart_items").upsert({
        user_id: user.id,
        product_id: productId,
        quantity,
        selected_swatch: swatch || null,
      }, { onConflict: "user_id,product_id,selected_swatch" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Adicionado ao carrinho! 🛍️");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeFromCart = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Removido do carrinho");
    },
  });

  const cartTotal = cartQuery.data?.reduce((sum, item) => {
    const price = (item.products as any)?.price || 0;
    return sum + price * item.quantity;
  }, 0) || 0;

  const cartCount = cartQuery.data?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return { items: cartQuery.data || [], isLoading: cartQuery.isLoading, addToCart, removeFromCart, cartTotal, cartCount };
};
