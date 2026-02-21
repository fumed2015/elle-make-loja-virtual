import { useQuery } from "@tanstack/react-query";
import { storefrontApiRequest, PRODUCTS_QUERY, PRODUCT_BY_HANDLE_QUERY, ShopifyProduct } from "@/lib/shopify";

export const useShopifyProducts = (first = 50, searchQuery?: string) => {
  return useQuery({
    queryKey: ["shopify-products", first, searchQuery],
    queryFn: async () => {
      const data = await storefrontApiRequest(PRODUCTS_QUERY, { first, query: searchQuery || null });
      return (data?.data?.products?.edges || []) as ShopifyProduct[];
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useShopifyProduct = (handle: string) => {
  return useQuery({
    queryKey: ["shopify-product", handle],
    queryFn: async () => {
      const data = await storefrontApiRequest(PRODUCT_BY_HANDLE_QUERY, { handle });
      return data?.data?.productByHandle || null;
    },
    enabled: !!handle,
    staleTime: 1000 * 60 * 5,
  });
};
