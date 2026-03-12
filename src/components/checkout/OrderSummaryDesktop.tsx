import { ShoppingBag, Tag, Truck, Shield, Lock } from "lucide-react";
import type { PaymentMethod } from "@/hooks/usePayment";

interface OrderSummaryDesktopProps {
  items: any[];
  cartTotal: number;
  cartCount: number;
  appliedCoupon: { code: string; discount: number } | null;
  paymentMethod: PaymentMethod;
  pixDiscount: number;
  subtotalAfterCoupon: number;
  freeShipping: boolean;
  shippingCost: number;
  finalTotal: number;
  shipping: any;
  address?: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zip: string;
  };
}

const OrderSummaryDesktop = ({
  items, cartTotal, cartCount, appliedCoupon, paymentMethod,
  pixDiscount, subtotalAfterCoupon, freeShipping, shippingCost,
  finalTotal, shipping, address,
}: OrderSummaryDesktopProps) => {
  return (
    <div className="hidden lg:block">
      <div className="sticky top-6 space-y-4">
        {/* Order Items */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingBag className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-display font-bold">Resumo do Pedido</h3>
            <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {cartCount} {cartCount === 1 ? "item" : "itens"}
            </span>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {items.map((item) => {
              const product = item.products as any;
              return (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden flex-shrink-0 border border-border">
                    {product?.images?.[0] && (
                      <img src={product.images[0]} alt={product?.name} className="w-full h-full object-contain" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium line-clamp-2 leading-tight">{product?.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Qtd: {item.quantity}</p>
                  </div>
                  <p className="text-xs font-bold text-primary whitespace-nowrap">
                    R$ {(Number(product?.price || 0) * item.quantity).toFixed(2).replace(".", ",")}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Delivery Address (when available) */}
        {address && address.street && (
          <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-display font-bold">Entrega</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {address.street}, {address.number}
              {address.complement && ` - ${address.complement}`}
              <br />
              {address.neighborhood}, {address.city} - {address.state}
              <br />
              CEP: {address.zip}
            </p>
            {shipping.selectedShipping && (
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {shipping.selectedShipping.name} —{" "}
                  {freeShipping ? (
                    <span className="text-accent font-semibold">Frete Grátis</span>
                  ) : (
                    <span className="font-medium">R$ {shippingCost.toFixed(2).replace(".", ",")}</span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Totals */}
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>R$ {cartTotal.toFixed(2).replace(".", ",")}</span>
          </div>
          {appliedCoupon && (
            <div className="flex justify-between text-sm">
              <span className="text-accent flex items-center gap-1">
                <Tag className="w-3 h-3" /> {appliedCoupon.code}
              </span>
              <span className="text-accent">-R$ {appliedCoupon.discount.toFixed(2).replace(".", ",")}</span>
            </div>
          )}
          {paymentMethod === "pix" && pixDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-accent">Desconto PIX (5%)</span>
              <span className="text-accent">-R$ {(subtotalAfterCoupon * pixDiscount).toFixed(2).replace(".", ",")}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Frete</span>
            {shipping.selectedShipping ? (
              freeShipping ? <span className="text-accent font-medium">Grátis</span> :
              shipping.selectedShipping.price !== null ? <span>R$ {shippingCost.toFixed(2).replace(".", ",")}</span> :
              <span className="text-accent">A combinar</span>
            ) : <span className="text-muted-foreground text-xs">—</span>}
          </div>
          <div className="border-t border-border pt-3 flex justify-between items-baseline">
            <span className="font-display font-bold text-base">Total</span>
            <span className="font-bold text-xl text-primary">
              R$ {finalTotal.toFixed(2).replace(".", ",")}
            </span>
          </div>
          {paymentMethod === "pix" && pixDiscount > 0 && (
            <p className="text-[10px] text-accent font-semibold text-center pt-1">💰 Desconto PIX de 5% já aplicado!</p>
          )}
        </div>

        {/* Trust */}
        <div className="bg-muted/50 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span>Compra 100% segura</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-primary" />
            <span>Dados criptografados</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSummaryDesktop;
