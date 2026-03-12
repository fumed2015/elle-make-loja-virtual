import { QrCode, Barcode, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import type { PaymentStatus } from "@/hooks/usePayment";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: "Aguardando pagamento", color: "bg-amber-100 text-amber-800 border-amber-200", icon: "⏳" },
  approved: { label: "Pagamento aprovado", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: "✅" },
  in_process: { label: "Em análise", color: "bg-blue-100 text-blue-800 border-blue-200", icon: "🔍" },
  rejected: { label: "Pagamento recusado", color: "bg-red-100 text-red-800 border-red-200", icon: "❌" },
  cancelled: { label: "Cancelado", color: "bg-muted text-muted-foreground border-border", icon: "🚫" },
  refunded: { label: "Reembolsado", color: "bg-muted text-muted-foreground border-border", icon: "💸" },
};

interface PaymentStepProps {
  pixData: { qr_code: string; qr_code_base64: string } | null;
  boletoData: { barcode: string; boleto_url: string } | null;
  paymentId: string | null;
  paymentStatus: PaymentStatus;
  paymentStatusDetail: string;
  isPolling: boolean;
  copied: boolean;
  copyToClipboard: (text: string) => void;
  onDone: () => void;
}

const PaymentStatusBadge = ({ status, polling, detail }: { status: PaymentStatus; polling: boolean; detail: string }) => {
  if (!status) return null;
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-between rounded-xl px-4 py-3 border ${config.color}`}>
      <div className="flex items-center gap-2">
        <span className="text-base">{config.icon}</span>
        <div>
          <p className="text-xs font-semibold">{config.label}</p>
          {/* status_detail omitted – raw API codes are not user-friendly */}
        </div>
      </div>
      {polling && <Loader2 className="w-4 h-4 animate-spin opacity-50" />}
    </motion.div>
  );
};

const PaymentStep = ({
  pixData, boletoData, paymentId, paymentStatus, paymentStatusDetail,
  isPolling, copied, copyToClipboard, onDone,
}: PaymentStepProps) => {
  return (
    <motion.div key="payment" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
      {paymentId && (
        <PaymentStatusBadge status={paymentStatus} polling={isPolling} detail={paymentStatusDetail} />
      )}

      {pixData && (
        <div className="bg-card rounded-xl p-6 border border-border text-center space-y-4">
          <QrCode className="w-10 h-10 text-primary mx-auto" />
          <h2 className="text-lg font-display font-bold">Pague com PIX</h2>
          <p className="text-xs text-muted-foreground">Escaneie o QR Code ou copie o código abaixo</p>
          {pixData.qr_code_base64 && (
            <div className="flex justify-center">
              <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code PIX" className="w-48 h-48 rounded-lg" />
            </div>
          )}
          {pixData.qr_code && (
            <div className="space-y-2">
              <div className="bg-muted rounded-lg p-3 text-xs break-all font-mono max-h-24 overflow-y-auto">
                {pixData.qr_code}
              </div>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(pixData.qr_code)} className="gap-2 text-xs">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copiado!" : "Copiar código PIX"}
              </Button>
            </div>
          )}
          <div className="pt-2">
            <p className="text-[10px] text-muted-foreground">
              {isPolling ? "Aguardando confirmação do pagamento..." : "Após o pagamento, o pedido será confirmado automaticamente."}
            </p>
            {isPolling && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[10px] text-amber-600 font-medium">Verificando pagamento a cada 5s</span>
              </div>
            )}
            <Button onClick={onDone} className="mt-3 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md min-h-[44px] px-6">
              ✅ Já realizei o pagamento →
            </Button>
          </div>
        </div>
      )}

      {boletoData && (
        <div className="bg-card rounded-xl p-6 border border-border text-center space-y-4">
          <Barcode className="w-10 h-10 text-primary mx-auto" />
          <h2 className="text-lg font-display font-bold">Boleto Gerado</h2>
          <p className="text-xs text-muted-foreground">Copie o código de barras ou abra o boleto</p>
          {boletoData.barcode && (
            <div className="space-y-2">
              <div className="bg-muted rounded-lg p-3 text-xs break-all font-mono">
                {boletoData.barcode}
              </div>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(boletoData.barcode)} className="gap-2 text-xs">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copiado!" : "Copiar código de barras"}
              </Button>
            </div>
          )}
          {boletoData.boleto_url && (
            <Button onClick={() => window.open(boletoData.boleto_url, "_blank")} className="gap-2 w-full min-h-[44px]">
              <Barcode className="w-4 h-4" />
              Abrir Boleto
            </Button>
          )}
          <Button onClick={onDone} className="text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md min-h-[44px] px-6">
            ✅ Já realizei o pagamento →
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default PaymentStep;
