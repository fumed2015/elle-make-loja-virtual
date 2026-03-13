import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CollectionSlug = "lancamentos" | "mais-vendidos" | "tendencias" | "ofertas";

export const COLLECTION_LABELS: Record<CollectionSlug, string> = {
  lancamentos: "Lançamentos",
  "mais-vendidos": "Mais Vendidos",
  tendencias: "Tendências",
  ofertas: "Ofertas",
};

export const useCollectionProducts = (slug: CollectionSlug) => {
  return useQuery({
    queryKey: ["collection-products", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_collections")
        .select("*, products(*, categories(name, slug))")
        .eq("collection_slug", slug)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data?.map((pc: any) => ({ ...pc.products, collection_sort: pc.sort_order, collection_id: pc.id })) || [];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useBestSellingProducts = () => {
  return useQuery({
    queryKey: ["best-selling-products"],
    queryFn: async () => {
      // Get orders from last 90 days with confirmed statuses
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data: orders, error } = await supabase
        .from("orders")
        .select("items")
        .in("status", ["approved", "confirmed", "processing", "shipped", "delivered"])
        .gte("created_at", ninetyDaysAgo);
      if (error) throw error;

      // Count product sales
      const salesCount: Record<string, number> = {};
      orders?.forEach((order) => {
        const items = (order.items as any[]) || [];
        items.forEach((item) => {
          if (item.product_id) {
            salesCount[item.product_id] = (salesCount[item.product_id] || 0) + (item.quantity || 1);
          }
        });
      });

      return salesCount;
    },
    staleTime: 1000 * 60 * 10,
  });
};

export const useAllCollections = () => {
  return useQuery({
    queryKey: ["all-collections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_collections")
        .select("*, products(id, name, images, price, slug)")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
};

export const useAddToCollection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ collectionSlug, productId, sortOrder }: { collectionSlug: string; productId: string; sortOrder: number }) => {
      const { error } = await supabase.from("product_collections").upsert(
        { collection_slug: collectionSlug, product_id: productId, sort_order: sortOrder },
        { onConflict: "collection_slug,product_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-collections"] }),
  });
};

export const useRemoveFromCollection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_collections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-collections"] }),
  });
};

export const useUpdateCollectionOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, sortOrder }: { id: string; sortOrder: number }) => {
      const { error } = await supabase.from("product_collections").update({ sort_order: sortOrder }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-collections"] }),
  });
};
