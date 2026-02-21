import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useCoupon = () => {
  const validateCoupon = async (code: string, orderTotal: number) => {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code.toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw new Error("Erro ao validar cupom");
    if (!data) throw new Error("Cupom inválido ou expirado");
    if (data.expires_at && new Date(data.expires_at) < new Date()) throw new Error("Cupom expirado");
    if (data.max_uses && data.current_uses >= data.max_uses) throw new Error("Cupom esgotado");
    if (orderTotal < Number(data.min_order_value)) throw new Error(`Pedido mínimo de R$ ${Number(data.min_order_value).toFixed(2).replace(".", ",")}`);

    let discount = 0;
    if (data.discount_type === "percentage") {
      discount = orderTotal * (Number(data.discount_value) / 100);
    } else {
      discount = Number(data.discount_value);
    }

    return { coupon: data, discount: Math.min(discount, orderTotal) };
  };

  return { validateCoupon };
};
