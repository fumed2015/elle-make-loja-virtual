import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllOrders } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Truck, RotateCcw, AlertTriangle, Package, TrendingUp, Clock, Plus, Check, X, Loader2, MessageCircle } from "lucide-react";

const LogisticsTab = () => {
  const { data: orders } = useAllOrders();
  const { data: products } = useProducts({});
  const queryClient = useQueryClient();
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data: returns, refetch: refetchReturns } = useQuery({
    queryKey: ["admin-returns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("returns").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const now = new Date();

  // ===== SMART RESTOCK ALERTS =====
  const restockAlerts = useMemo(() => {
    if (!products || !orders) return [];
    const last30 = new Date(now.getTime() - 30 * 86400000);
    const recentOrders = orders.filter(o => new Date(o.created_at) >= last30);

    return products
      .filter(p => p.is_active)
      .map(p => {
        let totalSold = 0;
        recentOrders.forEach(o => {
          const items = Array.isArray(o.items) ? o.items : [];
          items.forEach((item: any) => {
            if (item.product_id === p.id) totalSold += item.quantity || 1;
          });
        });
        const dailyVelocity = totalSold / 30;
        const daysUntilStockout = dailyVelocity > 0 ? Math.floor(p.stock / dailyVelocity) : Infinity;
        const suggestedReorder = Math.ceil(dailyVelocity * 30); // 30 days supply

        return { ...p, totalSold, dailyVelocity, daysUntilStockout, suggestedReorder };
      })
      .filter(p => p.daysUntilStockout <= 30 || p.stock <= 5)
      .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
  }, [products, orders, now]);

  // ===== SHIPPING OVERVIEW =====
  const shippingStats = useMemo(() => {
    if (!orders) return { pending: 0, shipped: 0, delivered: 0, avgDeliveryDays: 0 };
    const pending = orders.filter(o => ["confirmed", "approved", "processing"].includes(o.status)).length;
    const shipped = orders.filter(o => o.status === "shipped").length;
    const delivered = orders.filter(o => o.status === "delivered").length;

    const deliveredOrders = orders.filter(o => o.status === "delivered" && o.estimated_delivery);
    const avgDeliveryDays = deliveredOrders.length > 0
      ? deliveredOrders.reduce((s, o) => {
          const created = new Date(o.created_at).getTime();
          const updated = new Date(o.updated_at).getTime();
          return s + (updated - created) / 86400000;
        }, 0) / deliveredOrders.length
      : 0;

    return { pending, shipped, delivered, avgDeliveryDays };
  }, [orders]);

  // ===== RETURNS MANAGEMENT =====
  const returnStatusLabels: Record<string, { label: string; color: string }> = {
    requested: { label: "Solicitada", color: "bg-yellow-500/15 text-yellow-700" },
    approved: { label: "Aprovada", color: "bg-blue-500/15 text-blue-700" },
    in_transit: { label: "Em trânsito", color: "bg-primary/15 text-primary" },
    received: { label: "Recebida", color: "bg-accent/15 text-accent" },
    refunded: { label: "Reembolsada", color: "bg-accent/15 text-accent" },
    rejected: { label: "Rejeitada", color: "bg-destructive/15 text-destructive" },
  };

  const filteredReturns = returns?.filter(r => statusFilter === "all" || r.status === statusFilter) || [];

  const handleUpdateReturnStatus = async (returnId: string, newStatus: string) => {
    setUpdatingId(returnId);
    const { error } = await supabase.from("returns").update({ status: newStatus }).eq("id", returnId);
    if (error) toast.error(error.message);
    else { toast.success("Status atualizado!"); refetchReturns(); }
    setUpdatingId(null);
  };

  const handleUpdateAdminNotes = async (returnId: string, notes: string) => {
    const { error } = await supabase.from("returns").update({ admin_notes: notes }).eq("id", returnId);
    if (error) toast.error(error.message);
    else toast.success("Notas salvas!");
  };

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold flex items-center gap-2">
        <Truck className="w-4 h-4 text-primary" /> Logística & Operações
      </h2>

      {/* Shipping Overview */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Aguardando envio", value: shippingStats.pending, icon: Clock, color: "text-yellow-500" },
          { label: "Em trânsito", value: shippingStats.shipped, icon: Truck, color: "text-primary" },
          { label: "Entregues", value: shippingStats.delivered, icon: Check, color: "text-accent" },
          { label: "Prazo médio", value: `${shippingStats.avgDeliveryDays.toFixed(0)}d`, icon: TrendingUp, color: "text-muted-foreground" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl p-3 border border-border text-center">
            <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
            <p className="text-sm font-bold">{s.value}</p>
            <p className="text-[8px] text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Smart Restock Alerts */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500" />
          <p className="text-xs font-bold">🔔 Alertas Inteligentes de Reposição</p>
          <Badge variant="secondary" className="text-[9px]">{restockAlerts.length} itens</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground">Baseado na velocidade de vendas dos últimos 30 dias</p>

        {restockAlerts.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-4">✅ Todos os produtos com estoque adequado</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {restockAlerts.map(p => (
              <div key={p.id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                p.daysUntilStockout <= 7 ? "bg-destructive/10" : p.daysUntilStockout <= 14 ? "bg-yellow-500/10" : "bg-muted"
              }`}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{p.name}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {p.dailyVelocity.toFixed(1)} un/dia • {p.totalSold} vendidos/30d
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <Badge variant={p.stock <= 0 ? "destructive" : "outline"} className="text-[9px]">{p.stock} un.</Badge>
                    <p className="text-[8px] text-muted-foreground mt-0.5">
                      {p.daysUntilStockout <= 0 ? "⚠️ Esgotado!" : `~${p.daysUntilStockout}d restantes`}
                    </p>
                  </div>
                  <div className="bg-primary/10 rounded px-2 py-1 text-center">
                    <p className="text-[8px] text-muted-foreground">Pedir</p>
                    <p className="text-xs font-bold text-primary">{p.suggestedReorder}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Returns Management */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold">🔄 Devoluções & Trocas</p>
            <Badge variant="secondary" className="text-[9px]">{returns?.length || 0}</Badge>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-7 text-[10px] w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(returnStatusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Return status summary */}
        <div className="flex gap-1.5 flex-wrap">
          {Object.entries(returnStatusLabels).map(([key, cfg]) => {
            const count = returns?.filter(r => r.status === key).length || 0;
            if (count === 0) return null;
            return (
              <Badge key={key} variant="outline" className={`text-[9px] ${cfg.color}`}>
                {cfg.label}: {count}
              </Badge>
            );
          })}
        </div>

        {filteredReturns.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-4">Nenhuma devolução encontrada</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredReturns.map(r => {
              const order = orders?.find(o => o.id === r.order_id);
              const statusCfg = returnStatusLabels[r.status] || { label: r.status, color: "" };
              return (
                <div key={r.id} className="bg-muted rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[9px] ${statusCfg.color}`}>{statusCfg.label}</Badge>
                        <Badge variant="outline" className="text-[9px]">{r.type === "exchange" ? "Troca" : "Devolução"}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Pedido: {r.order_id.slice(0, 8)}... • {new Date(r.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    {r.refund_amount > 0 && <span className="text-xs font-bold">{fmt(Number(r.refund_amount))}</span>}
                  </div>

                  <p className="text-[10px]"><strong>Motivo:</strong> {r.reason}</p>
                  {r.notes && <p className="text-[10px] text-muted-foreground">{r.notes}</p>}

                  {/* Admin actions */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                    <Select value={r.status} onValueChange={(v) => handleUpdateReturnStatus(r.id, v)}>
                      <SelectTrigger className="h-6 text-[9px] w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(returnStatusLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {updatingId === r.id && <Loader2 className="w-3 h-3 animate-spin" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Orders awaiting shipment */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold">📦 Pedidos Aguardando Envio</p>
        </div>
        {(() => {
          const awaitingShipment = orders?.filter(o => ["confirmed", "approved", "processing"].includes(o.status)) || [];
          if (awaitingShipment.length === 0) return <p className="text-[10px] text-muted-foreground text-center py-4">Nenhum pedido aguardando envio ✅</p>;
          return (
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {awaitingShipment.slice(0, 20).map(o => (
                <div key={o.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium">#{o.id.slice(0, 8)}</p>
                    <p className="text-[9px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")} • {fmt(Number(o.total))}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[9px]">{o.status}</Badge>
                    {o.tracking_code && <Badge variant="outline" className="text-[8px]">🚚 {o.tracking_code}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </motion.div>
    </div>
  );
};

export default LogisticsTab;
