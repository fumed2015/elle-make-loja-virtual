import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useInfluencers = () => {
  return useQuery({
    queryKey: ["influencers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("influencers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateInfluencer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (influencer: { user_id: string; name: string; instagram?: string; commission_percent: number }) => {
      const { error } = await supabase.from("influencers").insert(influencer);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["influencers"] });
      toast.success("Influenciadora cadastrada! 🌟");
    },
    onError: (err: Error) => toast.error(err.message),
  });
};

export const useInfluencerCommissions = (influencerId?: string) => {
  return useQuery({
    queryKey: ["influencer-commissions", influencerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("influencer_commissions")
        .select("*")
        .eq("influencer_id", influencerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!influencerId,
  });
};
