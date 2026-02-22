import { useState, useMemo } from "react";
import { useAllOrders } from "@/hooks/useOrders";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ShoppingCart, Package, Clock, CheckCircle, Truck, XCircle,
  MapPin, Tag, ChevronDown, ChevronUp, Filter, ArrowUpDown,
  Send, Eye, Pencil, Copy, ExternalLink, MessageCircle, StickyNote,
  TrendingUp, DollarSign, AlertTriangle, Calendar, X, Trash2
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  pending: { label: "Pendente", icon: Clock, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  confirmed: { label: "Confirmado", icon: CheckCircle, color: "text-blue-500", bg: "bg-blue-500/10" },
  paid: { label: "Pago", icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  preparing: { label: "Preparando", icon: Package, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  shipped: { label: "Enviado", icon: Truck, color: "text-purple-500", bg: "bg-purple-500/10" },
  delivered: { label: "Entregue", icon: CheckCircle, color: "text-green-600", bg: "bg-green-600/10" },
  cancelled: { label: "Cancelado", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

const OrdersManagementTab = () => {
  const { data: orders, isLoading, refetch } = useAllOrders();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "total">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingTracking, setEditingTracking] = useState<string | null>(null);
  const [trackingForm, setTrackingForm] = useState({ code: "", url: "" });
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });

  // Filtered and sorted orders
  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    let result = [...orders];

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((o) => o.status === statusFilter);
    }

    // Date filter
    if (dateRange.from) {
      result = result.filter((o) => new Date(o.created_at) >= new Date(dateRange.from));
    }
    if (dateRange.to) {
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59);
      result = result.filter((o) => new Date(o.created_at) <= toDate);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((o) => {
        const items = (o.items as any[]) || [];
        const itemNames = items.map((i: any) => i.name || "").join(" ").toLowerCase();
        const address = o.shipping_address as any;
        const addressStr = address ? `${address.street} ${address.neighborhood} ${address.city}`.toLowerCase() : "";
        return (
          o.id.toLowerCase().includes(q) ||
          itemNames.includes(q) ||
          (o.coupon_code || "").toLowerCase().includes(q) ||
          addressStr.includes(q) ||
          (o.tracking_code || "").toLowerCase().includes(q) ||
          (o.notes || "").toLowerCase().includes(q)
        );
      });
    }

    // Sort
    result.sort((a, b) => {
      const val = sortBy === "date"
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : Number(a.total) - Number(b.total);
      return sortDir === "desc" ? -val : val;
    });

    return result;
  }, [orders, statusFilter, search, sortBy, sortDir, dateRange]);

  // Analytics
  const analytics = useMemo(() => {
    if (!orders) return { total: 0, revenue: 0, avgTicket: 0, byStatus: {} as Record<string, number>, today: 0, todayRevenue: 0 };
    const byStatus: Record<string, number> = {};
    let revenue = 0;
    let today = 0;
    let todayRevenue = 0;
    const todayStr = new Date().toDateString();
    let activeCount = 0;

    for (const o of orders) {
      byStatus[o.status] = (byStatus[o.status] || 0) + 1;
      if (o.status !== "cancelled" && o.status !== "refunded") {
        revenue += Number(o.total);
        activeCount++;
      }
      if (new Date(o.created_at).toDateString() === todayStr) {
        today++;
        if (o.status !== "cancelled" && o.status !== "refunded") {
          todayRevenue += Number(o.total);
        }
      }
    }

    return {
      total: orders.length,
      revenue,
      avgTicket: activeCount > 0 ? revenue / activeCount : 0,
      byStatus,
      today,
      todayRevenue,
    };
  }, [orders]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success(`Status atualizado para ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      refetch();
    }
  };

  const handleSaveTracking = async (orderId: string) => {
    const updateData: any = {};
    if (trackingForm.code) updateData.tracking_code = trackingForm.code;
    if (trackingForm.url) updateData.tracking_url = trackingForm.url;

    const { error } = await supabase.from("orders").update(updateData).eq("id", orderId);
    if (error) {
      toast.error("Erro ao salvar rastreio");
    } else {
      toast.success("Rastreio atualizado!");
      setEditingTracking(null);
      refetch();
    }
  };

  const handleSaveNotes = async (orderId: string) => {
    const { error } = await supabase.from("orders").update({ notes: notesValue }).eq("id", orderId);
    if (error) {
      toast.error("Erro ao salvar observações");
    } else {
      toast.success("Observações salvas!");
      setEditingNotes(null);
      refetch();
    }
  };

  const copyOrderId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success("ID copiado!");
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Tem certeza que deseja apagar este pedido? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) {
      toast.error("Erro ao apagar pedido");
    } else {
      toast.success("Pedido apagado!");
      setExpandedId(null);
    }
  };

  const sendWhatsApp = (order: any) => {
    const items = (order.items as any[]) || [];
    const itemsList = items.map((i: any) => `• ${i.name} (${i.quantity}x)`).join("\n");
    const address = order.shipping_address as any;
    const addressStr = address ? `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}` : "";
    const msg = encodeURIComponent(
      `📋 *Pedido #${order.id.slice(0, 8)}*\n\n${itemsList}\n\n💰 Total: R$ ${Number(order.total).toFixed(2).replace(".", ",")}\n📍 ${addressStr}\n\nStatus: ${STATUS_CONFIG[order.status]?.label || order.status}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label: "Total Pedidos", value: analytics.total, icon: ShoppingCart, accent: false },
          { label: "Receita", value: `R$ ${analytics.revenue.toFixed(2).replace(".", ",")}`, icon: DollarSign, accent: true },
          { label: "Ticket Médio", value: `R$ ${analytics.avgTicket.toFixed(2).replace(".", ",")}`, icon: TrendingUp, accent: false },
          { label: "Hoje", value: `${analytics.today} (R$ ${analytics.todayRevenue.toFixed(2).replace(".", ",")})`, icon: Calendar, accent: false },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl p-3 border border-border">
            <stat.icon className={`w-4 h-4 mb-1 ${stat.accent ? "text-accent" : "text-primary"}`} />
            <p className={`text-sm font-bold ${stat.accent ? "text-accent" : ""}`}>{stat.value}</p>
            <p className="text-[9px] text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Status Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-3 py-1.5 rounded-full text-[10px] font-medium flex-shrink-0 transition-colors ${statusFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          Todos ({analytics.total})
        </button>
        {ALL_STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s];
          const count = analytics.byStatus[s] || 0;
          if (count === 0) return null;
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-medium flex-shrink-0 transition-colors flex items-center gap-1 ${statusFilter === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Search + Sort + Date */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ID, produto, cupom, endereço..."
              className="pl-9 bg-muted border-none text-xs min-h-[36px]"
            />
          </div>
          <button
            onClick={() => {
              if (sortBy === "date") {
                setSortDir((d) => (d === "desc" ? "asc" : "desc"));
              } else {
                setSortBy("date");
                setSortDir("desc");
              }
            }}
            className={`px-3 rounded-lg text-[10px] font-medium flex items-center gap-1 ${sortBy === "date" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
          >
            <Calendar className="w-3 h-3" />{sortDir === "desc" ? "↓" : "↑"}
          </button>
          <button
            onClick={() => {
              if (sortBy === "total") {
                setSortDir((d) => (d === "desc" ? "asc" : "desc"));
              } else {
                setSortBy("total");
                setSortDir("desc");
              }
            }}
            className={`px-3 rounded-lg text-[10px] font-medium flex items-center gap-1 ${sortBy === "total" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
          >
            <DollarSign className="w-3 h-3" />{sortDir === "desc" ? "↓" : "↑"}
          </button>
        </div>
        <div className="flex gap-2">
          <Input type="date" value={dateRange.from} onChange={(e) => setDateRange((d) => ({ ...d, from: e.target.value }))} className="bg-muted border-none text-[10px] min-h-[32px] flex-1" />
          <Input type="date" value={dateRange.to} onChange={(e) => setDateRange((d) => ({ ...d, to: e.target.value }))} className="bg-muted border-none text-[10px] min-h-[32px] flex-1" />
          {(dateRange.from || dateRange.to) && (
            <button onClick={() => setDateRange({ from: "", to: "" })} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="text-[10px] text-muted-foreground">{filteredOrders.length} pedidos encontrados</p>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order, i) => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            const items = (order.items as any[]) || [];
            const address = order.shipping_address as any;
            const isExpanded = expandedId === order.id;
            const isEditingTrack = editingTracking === order.id;
            const isEditingNote = editingNotes === order.id;

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="bg-card rounded-xl border border-border overflow-hidden"
              >
                {/* Header row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                      <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold">#{order.id.slice(0, 8)}</p>
                        <Badge variant="outline" className={`text-[9px] ${cfg.color} border-current/20`}>{cfg.label}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {" · "}{items.reduce((s: number, it: any) => s + (it.quantity || 1), 0)} itens
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-primary">R$ {Number(order.total).toFixed(2).replace(".", ",")}</p>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
                        {/* Status update */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Atualizar Status</Label>
                          <Select defaultValue={order.status} onValueChange={(val) => handleUpdateStatus(order.id, val)}>
                            <SelectTrigger className="bg-muted border-none min-h-[36px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ALL_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  <span className="flex items-center gap-2">
                                    <span className={STATUS_CONFIG[s].color}>●</span> {STATUS_CONFIG[s].label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Items */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Produtos</Label>
                          <div className="space-y-1.5">
                            {items.map((item: any, j: number) => (
                              <div key={j} className="flex items-center gap-2 bg-muted rounded-lg p-2">
                                <div className="w-10 h-10 rounded-lg bg-background overflow-hidden flex-shrink-0">
                                  {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-medium line-clamp-1">{item.name}</p>
                                  <p className="text-[9px] text-muted-foreground">Qtd: {item.quantity} · R$ {Number(item.price || 0).toFixed(2).replace(".", ",")}</p>
                                </div>
                                <p className="text-[11px] font-bold text-primary">R$ {(Number(item.price || 0) * (item.quantity || 1)).toFixed(2).replace(".", ",")}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Financial summary */}
                        <div className="bg-muted rounded-lg p-3 space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>R$ {(Number(order.total) + Number(order.discount || 0)).toFixed(2).replace(".", ",")}</span>
                          </div>
                          {Number(order.discount || 0) > 0 && (
                            <div className="flex justify-between text-[10px]">
                              <span className="text-muted-foreground flex items-center gap-1"><Tag className="w-3 h-3" />{order.coupon_code || "Desconto"}</span>
                              <span className="text-accent">-R$ {Number(order.discount).toFixed(2).replace(".", ",")}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs font-bold border-t border-border/50 pt-1 mt-1">
                            <span>Total</span>
                            <span className="text-primary">R$ {Number(order.total).toFixed(2).replace(".", ",")}</span>
                          </div>
                        </div>

                        {/* Address */}
                        {address && (
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">Endereço</Label>
                            <div className="bg-muted rounded-lg p-3 flex items-start gap-2">
                              <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                              <div className="text-[11px]">
                                <p>{address.street}, {address.number}{address.complement ? ` - ${address.complement}` : ""}</p>
                                <p className="text-muted-foreground">{address.neighborhood}, {address.city} - {address.state}</p>
                                <p className="text-muted-foreground">CEP: {address.zip}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tracking */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Rastreio</Label>
                          {isEditingTrack ? (
                            <div className="space-y-2">
                              <Input
                                value={trackingForm.code}
                                onChange={(e) => setTrackingForm((f) => ({ ...f, code: e.target.value }))}
                                placeholder="Código de rastreio"
                                className="bg-muted border-none text-xs min-h-[36px]"
                              />
                              <Input
                                value={trackingForm.url}
                                onChange={(e) => setTrackingForm((f) => ({ ...f, url: e.target.value }))}
                                placeholder="URL de rastreio (opcional)"
                                className="bg-muted border-none text-xs min-h-[36px]"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleSaveTracking(order.id)} className="text-xs h-7 gap-1">
                                  <CheckCircle className="w-3 h-3" />Salvar
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingTracking(null)} className="text-xs h-7">Cancelar</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {order.tracking_code ? (
                                <div className="bg-muted rounded-lg p-2.5 flex items-center justify-between flex-1">
                                  <div className="flex items-center gap-2">
                                    <Truck className="w-3.5 h-3.5 text-primary" />
                                    <span className="text-xs font-mono">{order.tracking_code}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {order.tracking_url && (
                                      <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-primary">
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                    <button onClick={() => { setTrackingForm({ code: order.tracking_code || "", url: order.tracking_url || "" }); setEditingTracking(order.id); }}>
                                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => { setTrackingForm({ code: "", url: "" }); setEditingTracking(order.id); }} className="text-xs h-7 gap-1">
                                  <Truck className="w-3 h-3" />Adicionar Rastreio
                                </Button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Observações</Label>
                          {isEditingNote ? (
                            <div className="space-y-2">
                              <Textarea
                                value={notesValue}
                                onChange={(e) => setNotesValue(e.target.value)}
                                placeholder="Observações internas sobre o pedido..."
                                className="bg-muted border-none text-xs min-h-[80px]"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleSaveNotes(order.id)} className="text-xs h-7 gap-1">
                                  <CheckCircle className="w-3 h-3" />Salvar
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingNotes(null)} className="text-xs h-7">Cancelar</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2">
                              {order.notes ? (
                                <div className="bg-muted rounded-lg p-2.5 flex-1">
                                  <p className="text-[11px] whitespace-pre-wrap">{order.notes}</p>
                                </div>
                              ) : (
                                <p className="text-[10px] text-muted-foreground italic">Nenhuma observação</p>
                              )}
                              <button onClick={() => { setNotesValue(order.notes || ""); setEditingNotes(order.id); }}>
                                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Payment & meta */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-muted rounded-lg p-2.5">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Pagamento</p>
                            <p className="text-[11px] font-medium capitalize">{order.payment_method || "—"}</p>
                          </div>
                          <div className="bg-muted rounded-lg p-2.5">
                            <p className="text-[9px] text-muted-foreground uppercase font-bold">Última Atualização</p>
                            <p className="text-[11px] font-medium">{new Date(order.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-1 flex-wrap">
                          <Button size="sm" variant="outline" onClick={() => copyOrderId(order.id)} className="text-[10px] h-7 gap-1">
                            <Copy className="w-3 h-3" />Copiar ID
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => sendWhatsApp(order)} className="text-[10px] h-7 gap-1">
                            <MessageCircle className="w-3 h-3" />WhatsApp
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteOrder(order.id)} className="text-[10px] h-7 gap-1">
                            <Trash2 className="w-3 h-3" />Apagar
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersManagementTab;
