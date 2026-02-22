import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllOrders } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Users, ShoppingCart, Clock, MessageCircle, AlertTriangle, Eye, Search, TrendingDown, Heart, BarChart3, CalendarDays, Instagram, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

type DateRange = "today" | "7d" | "30d";

const getDateThreshold = (range: DateRange): Date => {
  const now = new Date();
  if (range === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "7d") return new Date(now.getTime() - 7 * 86400000);
  return new Date(now.getTime() - 30 * 86400000);
};

const CRMTab = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [editingFields, setEditingFields] = useState<Record<string, { instagram?: string; admin_notes?: string; phone?: string }>>({});

  const { data: orders } = useAllOrders();
  const { data: products } = useProducts({});

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-crm"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: abandonments } = useQuery({
    queryKey: ["admin-cart-abandonment"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cart_abandonment_events").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: favorites } = useQuery({
    queryKey: ["admin-favorites-crm"],
    queryFn: async () => {
      const { data, error } = await supabase.from("favorites").select("*").limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["admin-reviews-crm"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("*").limit(1000);
      if (error) throw error;
      return data;
    },
  });

  const dateThreshold = useMemo(() => getDateThreshold(dateRange), [dateRange]);

  // Filter orders by date range (excluding cancelled/refunded)
  const filteredOrders = useMemo(() => {
    return orders?.filter(o => o.status !== "cancelled" && o.status !== "refunded" && new Date(o.created_at) >= dateThreshold) || [];
  }, [orders, dateThreshold]);

  const filteredAbandonments = useMemo(() => {
    return abandonments?.filter(a => new Date(a.created_at) >= dateThreshold) || [];
  }, [abandonments, dateThreshold]);

  // ===== CUSTOMER PROFILES WITH ENRICHMENT =====
  const enrichedCustomers = useMemo(() => {
    if (!profiles) return [];
    const now = Date.now();
    return profiles.map(p => {
      const userOrders = filteredOrders.filter(o => o.user_id === p.user_id);
      const totalSpent = userOrders.reduce((s, o) => s + Number(o.total), 0);
      const orderCount = userOrders.length;
      const allUserOrders = orders?.filter(o => o.user_id === p.user_id && o.status !== "cancelled" && o.status !== "refunded") || [];
      const lastOrder = allUserOrders.length > 0 ? new Date(Math.max(...allUserOrders.map(o => new Date(o.created_at).getTime()))) : null;
      const daysSinceLastOrder = lastOrder ? Math.floor((now - lastOrder.getTime()) / 86400000) : Infinity;
      const userFavorites = favorites?.filter(f => f.user_id === p.user_id).length || 0;
      const userReviews = reviews?.filter(r => r.user_id === p.user_id).length || 0;
      const avgRating = reviews?.filter(r => r.user_id === p.user_id).reduce((s, r) => s + r.rating, 0) / (userReviews || 1);
      const daysSinceSignup = Math.floor((now - new Date(p.created_at).getTime()) / 86400000);

      let segment: "vip" | "active" | "at-risk" | "dormant" | "new";
      if (totalSpent >= 500 && orderCount >= 3) segment = "vip";
      else if (orderCount >= 1 && daysSinceLastOrder <= 60) segment = "active";
      else if (orderCount >= 1 && daysSinceLastOrder > 60) segment = "at-risk";
      else if (orderCount === 0) segment = daysSinceSignup <= 30 ? "new" : "dormant";
      else segment = "dormant";

      const engagementScore = Math.min(100, Math.round(
        (orderCount * 15) +
        (userFavorites * 5) +
        (userReviews * 10) +
        (p.phone ? 10 : 0) +
        (p.birthday ? 5 : 0) +
        (daysSinceLastOrder < 30 ? 20 : daysSinceLastOrder < 60 ? 10 : 0)
      ));

      return {
        ...p,
        totalSpent, orderCount, lastOrder, daysSinceLastOrder,
        userFavorites, userReviews, avgRating, segment, engagementScore, daysSinceSignup,
      };
    }).sort((a, b) => b.engagementScore - a.engagementScore);
  }, [profiles, filteredOrders, orders, favorites, reviews]);

  const filteredCustomers = useMemo(() => {
    return enrichedCustomers.filter(c => {
      if (segmentFilter !== "all" && c.segment !== segmentFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (c.full_name?.toLowerCase().includes(q) || c.phone?.includes(q) || c.cpf?.includes(q) || (c as any).instagram?.toLowerCase().includes(q));
      }
      return true;
    });
  }, [enrichedCustomers, segmentFilter, searchQuery]);

  const updateProfileMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Record<string, any> }) => {
      const { error } = await supabase.from("profiles").update(data as any).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles-crm"] });
      toast.success("Lead atualizado!");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  const handleSaveLead = (userId: string) => {
    const fields = editingFields[userId];
    if (!fields) return;
    updateProfileMutation.mutate({ userId, data: fields });
  };

  const setEditField = (userId: string, field: string, value: string) => {
    setEditingFields(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value },
    }));
  };

  // ===== CART ABANDONMENT ANALYTICS =====
  const abandonmentStats = useMemo(() => {
    const src = filteredAbandonments;
    const total = src.length;
    const avgTotal = total > 0 ? src.reduce((s, a) => s + Number(a.cart_total), 0) / total : 0;
    const byStep: Record<string, number> = {};
    src.forEach(a => { byStep[a.step] = (byStep[a.step] || 0) + 1; });
    return { total, avgTotal, byStep };
  }, [filteredAbandonments]);

  // ===== SEGMENT COUNTS =====
  const segmentCounts = useMemo(() => ({
    vip: enrichedCustomers.filter(c => c.segment === "vip").length,
    active: enrichedCustomers.filter(c => c.segment === "active").length,
    "at-risk": enrichedCustomers.filter(c => c.segment === "at-risk").length,
    dormant: enrichedCustomers.filter(c => c.segment === "dormant").length,
    new: enrichedCustomers.filter(c => c.segment === "new").length,
  }), [enrichedCustomers]);

  const segmentConfig: Record<string, { label: string; emoji: string; color: string }> = {
    vip: { label: "VIP", emoji: "👑", color: "text-primary" },
    active: { label: "Ativo", emoji: "✅", color: "text-accent" },
    "at-risk": { label: "Em risco", emoji: "⚠️", color: "text-yellow-500" },
    dormant: { label: "Dormiente", emoji: "💤", color: "text-muted-foreground" },
    new: { label: "Novo", emoji: "🆕", color: "text-blue-500" },
  };

  // Selected customer detail
  const selectedProfile = selectedCustomer ? enrichedCustomers.find(c => c.user_id === selectedCustomer) : null;
  const selectedOrders = selectedCustomer ? orders?.filter(o => o.user_id === selectedCustomer) || [] : [];

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  const getWhatsAppLink = (phone: string, msg: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> CRM & Clientes
        </h2>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {([["today", "Hoje"], ["7d", "7d"], ["30d", "30d"]] as [DateRange, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setDateRange(value)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                dateRange === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Segment Overview */}
      <div className="grid grid-cols-5 gap-1.5">
        {Object.entries(segmentCounts).map(([key, count]) => {
          const cfg = segmentConfig[key];
          return (
            <button key={key} onClick={() => setSegmentFilter(segmentFilter === key ? "all" : key)}
              className={`bg-card rounded-lg p-2 text-center border transition-colors ${segmentFilter === key ? "border-primary" : "border-border"}`}>
              <p className="text-sm">{cfg.emoji}</p>
              <p className="text-xs font-bold">{count}</p>
              <p className="text-[8px] text-muted-foreground">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Cart Abandonment */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-destructive" />
          <p className="text-xs font-bold">🛒 Carrinhos Abandonados</p>
          <Badge variant="destructive" className="text-[9px]">{abandonmentStats.total}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted rounded-lg p-2.5 text-center">
            <p className="text-sm font-bold text-destructive">{abandonmentStats.total}</p>
            <p className="text-[8px] text-muted-foreground">Abandonos</p>
          </div>
          <div className="bg-muted rounded-lg p-2.5 text-center">
            <p className="text-sm font-bold">{fmt(abandonmentStats.avgTotal)}</p>
            <p className="text-[8px] text-muted-foreground">Ticket médio</p>
          </div>
          <div className="bg-muted rounded-lg p-2.5 text-center">
            <p className="text-sm font-bold">{fmt(abandonmentStats.avgTotal * abandonmentStats.total)}</p>
            <p className="text-[8px] text-muted-foreground">Receita perdida</p>
          </div>
        </div>
        {Object.keys(abandonmentStats.byStep).length > 0 && (
          <div className="space-y-1">
            <p className="text-[9px] font-bold text-muted-foreground uppercase">Por etapa</p>
            {Object.entries(abandonmentStats.byStep).sort((a, b) => b[1] - a[1]).map(([step, count]) => (
              <div key={step} className="flex justify-between text-xs bg-muted rounded-lg px-3 py-1.5">
                <span className="text-muted-foreground capitalize">{step}</span>
                <Badge variant="secondary" className="text-[9px]">{count}</Badge>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Engagement Overview */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold">📊 Engajamento Geral</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-muted rounded-lg p-2.5 text-center">
            <p className="text-sm font-bold">{enrichedCustomers.filter(c => c.engagementScore >= 50).length}</p>
            <p className="text-[8px] text-muted-foreground">Engajados</p>
          </div>
          <div className="bg-muted rounded-lg p-2.5 text-center">
            <p className="text-sm font-bold">{favorites?.length || 0}</p>
            <p className="text-[8px] text-muted-foreground">Favoritos</p>
          </div>
          <div className="bg-muted rounded-lg p-2.5 text-center">
            <p className="text-sm font-bold">{reviews?.length || 0}</p>
            <p className="text-[8px] text-muted-foreground">Reviews</p>
          </div>
          <div className="bg-muted rounded-lg p-2.5 text-center">
            <p className="text-sm font-bold">{enrichedCustomers.filter(c => c.phone).length}</p>
            <p className="text-[8px] text-muted-foreground">Com WhatsApp</p>
          </div>
        </div>
      </motion.div>

      {/* Customer List */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input placeholder="Buscar cliente..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="bg-muted border-none min-h-[36px] text-sm flex-1" />
          <Select value={segmentFilter} onValueChange={setSegmentFilter}>
            <SelectTrigger className="h-9 text-[10px] w-28"><SelectValue placeholder="Segmento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(segmentConfig).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.emoji} {cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
            {filteredCustomers.slice(0, 50).map(c => (
              <div key={c.user_id} className="px-3 py-2.5 hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm">{segmentConfig[c.segment].emoji}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{c.full_name || "Sem nome"}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] text-muted-foreground">{c.orderCount} pedidos</span>
                        <span className="text-[9px] text-muted-foreground">•</span>
                        <span className="text-[9px] text-muted-foreground">{fmt(c.totalSpent)}</span>
                        {c.lastOrder && (
                          <>
                            <span className="text-[9px] text-muted-foreground">•</span>
                            <span className="text-[9px] text-muted-foreground">{c.daysSinceLastOrder}d atrás</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Engagement bar */}
                    <div className="w-12 bg-muted rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${c.engagementScore >= 60 ? "bg-accent" : c.engagementScore >= 30 ? "bg-primary" : "bg-destructive"}`}
                        style={{ width: `${c.engagementScore}%` }} />
                    </div>
                    <span className="text-[8px] text-muted-foreground w-6 text-right">{c.engagementScore}</span>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setSelectedCustomer(selectedCustomer === c.user_id ? null : c.user_id)}>
                      <Eye className="w-3 h-3" />
                    </Button>
                    {c.phone && (
                      <a href={getWhatsAppLink(c.phone, `Olá ${c.full_name || ""}! 😊 Aqui é da Elle Make. Temos novidades pra você! 💄✨`)} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="w-3.5 h-3.5 text-accent hover:text-accent/80" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Expanded customer detail */}
                {selectedCustomer === c.user_id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 pt-3 border-t border-border space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-muted rounded-lg p-2 text-center">
                        <p className="text-[9px] text-muted-foreground">Telefone</p>
                        <p className="text-[10px] font-medium">{c.phone || "—"}</p>
                      </div>
                      <div className="bg-muted rounded-lg p-2 text-center">
                        <p className="text-[9px] text-muted-foreground">Favoritos</p>
                        <p className="text-[10px] font-medium">{c.userFavorites}</p>
                      </div>
                      <div className="bg-muted rounded-lg p-2 text-center">
                        <p className="text-[9px] text-muted-foreground">Reviews</p>
                        <p className="text-[10px] font-medium">{c.userReviews} ({c.avgRating.toFixed(1)}⭐)</p>
                      </div>
                    </div>

                    {/* Editable fields */}
                    <div className="space-y-2 bg-muted/50 rounded-lg p-3">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">Informações do Lead</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-muted-foreground">📱 Telefone</label>
                          <Input
                            className="h-7 text-[10px] bg-background"
                            placeholder="(91) 99999-9999"
                            defaultValue={c.phone || ""}
                            onChange={e => setEditField(c.user_id, "phone", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-muted-foreground flex items-center gap-1"><Instagram className="w-2.5 h-2.5" /> Instagram</label>
                          <Input
                            className="h-7 text-[10px] bg-background"
                            placeholder="@username"
                            defaultValue={(c as any).instagram || ""}
                            onChange={e => setEditField(c.user_id, "instagram", e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] text-muted-foreground">📝 Observações</label>
                        <Textarea
                          className="text-[10px] bg-background min-h-[50px]"
                          placeholder="Anotações sobre o lead..."
                          defaultValue={(c as any).admin_notes || ""}
                          onChange={e => setEditField(c.user_id, "admin_notes", e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 grid grid-cols-2 gap-1 text-[9px]">
                          <span className="text-muted-foreground">CPF: <span className="text-foreground">{c.cpf || "—"}</span></span>
                          <span className="text-muted-foreground">Aniversário: <span className="text-foreground">{c.birthday ? new Date(c.birthday + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</span></span>
                          <span className="text-muted-foreground">Cadastro: <span className="text-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</span></span>
                          <span className="text-muted-foreground">Tier: <span className="text-foreground">{c.loyalty_tier || "bronze"}</span></span>
                        </div>
                        <Button
                          size="sm"
                          className="h-7 text-[10px] gap-1"
                          disabled={!editingFields[c.user_id] || updateProfileMutation.isPending}
                          onClick={() => handleSaveLead(c.user_id)}
                        >
                          {updateProfileMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          Salvar
                        </Button>
                      </div>
                    </div>

                    {/* Instagram link */}
                    {((editingFields[c.user_id]?.instagram || (c as any).instagram)) && (
                      <a
                        href={`https://instagram.com/${(editingFields[c.user_id]?.instagram || (c as any).instagram || "").replace("@", "")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-[10px] text-primary hover:underline"
                      >
                        <Instagram className="w-3 h-3" /> Ver perfil no Instagram
                      </a>
                    )}

                    {selectedOrders.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Últimos pedidos</p>
                        {selectedOrders.slice(0, 5).map(o => (
                          <div key={o.id} className="flex justify-between text-[10px] bg-muted rounded px-2 py-1">
                            <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")}</span>
                            <Badge variant="outline" className="text-[8px]">{o.status}</Badge>
                            <span className="font-medium">{fmt(Number(o.total))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            ))}
            {filteredCustomers.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-6">Nenhum cliente encontrado</p>
            )}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">{filteredCustomers.length} cliente(s)</p>
      </div>
    </div>
  );
};

export default CRMTab;
