import { useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { useAllOrders } from "@/hooks/useOrders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Package, AlertTriangle, Truck, Clock, CheckCircle, XCircle, Search, ArrowDown } from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "Pendente", confirmed: "Confirmado", approved: "Pago",
  processing: "Preparando", shipped: "Enviado", delivered: "Entregue",
  cancelled: "Cancelado", refunded: "Reembolsado",
};

const OperacionalTab = () => {
  const { data: products } = useProducts({});
  const { data: orders } = useAllOrders();
  const [stockThreshold, setStockThreshold] = useState("5");
  const [searchQuery, setSearchQuery] = useState("");

  const threshold = parseInt(stockThreshold) || 5;

  // Stock alerts
  const outOfStock = products?.filter(p => p.stock === 0) || [];
  const lowStock = products?.filter(p => p.stock > 0 && p.stock <= threshold) || [];
  const healthyStock = products?.filter(p => p.stock > threshold) || [];

  // Order pipeline
  const pipeline = ["pending", "confirmed", "approved", "processing", "shipped", "delivered", "cancelled"];
  const pipelineCounts = pipeline.map(s => ({
    status: s,
    label: statusLabels[s] || s,
    count: orders?.filter(o => o.status === s).length || 0,
  }));

  // Recent orders (last 20)
  const recentOrders = [...(orders || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20);

  // Delivery stats
  const deliveredOrders = orders?.filter(o => o.status === "delivered") || [];
  const avgDeliveryTime = deliveredOrders.length > 0 ? deliveredOrders.reduce((s, o) => {
    const created = new Date(o.created_at).getTime();
    const updated = new Date(o.updated_at).getTime();
    return s + (updated - created) / 3600000; // hours
  }, 0) / deliveredOrders.length : 0;

  // Search filter for stock
  const filteredLow = [...outOfStock, ...lowStock].filter(p =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold">⚙️ Operacional</h2>

      {/* Pipeline Overview */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <p className="text-xs font-bold">📦 Pipeline de Pedidos</p>
        <div className="grid grid-cols-3 gap-2">
          {pipelineCounts.map(p => (
            <div key={p.status} className={`bg-muted rounded-lg p-2.5 text-center ${p.status === "pending" && p.count > 0 ? "border border-yellow-500/30" : ""}`}>
              <p className="text-lg font-bold">{p.count}</p>
              <p className="text-[9px] text-muted-foreground">{p.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Stats */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl p-3 border border-border text-center">
          <Truck className="w-4 h-4 mx-auto mb-1 text-primary" />
          <p className="text-sm font-bold">{deliveredOrders.length}</p>
          <p className="text-[9px] text-muted-foreground">Entregues</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-xl p-3 border border-border text-center">
          <Clock className="w-4 h-4 mx-auto mb-1 text-primary" />
          <p className="text-sm font-bold">{avgDeliveryTime > 0 ? `${avgDeliveryTime.toFixed(0)}h` : "—"}</p>
          <p className="text-[9px] text-muted-foreground">Tempo médio</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card rounded-xl p-3 border border-border text-center">
          <XCircle className="w-4 h-4 mx-auto mb-1 text-destructive" />
          <p className="text-sm font-bold">{orders?.filter(o => o.status === "cancelled").length || 0}</p>
          <p className="text-[9px] text-muted-foreground">Cancelados</p>
        </motion.div>
      </div>

      {/* Stock Management */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold">Gestão de Estoque</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Alerta ≤</span>
            <Input value={stockThreshold} onChange={e => setStockThreshold(e.target.value)}
              className="w-12 h-6 text-[10px] bg-muted border-none px-2 text-center" type="number" />
          </div>
        </div>

        {/* Summary badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant="destructive" className="text-[10px] gap-1"><XCircle className="w-3 h-3" />Zerados: {outOfStock.length}</Badge>
          <Badge variant="outline" className="text-[10px] gap-1 border-yellow-500/50 text-yellow-600"><AlertTriangle className="w-3 h-3" />Baixo: {lowStock.length}</Badge>
          <Badge variant="secondary" className="text-[10px] gap-1"><CheckCircle className="w-3 h-3" />OK: {healthyStock.length}</Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar produto..." className="pl-9 bg-muted border-none min-h-[32px] text-xs" />
        </div>

        {/* Stock list */}
        <div className="max-h-64 overflow-y-auto space-y-1.5">
          {filteredLow.length === 0 ? <p className="text-[10px] text-muted-foreground text-center py-2">Nenhum produto com estoque baixo 🎉</p> :
            filteredLow.map(p => (
              <div key={p.id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${p.stock === 0 ? "bg-destructive/5 border border-destructive/20" : "bg-yellow-500/5 border border-yellow-500/20"}`}>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{p.name}</p>
                  <p className="text-[9px] text-muted-foreground">{p.brand || "Sem marca"}</p>
                </div>
                <Badge variant={p.stock === 0 ? "destructive" : "outline"} className="text-[10px] ml-2">
                  {p.stock === 0 ? "Esgotado" : `${p.stock} un.`}
                </Badge>
              </div>
            ))
          }
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <p className="text-xs font-bold">🕐 Últimos Pedidos</p>
        <div className="max-h-64 overflow-y-auto space-y-1.5">
          {recentOrders.length === 0 ? <p className="text-[10px] text-muted-foreground text-center py-2">Nenhum pedido</p> :
            recentOrders.map(o => (
              <div key={o.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                <div>
                  <p className="text-[10px] font-medium">#{o.id.slice(0, 8)}</p>
                  <p className="text-[9px] text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")} {new Date(o.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[9px]">{statusLabels[o.status] || o.status}</Badge>
                  <span className="text-xs font-bold">R$ {Number(o.total).toFixed(0)}</span>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};

export default OperacionalTab;
