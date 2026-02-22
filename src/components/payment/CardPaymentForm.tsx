import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface CardPaymentFormProps {
  amount: number;
  onTokenized: (data: {
    token: string;
    paymentMethodId: string;
    installments: number;
    issuerId?: string;
  }) => void;
  onCancel: () => void;
  loading?: boolean;
}

const CardPaymentForm = ({ amount, onTokenized, onCancel, loading }: CardPaymentFormProps) => {
  const [sdkReady, setSdkReady] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [expMonth, setExpMonth] = useState("");
  const [expYear, setExpYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [installments, setInstallments] = useState(1);
  const [installmentOptions, setInstallmentOptions] = useState<any[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [issuerId, setIssuerId] = useState("");
  const [tokenizing, setTokenizing] = useState(false);
  const [cardBrand, setCardBrand] = useState("");
  const mpRef = useRef<any>(null);

  // Fetch public key
  useEffect(() => {
    supabase.functions.invoke("mercadopago-payment", {
      body: { action: "get-public-key" },
    }).then(({ data, error }) => {
      if (error || data?.error) {
        toast.error("Erro ao carregar configuração de pagamento");
        return;
      }
      setPublicKey(data.public_key);
    });
  }, []);

  // Load MercadoPago SDK script
  useEffect(() => {
    if (!publicKey) return;
    if (window.MercadoPago) {
      mpRef.current = new window.MercadoPago(publicKey, { locale: "pt-BR" });
      setSdkReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => {
      mpRef.current = new window.MercadoPago(publicKey, { locale: "pt-BR" });
      setSdkReady(true);
    };
    script.onerror = () => toast.error("Erro ao carregar SDK de pagamento");
    document.body.appendChild(script);
    return () => {
      // Don't remove script on unmount to avoid reloading
    };
  }, [publicKey]);

  // Identify card brand when 6+ digits typed
  const identifyCard = useCallback(async (bin: string) => {
    if (!mpRef.current || bin.length < 6) {
      setCardBrand("");
      setPaymentMethodId("");
      setInstallmentOptions([]);
      return;
    }
    try {
      const paymentMethods = await mpRef.current.getPaymentMethods({ bin });
      if (paymentMethods.results?.length > 0) {
        const pm = paymentMethods.results[0];
        setPaymentMethodId(pm.id);
        setCardBrand(pm.name);
        setIssuerId(pm.issuer?.id || "");

        // Get installments
        const installmentResult = await mpRef.current.getInstallments({
          amount: String(amount),
          bin,
        });
        if (installmentResult?.length > 0) {
          setInstallmentOptions(installmentResult[0].payer_costs || []);
        }
      }
    } catch (err) {
      console.error("Card identification error:", err);
    }
  }, [amount]);

  useEffect(() => {
    const clean = cardNumber.replace(/\D/g, "");
    if (clean.length >= 6) {
      identifyCard(clean.slice(0, 6));
    } else {
      setCardBrand("");
      setPaymentMethodId("");
    }
  }, [cardNumber, identifyCard]);

  const handleSubmit = async () => {
    if (!mpRef.current) return;
    const cleanCard = cardNumber.replace(/\D/g, "");
    if (cleanCard.length < 13 || !cardHolder || !expMonth || !expYear || cvv.length < 3) {
      toast.error("Preencha todos os dados do cartão");
      return;
    }

    setTokenizing(true);
    try {
      const tokenData = await mpRef.current.createCardToken({
        cardNumber: cleanCard,
        cardholderName: cardHolder,
        cardExpirationMonth: expMonth,
        cardExpirationYear: expYear.length === 2 ? `20${expYear}` : expYear,
        securityCode: cvv,
        identificationType: "CPF",
        identificationNumber: "", // Will be filled from payer info
      });

      if (tokenData.error) {
        throw new Error(tokenData.error);
      }

      onTokenized({
        token: tokenData.id,
        paymentMethodId,
        installments,
        issuerId: issuerId || undefined,
      });
    } catch (err: any) {
      console.error("Tokenization error:", err);
      toast.error(err.message || "Erro ao processar cartão. Verifique os dados.");
    } finally {
      setTokenizing(false);
    }
  };

  // Format card number with spaces
  const formatCardNumber = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 16);
    return clean.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  if (!sdkReady) {
    return (
      <div className="bg-card rounded-xl p-6 border border-border text-center space-y-3">
        <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
        <p className="text-xs text-muted-foreground">Carregando formulário de pagamento...</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-5 border border-border space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-semibold">Dados do Cartão</h3>
        {cardBrand && (
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
            {cardBrand}
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Número do Cartão</Label>
          <Input
            value={formatCardNumber(cardNumber)}
            onChange={(e) => setCardNumber(e.target.value)}
            placeholder="0000 0000 0000 0000"
            className="bg-muted border-none min-h-[44px] font-mono tracking-wider"
            inputMode="numeric"
            maxLength={19}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Nome no Cartão</Label>
          <Input
            value={cardHolder}
            onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
            placeholder="NOME COMO NO CARTÃO"
            className="bg-muted border-none min-h-[44px] uppercase"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Mês</Label>
            <Input
              value={expMonth}
              onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="MM"
              className="bg-muted border-none min-h-[44px] text-center"
              inputMode="numeric"
              maxLength={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Ano</Label>
            <Input
              value={expYear}
              onChange={(e) => setExpYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="AAAA"
              className="bg-muted border-none min-h-[44px] text-center"
              inputMode="numeric"
              maxLength={4}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">CVV</Label>
            <Input
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="•••"
              className="bg-muted border-none min-h-[44px] text-center"
              inputMode="numeric"
              maxLength={4}
              type="password"
            />
          </div>
        </div>

        {installmentOptions.length > 1 && (
          <div className="space-y-1.5">
            <Label className="text-xs">Parcelas</Label>
            <select
              value={installments}
              onChange={(e) => setInstallments(Number(e.target.value))}
              className="w-full bg-muted rounded-md min-h-[44px] px-3 text-sm border-none outline-none"
            >
              {installmentOptions.map((opt: any) => (
                <option key={opt.installments} value={opt.installments}>
                  {opt.installments}x de R$ {opt.installment_amount.toFixed(2).replace(".", ",")}
                  {opt.installments > 1 && opt.installment_rate === 0 ? " sem juros" : ""}
                  {opt.installments > 1 && opt.installment_rate > 0 ? ` (${opt.installment_rate}%)` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Lock className="w-3 h-3" />
        <span>Seus dados são criptografados e processados com segurança pelo Mercado Pago</span>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1 min-h-[44px]" disabled={tokenizing || loading}>
          Voltar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={tokenizing || loading || !paymentMethodId}
          className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px] font-semibold"
        >
          {tokenizing || loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</>
          ) : (
            <>Pagar R$ {amount.toFixed(2).replace(".", ",")}</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CardPaymentForm;
