import { supabase } from "@/integrations/supabase/client";

export const useCoupon = () => {
  const validateCoupon = async (code: string, orderTotal: number) => {
    const { data, error } = await supabase.rpc("validate_coupon", {
      p_code: code.toUpperCase(),
      p_order_total: orderTotal,
    });

    if (error) throw new Error("Erro ao validar cupom");
    
    const result = data as { valid: boolean; error?: string; code?: string; discount_type?: string; discount_value?: number; min_order_value?: number };
    
    if (!result.valid) throw new Error(result.error || "Cupom inválido");

    let discount = 0;
    if (result.discount_type === "percentage") {
      discount = orderTotal * (Number(result.discount_value) / 100);
    } else {
      discount = Number(result.discount_value);
    }

    return {
      coupon: {
        code: result.code,
        discount_type: result.discount_type,
        discount_value: result.discount_value,
      },
      discount: Math.min(discount, orderTotal),
    };
  };

  return { validateCoupon };
};
