import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      if (options?.search) {
        query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%,ingredients.ilike.%${options.search}%,tags.cs.{${options.search}}`);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
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
  });
};
