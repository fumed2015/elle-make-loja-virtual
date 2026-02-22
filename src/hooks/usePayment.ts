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
      const { data, error: fnError } = await supabase.functions.invoke("mercadopago-payment", {
        body: {
          action: "create-pix", amount,
          payer_email: payer.email, payer_cpf: payer.cpf,
          payer_first_name: payer.firstName, payer_last_name: payer.lastName,
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
    amount: number, cardToken: string, installments: number,
    paymentMethodId: string, payer: PayerInfo, externalReference: string, issuerId?: string
  ): Promise<CardResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("mercadopago-payment", {
        body: {
          action: "create-card", amount, token: cardToken, installments,
          payment_method_id: paymentMethodId, issuer_id: issuerId,
          payer_email: payer.email, payer_cpf: payer.cpf,
          payer_first_name: payer.firstName, payer_last_name: payer.lastName,
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
    amount: number, payer: PayerInfo, externalReference: string
  ): Promise<BoletoResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("mercadopago-payment", {
        body: {
          action: "create-boleto", amount,
          payer_email: payer.email, payer_cpf: payer.cpf,
          payer_first_name: payer.firstName, payer_last_name: payer.lastName,
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
      return data as { id: string; status: PaymentStatus; status_detail: string } | null;
    } catch {
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
  intervalMs = 5000
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
    const result = await checkPaymentStatus(paymentId);
    if (!result) return;

    // Deduplicate: only update if status actually changed
    if (result.status !== lastStatusRef.current) {
      lastStatusRef.current = result.status;
      setStatus(result.status);
      setStatusDetail(result.status_detail || "");
    }

    // Stop polling on terminal status
    if (result.status && TERMINAL_STATUSES.includes(result.status)) {
      stopPolling();
    }
  }, [paymentId, checkPaymentStatus, stopPolling]);

  useEffect(() => {
    if (!paymentId) {
      stopPolling();
      return;
    }

    setPolling(true);
    lastStatusRef.current = null;

    // Immediate first check
    poll();

    // Then poll at interval
    timerRef.current = setInterval(poll, intervalMs);

    return () => stopPolling();
  }, [paymentId, intervalMs]);

  return { status, statusDetail, polling, stopPolling };
};
