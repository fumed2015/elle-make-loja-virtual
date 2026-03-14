import { useState } from "react";
import { Package, Clock, CheckCircle, Truck, XCircle, MapPin, ExternalLink, ArrowLeft, ChevronRight, Copy, Phone, ShoppingBag, CreditCard, CalendarDays, Hash } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";

const statusConfig: Record<string, { label: string; icon: any; color: string; bgColor: string; step: number }> = {
  pending:    { label: "Pendente",    icon: Clock,       color: "text-yellow-500",        bgColor: "bg-yellow-500/10",  step: 0 },
  approved:   { label: "Pago",        icon: CheckCircle, color: "text-accent",            bgColor: "bg-accent/10",      step: 1 },
  confirmed:  { label: "Confirmado",  icon: CheckCircle, color: "text-accent",            bgColor: "bg-accent/10",      step: 1 },
  processing: { label: "Preparando",  icon: Package,     color: "text-blue-400",          bgColor: "bg-blue-400/10",    step: 2 },
  preparing:  { label: "Preparando",  icon: Package,     color: "text-blue-400",          bgColor: "bg-blue-400/10",    step: 2 },
  shipped:    { label: "Enviado",     icon: Truck,       color: "text-purple-400",        bgColor: "bg-purple-400/10",  step: 3 },
  delivered:  { label: "Entregue",    icon: CheckCircle, color: "text-green-500",         bgColor: "bg-green-500/10",   step: 4 },
  cancelled:  { label: "Cancelado",   icon: XCircle,     color: "text-destructive",       bgColor: "bg-destructive/10", step: -1 },
  refunded:   { label: "Reembolsado", icon: XCircle,     color: "text-muted-foreground",  bgColor: "bg-muted",          step: -1 },
};

const TIMELINE_STEPS = [
  { key: "pending",    label: "Pedido Recebido",   icon: ShoppingBag,  description: "Seu pedido foi registrado" },
  { key: "approved",   label: "Pagamento Aprovado", icon: CreditCard,   description: "Pagamento confirmado" },
  { key: "processing", label: "Em Preparação",      icon: Package,      description: "Estamos preparando seu pedido" },
  { key: "shipped",    label: "Enviado",            icon: Truck,        description: "Pedido a caminho" },
  { key: "delivered",  label: "Entregue",           icon: CheckCircle,  description: "Pedido entregue com sucesso" },
];

function getStepIndex(status: string): number {
  const map: Record<string, number> = {
    pending: 0, approved: 1, confirmed: 1, processing: 2, preparing: 2, shipped: 3, delivered: 4,
  };
  return map[status] ?? -1;
}

const PAYMENT_LABELS: Record<string, string> = {
  pix: "Pix", credit_card: "Cartão de Crédito", debit_card: "Cartão de Débito",
  whatsapp: "WhatsApp", boleto: "Boleto", card: "Cartão de Crédito",
};

