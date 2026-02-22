import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PaymentMethod = "pix" | "card" | "boleto" | "whatsapp";

interface PayerInfo {
  email: string;
  cpf: string;
  firstName: string;
  lastName: string;
}

interface PixResult {
  id: string;
  status: string;
  qr_code: string;
  qr_code_base64: string;
  ticket_url?: string;
}

interface CardResult {
  id: string;
  status: string;
  status_detail: string;
}

interface BoletoResult {
  id: string;
  status: string;
  barcode: string;
  boleto_url: string;
}

export const usePayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPixPayment = async (
    amount: number,
    payer: PayerInfo,
    externalReference: string
  ): Promise<PixResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("mercadopago-payment", {
        body: {
          action: "create-pix",
          amount,
          payer_email: payer.email,
          payer_cpf: payer.cpf,
          payer_first_name: payer.firstName,
          payer_last_name: payer.lastName,
          external_reference: externalReference,
        },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      return data as PixResult;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createCardPayment = async (
    amount: number,
    cardToken: string,
    installments: number,
    paymentMethodId: string,
    payer: PayerInfo,
    externalReference: string,
    issuerId?: string
  ): Promise<CardResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("mercadopago-payment", {
        body: {
          action: "create-card",
          amount,
          token: cardToken,
          installments,
          payment_method_id: paymentMethodId,
          issuer_id: issuerId,
          payer_email: payer.email,
          payer_cpf: payer.cpf,
          payer_first_name: payer.firstName,
          payer_last_name: payer.lastName,
          external_reference: externalReference,
        },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      return data as CardResult;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createBoletoPayment = async (
    amount: number,
    payer: PayerInfo,
    externalReference: string
  ): Promise<BoletoResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("mercadopago-payment", {
        body: {
          action: "create-boleto",
          amount,
          payer_email: payer.email,
          payer_cpf: payer.cpf,
          payer_first_name: payer.firstName,
          payer_last_name: payer.lastName,
          external_reference: externalReference,
        },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      return data as BoletoResult;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (paymentId: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke("mercadopago-payment", {
        body: { action: "get-status", payment_id: paymentId },
      });
      if (fnError) throw fnError;
      return data;
    } catch {
      return null;
    }
  };

  return {
    loading,
    error,
    createPixPayment,
    createCardPayment,
    createBoletoPayment,
    checkPaymentStatus,
  };
};
