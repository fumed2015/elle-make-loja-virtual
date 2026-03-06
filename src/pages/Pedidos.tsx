import { Package, Clock, CheckCircle, Truck, XCircle, MapPin, ExternalLink } from "lucide-react";
import { useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: "Pendente", icon: Clock, color: "text-yellow-500" },
  approved: { label: "Pago", icon: CheckCircle, color: "text-accent" },
  confirmed: { label: "Confirmado", icon: CheckCircle, color: "text-secondary" },
  processing: { label: "Preparando", icon: Package, color: "text-blue-400" },
  preparing: { label: "Preparando", icon: Package, color: "text-blue-400" },
  shipped: { label: "Enviado", icon: Truck, color: "text-purple-400" },
  delivered: { label: "Entregue", icon: CheckCircle, color: "text-green-500" },
  cancelled: { label: "Cancelado", icon: XCircle, color: "text-destructive" },
  refunded: { label: "Reembolsado", icon: XCircle, color: "text-muted-foreground" },
};

const Pedidos = () => {
  const { user } = useAuth();
  const { data: orders, isLoading } = useOrders();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center gap-4">
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
        <Package className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-display font-bold">Nenhum pedido</h1>
        <p className="text-sm text-muted-foreground">Você ainda não fez nenhum pedido</p>
        <Button asChild variant="outline" className="min-h-[44px]"><Link to="/explorar">Explorar produtos</Link></Button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-8 pb-24 max-w-lg mx-auto">
      <h1 className="text-2xl font-display font-bold mb-6">Meus Pedidos</h1>
      <div className="space-y-3">
        {orders.map((order, i) => {
          const status = statusConfig[order.status] || statusConfig.pending;
          const StatusIcon = status.icon;
          const items = (order.items as any[]) || [];
          const address = order.shipping_address as any;
          const trackingCode = (order as any).tracking_code;
          const trackingUrl = (order as any).tracking_url;

          return (
            <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl p-4 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Pedido #{order.id.slice(0, 8)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
                <Badge variant="secondary" className="gap-1"><StatusIcon className={`w-3 h-3 ${status.color}`} />{status.label}</Badge>
              </div>

              {/* Items preview */}
              <div className="flex gap-2 overflow-x-auto">
                {items.slice(0, 4).map((item: any, j: number) => (
                  <div key={j} className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                  </div>
                ))}
                {items.length > 4 && (
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">+{items.length - 4}</div>
                )}
              </div>

              {/* Tracking */}
              {trackingCode && (
                <div className="bg-muted rounded-lg px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-primary" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Código de rastreio</p>
                      <p className="text-xs font-mono font-medium">{trackingCode}</p>
                    </div>
                  </div>
                  {trackingUrl && (
                    <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="text-primary"><ExternalLink className="w-4 h-4" /></a>
                  )}
                </div>
              )}

              {/* Address */}
              {address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-3 h-3 text-muted-foreground mt-0.5" />
                  <p className="text-[10px] text-muted-foreground">{address.street}, {address.number} - {address.neighborhood}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-sm font-bold text-primary">R$ {Number(order.total).toFixed(2).replace(".", ",")}</span>
                <span className="text-[10px] text-muted-foreground">{items.reduce((sum: number, it: any) => sum + (it.quantity || 1), 0)} itens</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Pedidos;
