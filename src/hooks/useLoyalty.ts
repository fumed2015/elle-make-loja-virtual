import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

const TIER_THRESHOLDS = { bronze: 0, silver: 500, gold: 1500, diamond: 5000 };

export const getTier = (points: number) => {
  if (points >= TIER_THRESHOLDS.diamond) return "diamond";
  if (points >= TIER_THRESHOLDS.gold) return "gold";
  if (points >= TIER_THRESHOLDS.silver) return "silver";
  return "bronze";
};

export const TIER_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  bronze: { label: "Bronze", emoji: "🥉", color: "text-amber-700" },
  silver: { label: "Prata", emoji: "🥈", color: "text-gray-400" },
  gold: { label: "Ouro", emoji: "🥇", color: "text-primary" },
  diamond: { label: "Diamante", emoji: "💎", color: "text-blue-400" },
};

export const useLoyalty = () => {
  const { user } = useAuth();

  const pointsQuery = useQuery({
    queryKey: ["loyalty-points", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_points")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const totalPoints = pointsQuery.data?.reduce((sum, p) => sum + p.points, 0) || 0;
  const tier = getTier(totalPoints);

  return { points: pointsQuery.data, totalPoints, tier, isLoading: pointsQuery.isLoading };
};

export const useAddPoints = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, points, source, referenceId, description }: {
      userId: string; points: number; source: string; referenceId?: string; description?: string;
    }) => {
      const { error } = await supabase.from("loyalty_points").insert({
        user_id: userId, points, source, reference_id: referenceId, description,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["loyalty-points"] }),
  });
};
