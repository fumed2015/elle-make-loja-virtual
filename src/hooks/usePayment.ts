import { useState, useEffect, useRef, useCallback } from "react";
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

export type PaymentStatus = "pending" | "approved" | "in_process" | "rejected" | "cancelled" | "refunded" | "charged_back" | null;

export const usePayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPixPayment = async (
    amount: number, payer: PayerInfo, externalReference: string
  ): Promise<PixResult | null> => {
    setLoading(true);
    setError(null);
    try {
      if (!payer.email || !payer.cpf) {
        throw new Error("Email e CPF do pagador são obrigatórios");
      }
      const { data, error: fnError } = await supabase.functions.invoke("mercadopago-payment", {
        body: {
          action: "create-pix", amount,
          payer_email: payer.email, payer_cpf: payer.cpf,
          payer_first_name: payer.firstName, payer_last_name: payer.lastName,
          external_reference: externalReference,
        },
      });
      if (fnError) throw new Error(`Erro na função: ${fnError.message}`);
      if (!data) throw new Error("Resposta vazia do servidor");
      if (data?.error) throw new Error(data.error);
      return data as PixResult;
    } catch (err: any) {
      const errMsg = err?.message || "Erro ao gerar PIX";
      setError(errMsg);
      console.error("PIX creation error:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createCardPayment = async (
    amount: number, cardToken: string, installments: number,
    paymentMethodId: string, payer: PayerInfo, externalReference: string, issuerId?: string
  ): Promise<CardResult | null> => {
    setLoading(true);
    setError(null);
    try {
      if (!cardToken) throw new Error("Token do cartão é obrigatório");
      if (!payer.email || !payer.cpf) throw new Error("Email e CPF do pagador são obrigatórios");
      if (installments < 1) throw new Error("Número de parcelas inválido");

      const { data, error: fnError } = await supabase.functions.invoke("mercadopago-payment", {
        body: {
          action: "create-card", amount, token: cardToken, installments,
          payment_method_id: paymentMethodId, issuer_id: issuerId,
          payer_email: payer.email, payer_cpf: payer.cpf,
          payer_first_name: payer.firstName, payer_last_name: payer.lastName,
          external_reference: externalReference,
        },
      });
      if (fnError) throw new Error(`Erro na função: ${fnError.message}`);
      if (!data) throw new Error("Resposta vazia do servidor");
      if (data?.error) throw new Error(data.error);
      return data as CardResult;
    } catch (err: any) {
      const errMsg = err?.message || "Erro ao processar cartão";
      setError(errMsg);
      console.error("Card payment error:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createBoletoPayment = async (
    amount: number, payer: PayerInfo, externalReference: string
  ): Promise<BoletoResult | null> => {
    setLoading(true);
    setError(null);
    try {
      console.log("🟡 Boleto: Starting payment creation", { amount, payer, externalReference });
      if (!payer.email || !payer.cpf) {
        throw new Error("Email e CPF do pagador são obrigatórios");
      }
      const { data, error: fnError } = await supabase.functions.invoke("mercadopago-payment", {
        body: {
          action: "create-boleto", amount,
          payer_email: payer.email, payer_cpf: payer.cpf,
          payer_first_name: payer.firstName, payer_last_name: payer.lastName,
          external_reference: externalReference,
        },
      });
      console.log("🟡 Boleto: Response received", { data, fnError });
      if (fnError) throw new Error(`Erro na função: ${fnError.message}`);
      if (!data) throw new Error("Resposta vazia do servidor");
      if (data?.error) throw new Error(data.error);
      console.log("✅ Boleto: Success", data);
      return data as BoletoResult;
    } catch (err: any) {
      const errMsg = err?.message || "Erro ao gerar boleto";
      setError(errMsg);
      console.error("❌ Boleto creation error:", err);
      console.error("Error details:", JSON.stringify(err, null, 2));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (paymentId: string, orderId?: string) => {
    try {
      if (!paymentId) throw new Error("Payment ID é obrigatório");

      const { data, error: fnError } = await supabase.functions.invoke("mercadopago-payment", {
        body: { action: "get-status", payment_id: paymentId },
      });
      if (fnError) throw new Error(`Erro ao verificar status: ${fnError.message}`);
      if (!data) throw new Error("Resposta vazia do servidor");

      const result = data as { id: string; status: PaymentStatus; status_detail: string } | null;

      // Also update local order status based on payment status
      if (result?.status && orderId) {
        const statusMap: Record<string, string> = {
          approved: "confirmed",
          in_process: "pending",
          pending: "pending",
          rejected: "cancelled",
          cancelled: "cancelled",
        };
        const orderStatus = statusMap[result.status];
        if (orderStatus) {
          const { error: updateErr } = await supabase
            .from("orders")
            .update({ status: orderStatus })
            .eq("id", orderId);
          if (updateErr) {
            console.error("Order status update error:", updateErr);
          }
        }
      }

      return result;
    } catch (err: any) {
      console.error("Payment status check error:", err);
      return null;
    }
  };

  return { loading, error, createPixPayment, createCardPayment, createBoletoPayment, checkPaymentStatus };
};

/**
 * Polls Mercado Pago payment status at intervals.
 * Auto-stops when payment reaches a terminal state.
 */
export const usePaymentStatusPolling = (
  paymentId: string | null,
  intervalMs = 5000,
  orderId?: string | null
) => {
  const [status, setStatus] = useState<PaymentStatus>(null);
  const [statusDetail, setStatusDetail] = useState<string>("");
  const [polling, setPolling] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastStatusRef = useRef<string | null>(null);
  const { checkPaymentStatus } = usePayment();

  const TERMINAL_STATUSES: PaymentStatus[] = ["approved", "rejected", "cancelled", "refunded", "charged_back"];

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPolling(false);
  }, []);

  const poll = useCallback(async () => {
    if (!paymentId) return;
    const result = await checkPaymentStatus(paymentId, orderId || undefined);
    if (!result) return;

    if (result.status !== lastStatusRef.current) {
      lastStatusRef.current = result.status;
      setStatus(result.status);
      setStatusDetail(result.status_detail || "");
    }

    if (result.status && TERMINAL_STATUSES.includes(result.status)) {
      stopPolling();
    }
  }, [paymentId, orderId, checkPaymentStatus, stopPolling]);

  useEffect(() => {
    if (!paymentId) {
      stopPolling();
      return;
    }

    setPolling(true);
    lastStatusRef.current = null;

    poll();
    timerRef.current = setInterval(poll, intervalMs);

    return () => stopPolling();
  }, [paymentId, intervalMs]);

  return { status, statusDetail, polling, stopPolling };
};
