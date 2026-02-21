import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type SavedAddress = {
  id: string; user_id: string; label: string;
  street: string; number: string; complement: string | null;
  neighborhood: string; city: string; state: string; zip: string;
  is_default: boolean; created_at: string;
};

export const useAddresses = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["addresses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_addresses")
        .select("*")
        .eq("user_id", user!.id)
        .order("is_default", { ascending: false });
      if (error) throw error;
      return data as SavedAddress[];
    },
    enabled: !!user,
  });
};

export const useSaveAddress = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (address: Omit<SavedAddress, "id" | "user_id" | "created_at">) => {
      if (!user) throw new Error("Login necessário");
      const { error } = await supabase.from("saved_addresses").insert({ ...address, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      toast.success("Endereço salvo!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
};

export const useDeleteAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_addresses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
      toast.success("Endereço removido");
    },
  });
};