// ── Order Detail View ──
const OrderDetail = ({ order, onBack }: { order: any; onBack: () => void }) => {
  const status = statusConfig[order.status] || statusConfig.pending;
  const items = (order.items as any[]) || [];
  const address = order.shipping_address as any;
  const trackingCode = order.tracking_code;
  const trackingUrl = order.tracking_url;
  const currentStep = getStepIndex(order.status);
  const isCancelled = order.status === "cancelled" || order.status === "refunded";

  const copyTracking = () => {
    if (trackingCode) {
      navigator.clipboard.writeText(trackingCode);
      toast.success("Código copiado!");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-xl bg-card border border-border hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-display font-bold">Pedido #{order.id.slice(0, 8)}</h2>
          <p className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <Badge className={`${status.bgColor} ${status.color} border-0 font-semibold`}>
          <status.icon className="w-3 h-3 mr-1" />{status.label}
        </Badge>
      </div>

      {/* Timeline Tracker */}
      {!isCancelled && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-5 flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />Rastreamento do Pedido
          </h3>
          <div className="relative">
            {TIMELINE_STEPS.map((step, i) => {
              const isCompleted = currentStep >= i;
              const isCurrent = currentStep === i;
              const StepIcon = step.icon;

              return (
                <div key={step.key} className="flex items-start gap-4 relative">
                  {/* Vertical line */}
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div className={`absolute left-[17px] top-[36px] w-[2px] h-[calc(100%-4px)] transition-colors duration-500 ${
                      isCompleted && currentStep > i ? "bg-accent" : "bg-border"
                    }`} />
                  )}
                  {/* Icon circle */}
                  <div className={`relative z-10 flex-shrink-0 w-[36px] h-[36px] rounded-full flex items-center justify-center transition-all duration-500 ${
                    isCurrent
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/20"
                      : isCompleted
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}>
                    <StepIcon className="w-4 h-4" />
                    {isCurrent && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full animate-ping opacity-50" />
                    )}
                  </div>
                  {/* Text */}
                  <div className={`pb-7 ${i === TIMELINE_STEPS.length - 1 ? "pb-0" : ""}`}>
                    <p className={`text-sm font-semibold transition-colors ${
                      isCurrent ? "text-foreground" : isCompleted ? "text-foreground" : "text-muted-foreground"
                    }`}>{step.label}</p>
                    <p className={`text-xs ${isCurrent ? "text-muted-foreground" : isCompleted ? "text-muted-foreground/70" : "text-muted-foreground/50"}`}>
                      {step.description}
                    </p>
                    {isCurrent && order.status === "shipped" && order.estimated_delivery && (
                      <p className="text-xs text-primary mt-1 font-medium">
                        Previsão: {new Date(order.estimated_delivery).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancelled state */}
      {isCancelled && (
        <div className="bg-destructive/5 rounded-2xl border border-destructive/20 p-5 text-center space-y-2">
          <XCircle className="w-10 h-10 text-destructive mx-auto" />
          <p className="text-sm font-semibold text-destructive">
            {order.status === "cancelled" ? "Pedido Cancelado" : "Pedido Reembolsado"}
          </p>
          <p className="text-xs text-muted-foreground">
            Entre em contato conosco se precisar de ajuda.
          </p>
        </div>
      )}

      {/* Tracking Code Card */}
      {trackingCode && (
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Hash className="w-4 h-4 text-primary" />Código de Rastreio
          </h3>
          <div className="bg-muted rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="font-mono text-sm font-bold tracking-wider">{trackingCode}</span>
            <button onClick={copyTracking} className="p-2 rounded-lg hover:bg-card transition-colors">
              <Copy className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          {trackingUrl && (
            <a href={trackingUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors">
              <ExternalLink className="w-4 h-4" />Rastrear no site da transportadora
            </a>
          )}
        </div>
      )}

      {/* Items */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-primary" />Itens do Pedido
        </h3>
        <div className="space-y-2">
          {items.map((item: any, j: number) => (
            <div key={j} className="flex items-center gap-3 p-2 rounded-xl bg-muted/50">
              <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-contain" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground">{item.quantity || 1}x</p>
              </div>
              <p className="text-xs font-bold text-primary whitespace-nowrap">
                R$ {(Number(item.price || 0) * (item.quantity || 1)).toFixed(2).replace(".", ",")}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Order Details */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <h3 className="text-sm font-semibold">Resumo</h3>
        <div className="space-y-2 text-xs">
          {order.payment_method && (
            <div className="flex justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5"><CreditCard className="w-3 h-3" />Pagamento</span>
              <span className="font-medium">{PAYMENT_LABELS[order.payment_method] || order.payment_method}</span>
            </div>
          )}
          {order.coupon_code && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cupom</span>
              <span className="font-medium text-accent">{order.coupon_code}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Desconto</span>
              <span className="font-medium text-accent">-R$ {Number(order.discount).toFixed(2).replace(".", ",")}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-primary text-sm">R$ {Number(order.total).toFixed(2).replace(".", ",")}</span>
          </div>
        </div>
      </div>

      {/* Delivery Address */}
      {address && (
        <div className="bg-card rounded-2xl border border-border p-4 space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />Endereço de Entrega
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {address.street}, {address.number}
            {address.complement ? ` — ${address.complement}` : ""}<br />
            {address.neighborhood}, {address.city}/{address.state}<br />
            CEP: {address.zip}
          </p>
        </div>
      )}

      {/* WhatsApp Help */}
      <a href="https://wa.me/5591936180774?text=Oi%2C%20preciso%20de%20ajuda%20com%20meu%20pedido%20%23" target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors">
        <Phone className="w-4 h-4" />Precisa de ajuda? Fale conosco
      </a>
    </motion.div>
  );
};

// ── Order List Item ──
const OrderListItem = ({ order, index, onClick }: { order: any; index: number; onClick: () => void }) => {
  const status = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const items = (order.items as any[]) || [];
  const currentStep = getStepIndex(order.status);
  const totalSteps = TIMELINE_STEPS.length;
  const progressPercent = currentStep >= 0 ? Math.round(((currentStep + 1) / totalSteps) * 100) : 0;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
      onClick={onClick}
      className="w-full text-left bg-card rounded-2xl p-4 border border-border hover:border-primary/30 hover:shadow-sm transition-all space-y-3 group"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold">Pedido #{order.id.slice(0, 8)}</p>
          <p className="text-[10px] text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${status.bgColor} ${status.color} border-0 text-[10px]`}>
            <StatusIcon className="w-3 h-3 mr-0.5" />{status.label}
          </Badge>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>

      {/* Items preview */}
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {items.slice(0, 3).map((item: any, j: number) => (
            <div key={j} className="w-9 h-9 rounded-lg bg-muted overflow-hidden flex-shrink-0 border-2 border-card">
              {item.image && <img src={item.image} alt="" className="w-full h-full object-contain" />}
            </div>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground ml-1">
          {items.length} {items.length === 1 ? "item" : "itens"}
        </span>
        <span className="ml-auto text-sm font-bold text-primary">
          R$ {Number(order.total).toFixed(2).replace(".", ",")}
        </span>
      </div>

      {/* Progress bar */}
      {order.status !== "cancelled" && order.status !== "refunded" && (
        <div className="space-y-1">
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, delay: index * 0.05 }}
              className={`h-full rounded-full ${currentStep >= 4 ? "bg-green-500" : "bg-primary"}`}
            />
          </div>
          <p className="text-[9px] text-muted-foreground">
            {currentStep >= 4 ? "Entregue ✓" : `${progressPercent}% concluído`}
          </p>
        </div>
      )}

      {/* Tracking badge */}
      {order.tracking_code && (
        <div className="flex items-center gap-1.5 text-[10px] text-primary font-medium">
          <Truck className="w-3 h-3" />Rastreio: {order.tracking_code}
        </div>
      )}
    </motion.button>
  );
};

// ── Main Page ──
const Pedidos = () => {
  const { user } = useAuth();
  const { data: orders, isLoading } = useOrders();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const selectedOrder = orders?.find((o) => o.id === selectedOrderId);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center gap-4">
        <SEOHead title="Meus Pedidos | Elle Make" description="Acompanhe seus pedidos" />
        <Package className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-display font-bold">Meus Pedidos</h1>
        <p className="text-sm text-muted-foreground">Faça login para ver seus pedidos</p>
        <Button asChild className="bg-gradient-gold text-primary-foreground min-h-[44px]"><Link to="/perfil">Entrar</Link></Button>
      </div>
    );
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!orders?.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center gap-4">
        <SEOHead title="Meus Pedidos | Elle Make" description="Acompanhe seus pedidos" />
        <Package className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-display font-bold">Nenhum pedido</h1>
        <p className="text-sm text-muted-foreground">Você ainda não fez nenhum pedido</p>
        <Button asChild variant="outline" className="min-h-[44px]"><Link to="/explorar">Explorar produtos</Link></Button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-8 pb-24 max-w-lg mx-auto">
      <SEOHead title="Meus Pedidos | Elle Make" description="Acompanhe seus pedidos" />
      <AnimatePresence mode="wait">
        {selectedOrder ? (
          <OrderDetail key="detail" order={selectedOrder} onBack={() => setSelectedOrderId(null)} />
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -30 }}>
            <h1 className="text-2xl font-display font-bold mb-6">Meus Pedidos</h1>
            <div className="space-y-3">
              {orders.map((order, i) => (
                <OrderListItem key={order.id} order={order} index={i} onClick={() => setSelectedOrderId(order.id)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Pedidos;
