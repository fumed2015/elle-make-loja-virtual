import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { useCallback, useEffect, useMemo } from "react";

// ── Guest cart (localStorage) ──────────────────────────────
const GUEST_CART_KEY = "ellemake_guest_cart";

interface GuestCartItem {
  id: string; // generated locally
  product_id: string;
  quantity: number;
  selected_swatch: any;
  product?: any; // cached product data for display
}

function getGuestCart(): GuestCartItem[] {
  try {
    return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveGuestCart(items: GuestCartItem[]) {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch {}
}

function clearGuestCart() {
  try {
    localStorage.removeItem(GUEST_CART_KEY);
  } catch {}
}

// ── Hook ───────────────────────────────────────────────────
export const useCart = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Sync guest cart → Supabase when user logs in
  useEffect(() => {
    if (!user) return;
    const guestItems = getGuestCart();
    if (guestItems.length === 0) return;

    (async () => {
      for (const item of guestItems) {
        await supabase.from("cart_items").upsert({
          user_id: user.id,
          product_id: item.product_id,
          quantity: item.quantity,
          selected_swatch: item.selected_swatch || null,
        }, { onConflict: "user_id,product_id,selected_swatch" });
      }
      clearGuestCart();
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Carrinho sincronizado! 🛍️");
    })();
  }, [user, queryClient]);

  // ── Server cart (logged-in) ──
  const cartQuery = useQuery({
    queryKey: ["cart", user?.id],
    queryFn: async () => {
      if (!user) {
        // Return guest cart enriched with product data
        const guestItems = getGuestCart();
        if (guestItems.length === 0) return [];
        // Fetch product info for display
        const productIds = guestItems.map((i) => i.product_id);
        const { data: products } = await supabase
          .from("products")
          .select("id, name, slug, price, images, swatches")
          .in("id", productIds);
        return guestItems.map((item) => ({
          ...item,
          products: products?.find((p) => p.id === item.product_id) || null,
        }));
      }
      const { data, error } = await supabase
        .from("cart_items")
        .select("*, products(id, name, slug, price, images, swatches)")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
  });

  // ── Add to cart ──
  const addToCart = useMutation({
    mutationFn: async ({ productId, quantity = 1, swatch }: { productId: string; quantity?: number; swatch?: any }) => {
      if (!user) {
        // Guest mode: save locally
        const items = getGuestCart();
        const existing = items.find(
          (i) => i.product_id === productId && JSON.stringify(i.selected_swatch) === JSON.stringify(swatch || null)
        );
        if (existing) {
          existing.quantity += quantity;
        } else {
          items.push({
            id: `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            product_id: productId,
            quantity,
            selected_swatch: swatch || null,
          });
        }
        saveGuestCart(items);
        return;
      }
      // Check if item already exists to increment quantity
      const { data: existing } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + quantity })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cart_items").insert({
          user_id: user.id,
          product_id: productId,
          quantity,
          selected_swatch: swatch || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      // No toast here — components trigger the drawer instead
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ── Update quantity ──
  const updateQuantity = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      if (quantity <= 0) {
        // Remove item
        if (!user) {
          const items = getGuestCart().filter((i) => i.id !== itemId);
          saveGuestCart(items);
          return;
        }
        const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
        if (error) throw error;
        return;
      }
      if (!user) {
        const items = getGuestCart();
        const item = items.find((i) => i.id === itemId);
        if (item) item.quantity = quantity;
        saveGuestCart(items);
        return;
      }
      const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  // ── Remove from cart ──
  const removeFromCart = useMutation({
    mutationFn: async (itemId: string) => {
      if (!user) {
        const items = getGuestCart().filter((i) => i.id !== itemId);
        saveGuestCart(items);
        return;
      }
      const { error } = await supabase.from("cart_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Removido do carrinho");
    },
  });

  const cartTotal = cartQuery.data?.reduce((sum, item: any) => {
    const price = item.products?.price || 0;
    return sum + price * item.quantity;
  }, 0) || 0;

  const cartCount = cartQuery.data?.reduce((sum, item: any) => sum + item.quantity, 0) || 0;

  return { items: cartQuery.data || [], isLoading: cartQuery.isLoading, isFetching: cartQuery.isFetching, addToCart, updateQuantity, removeFromCart, cartTotal, cartCount };
};
