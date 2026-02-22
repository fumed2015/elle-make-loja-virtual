import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const useReviews = (productId?: string) => {
  return useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      // Fetch reviews
      const { data: reviews, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch profile names for review authors
      const userIds = [...new Set((reviews || []).map(r => r.user_id))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        if (profiles) {
          profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name || "Anônimo"]));
        }
      }

      return (reviews || []).map(r => ({
        ...r,
        profiles: { full_name: profileMap[r.user_id] || "Anônimo" },
      }));
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
