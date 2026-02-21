import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const useReviews = (productId?: string) => {
  return useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, profiles(full_name)")
        .eq("product_id", productId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });
};

export const useCreateReview = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, rating, comment }: { productId: string; rating: number; comment: string }) => {
      if (!user) throw new Error("Faça login para avaliar");
      const { error } = await supabase.from("reviews").insert({
        user_id: user.id,
        product_id: productId,
        rating,
        comment,
        is_approved: true, // auto-approve for now
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["reviews", vars.productId] });
      toast.success("Avaliação enviada! ⭐");
    },
    onError: (err: Error) => toast.error(err.message),
  });
};
