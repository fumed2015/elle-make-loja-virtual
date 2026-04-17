import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fuzzyFilter } from "@/lib/fuzzy-search";

export const useProducts = (options?: { featured?: boolean; categorySlug?: string; search?: string }) => {
  return useQuery({
    queryKey: ["products", options],
    queryFn: async () => {
      let query = supabase.from("products").select("*, categories(name, slug)");

      if (options?.featured) query = query.eq("is_featured", true);
      if (options?.categorySlug) {
        const { data: cat } = await supabase.from("categories").select("id").eq("slug", options.categorySlug).single();
        if (cat) query = query.eq("category_id", cat.id);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;

      // Apply fuzzy search client-side for typo tolerance
      if (options?.search && data) {
        return fuzzyFilter(data, options.search, 0.25);
      }

      return data;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
};

export const useProduct = (slug: string) => {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name, slug)")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 10, // 10 min cache — categories rarely change
    gcTime: 1000 * 60 * 30,
  });
};

// Unified query: fetches all products once, used by Index to derive featured + offers + more
// Slim payload: only fields needed for cards/listings (no description/ingredients/how_to_use/swatches)
export const useAllProductsUnified = () => {
  return useQuery({
    queryKey: ["products-unified"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, price, compare_at_price, images, brand, stock, is_featured, is_active, category_id, tags, created_at, categories(name, slug)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
};
