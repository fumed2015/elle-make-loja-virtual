import { Tag, X, MapPin, CreditCard, QrCode, Barcode, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import ShippingCalculator from "@/components/shipping/ShippingCalculator";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import CardPaymentForm from "@/components/payment/CardPaymentForm";
import OrderBump from "@/components/checkout/OrderBump";
import TrustBadges from "@/components/checkout/TrustBadges";
import type { PaymentMethod } from "@/hooks/usePayment";

interface ReviewStepProps {
  items: any[];
  cartTotal: number;
  cartCount: number;
  appliedCoupon: { code: string; discount: number } | null;
  setAppliedCoupon: (v: any) => void;
  couponCode: string;
  setCouponCode: (v: string) => void;
  couponLoading: boolean;
  handleApplyCoupon: () => void;
  address: { street: string; number: string; complement: string; neighborhood: string; city: string; state: string; zip: string };
  shipping: any;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (v: PaymentMethod) => void;
  pixDiscount: number;
  subtotalAfterCoupon: number;
  freeShipping: boolean;
  shippingCost: number;
  finalTotal: number;
  submitting: boolean;
  paymentLoading: boolean;
  handlePlaceOrder: () => void;
  onCardTokenized: (data: { token: string; paymentMethodId: string; installments: number; issuerId: string }) => void;
  customerCpf: string;
}

const ReviewStep = ({
  items, cartTotal, cartCount, appliedCoupon, setAppliedCoupon,
  couponCode, setCouponCode, couponLoading, handleApplyCoupon,
  address, shipping, paymentMethod, setPaymentMethod,
  pixDiscount, subtotalAfterCoupon, freeShipping, shippingCost,
  finalTotal, submitting, paymentLoading, handlePlaceOrder,
  onCardTokenized, customerCpf,
}: ReviewStepProps) => {
  return (
    <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
      {/* Items */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <h3 className="text-sm font-medium">Itens ({cartCount})</h3>
        {items.map((item) => {
          const product = item.products as any;
          return (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                {product?.images?.[0] && <img src={product.images[0]} alt="" className="w-full h-full object-contain" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium line-clamp-1">{product?.name}</p>
                <p className="text-[10px] text-muted-foreground">Qtd: {item.quantity}</p>
              </div>
              <p className="text-xs font-bold text-primary">R$ {(Number(product?.price || 0) * item.quantity).toFixed(2).replace(".", ",")}</p>
            </div>
          );
        })}
      </div>

      {/* Coupon */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center gap-2 mb-2">
          <Tag className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">Cupom de Desconto</h3>
        </div>
        {appliedCoupon ? (
          <div className="flex items-center justify-between bg-accent/10 rounded-lg px-3 py-2">
            <div>
              <p className="text-xs font-bold text-accent">{appliedCoupon.code}</p>
              <p className="text-[10px] text-muted-foreground">-R$ {appliedCoupon.discount.toFixed(2).replace(".", ",")}</p>
            </div>
            <button onClick={() => setAppliedCoupon(null)} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="CODIGO" className="bg-muted border-none min-h-[36px] text-xs uppercase" />
            <Button size="sm" variant="outline" onClick={handleApplyCoupon} disabled={couponLoading} className="text-xs">
              {couponLoading ? "..." : "Aplicar"}
            </Button>
          </div>
        )}
      </div>

      {/* Shipping */}
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center gap-2 mb-2"><MapPin className="w-4 h-4 text-primary" /><h3 className="text-sm font-medium">Entrega</h3></div>
        <p className="text-xs text-muted-foreground mb-3">{address.street}, {address.number} {address.complement && `- ${address.complement}`}<br />{address.neighborhood}, {address.city} - {address.state}<br />CEP: {address.zip}</p>
        <ShippingCalculator
          cep={shipping.cep || address.zip} onCepChange={shipping.setCep}
          onCalculate={shipping.calculateShipping} loading={shipping.loading}
          error={shipping.error} options={shipping.options}
          selectedOption={shipping.selectedOption} onSelectOption={shipping.selectOption}
          isLocal={shipping.isLocal} addressInfo={shipping.addressInfo} compact
        />
      </div>

      {/* Payment method */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">Forma de Pagamento</h3>
        </div>
        <div className="space-y-2">
          {([
            { method: "pix" as PaymentMethod, icon: QrCode, label: "PIX", desc: "Aprovação instantânea • 5% de desconto" },
            { method: "card" as PaymentMethod, icon: CreditCard, label: "Cartão de Crédito", desc: "Até 3x sem juros • Acima com juros" },
            { method: "boleto" as PaymentMethod, icon: Barcode, label: "Boleto Bancário", desc: "Prazo de 1-3 dias úteis para compensar" },
            { method: "whatsapp" as PaymentMethod, icon: WhatsAppIcon, label: "WhatsApp", desc: "Combine o pagamento com a loja" },
          ] as { method: PaymentMethod; icon: any; label: string; desc: string }[]).map(({ method, icon: Icon, label, desc }) => {
            const isWhatsApp = method === "whatsapp";
            return (
              <button key={method} onClick={() => setPaymentMethod(method)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                  paymentMethod === method
                    ? isWhatsApp ? "border-accent bg-accent/5" : "border-primary bg-primary/5"
                    : "border-border"
                }`}>
                <Icon className={isWhatsApp ? "w-5 h-5 text-accent" : "w-5 h-5 text-primary"} />
                <div className="text-left flex-1">
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-[10px] text-muted-foreground">{desc}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === method
                    ? isWhatsApp ? "border-accent" : "border-primary"
                    : "border-muted-foreground"
                }`}>
                  {paymentMethod === method && <div className={`w-2 h-2 rounded-full ${isWhatsApp ? "bg-accent" : "bg-primary"}`} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Inline Card Form */}
        <AnimatePresence>
          {paymentMethod === "card" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <CardPaymentForm
                amount={finalTotal}
                cpf={customerCpf}
                onCancel={() => setPaymentMethod("pix")}
                loading={paymentLoading || submitting}
                inline
                onTokenized={onCardTokenized}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Totals */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-2">
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>R$ {cartTotal.toFixed(2).replace(".", ",")}</span></div>
        {appliedCoupon && (
          <div className="flex justify-between text-sm"><span className="text-accent">Cupom {appliedCoupon.code}</span><span className="text-accent">-R$ {appliedCoupon.discount.toFixed(2).replace(".", ",")}</span></div>
        )}
        {paymentMethod === "pix" && pixDiscount > 0 && (
          <div className="flex justify-between text-sm"><span className="text-accent">Desconto PIX (5%)</span><span className="text-accent">-R$ {(subtotalAfterCoupon * pixDiscount).toFixed(2).replace(".", ",")}</span></div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Frete</span>
          {shipping.selectedShipping ? (
            freeShipping ? <span className="text-accent font-medium">Grátis</span> :
            shipping.selectedShipping.price !== null ? <span>R$ {shipping.selectedShipping.price.toFixed(2).replace(".", ",")}</span> :
            <span className="text-accent">A combinar</span>
          ) : <span className="text-muted-foreground text-xs">Calcule acima</span>}
        </div>
        <div className="border-t border-border pt-2 flex justify-between">
          <span className="font-display font-bold">Total</span>
          <span className="font-bold text-lg text-primary">R$ {finalTotal.toFixed(2).replace(".", ",")}</span>
        </div>
        {paymentMethod === "pix" && pixDiscount > 0 && (
          <p className="text-[10px] text-accent font-semibold text-center">💰 Desconto PIX de 5% já aplicado!</p>
        )}
      </div>

      {/* Order Bump */}
      <OrderBump cartProductIds={items.map((item: any) => (item.products as any)?.id).filter(Boolean)} />

      {/* Trust Badges */}
      <TrustBadges />

      {paymentMethod !== "card" && (
        <Button onClick={handlePlaceOrder} disabled={submitting} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 min-h-[48px] font-semibold shadow-marsala">
          {submitting ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando...</>
          ) : paymentMethod === "whatsapp" ? (
            <><WhatsAppIcon className="w-5 h-5 mr-2" /> Enviar Pedido pelo WhatsApp</>
          ) : paymentMethod === "pix" ? (
            <>💰 Pagar com PIX (5% OFF)</>
          ) : (
            <><Barcode className="w-5 h-5 mr-2" /> Gerar Boleto</>
          )}
        </Button>
      )}
    </motion.div>
  );
};

export default ReviewStep;
