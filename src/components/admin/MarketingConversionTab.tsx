import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "@/hooks/useProducts";
import { useAllOrders } from "@/hooks/useOrders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Megaphone, Plus, Trash2, Pencil, Clock, Zap, Gift, Image, Check, X, Loader2, Calendar, ShoppingCart, TrendingUp, MessageCircle, RefreshCw } from "lucide-react";

const MarketingConversionTab = () => {
  const queryClient = useQueryClient();
  const { data: products } = useProducts({});
  const { data: orders } = useAllOrders();
  const [showForm, setShowForm] = useState(false);
  const [triggeringRecovery, setTriggeringRecovery] = useState(false);

  // Cart abandonment data
  const { data: abandonments } = useQuery({
    queryKey: ["admin-abandonments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cart_abandonment_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  // PIX reminder notifications
  const { data: pixReminders } = useQuery({
    queryKey: ["admin-pix-reminders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("event_type", "pix.reminder")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  // Cart recovery notifications
  const { data: recoveryNotifs } = useQuery({
    queryKey: ["admin-recovery-notifs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("event_type", "cart.abandoned")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const abandonmentStats = useMemo(() => {
    if (!abandonments) return { total: 0, recovered: 0, notified: 0, rate: 0, totalValue: 0, recoveredValue: 0 };
    const total = abandonments.length;
    const recovered = abandonments.filter(a => (a as any).recovered_at).length;
    const notified = abandonments.filter(a => (a as any).notification_count > 0).length;
    const totalValue = abandonments.reduce((s, a) => s + Number(a.cart_total || 0), 0);
    const recoveredValue = abandonments.filter(a => (a as any).recovered_at).reduce((s, a) => s + Number(a.cart_total || 0), 0);
    return { total, recovered, notified, rate: total > 0 ? (recovered / total * 100) : 0, totalValue, recoveredValue };
  }, [abandonments]);

  const handleTriggerRecovery = async () => {
    setTriggeringRecovery(true);
    try {
      const { data, error } = await supabase.functions.invoke("cart-recovery", {
        body: { action: "process-abandonments" },
      });
      if (error) throw error;
      toast.success(`Processado! ${data?.sent || 0} mensagens enviadas`);
      queryClient.invalidateQueries({ queryKey: ["admin-abandonments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-recovery-notifs"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTriggeringRecovery(false);
    }
  };

  const handleTriggerPixReminders = async () => {
    setTriggeringRecovery(true);
    try {
      const { data, error } = await supabase.functions.invoke("cart-recovery", {
        body: { action: "process-pix-reminders" },
      });
      if (error) throw error;
      toast.success(`${data?.sent || 0} lembretes de PIX enviados`);
      queryClient.invalidateQueries({ queryKey: ["admin-pix-reminders"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTriggeringRecovery(false);
    }
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emptyForm = {
    title: "", description: "", type: "banner", discount_type: "percentage",
    discount_value: "0", image_url: "", link_url: "", is_active: false,
    starts_at: "", ends_at: "", position: "hero",
  };
  const [form, setForm] = useState(emptyForm);

  const { data: promotions, refetch } = useQuery({
    queryKey: ["admin-promotions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("promotions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const now = new Date();
  const activePromos = promotions?.filter(p => p.is_active) || [];
  const scheduledPromos = promotions?.filter(p => !p.is_active && p.starts_at && new Date(p.starts_at) > now) || [];

  const flashSales = promotions?.filter(p => p.type === "flash_sale" && p.is_active) || [];
  const kits = promotions?.filter(p => p.type === "kit") || [];

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false); };

  const openEdit = (p: any) => {
    setForm({
      title: p.title, description: p.description || "", type: p.type,
      discount_type: p.discount_type || "percentage", discount_value: String(p.discount_value || 0),
      image_url: p.image_url || "", link_url: p.link_url || "", is_active: p.is_active,
      starts_at: p.starts_at ? new Date(p.starts_at).toISOString().slice(0, 16) : "",
      ends_at: p.ends_at ? new Date(p.ends_at).toISOString().slice(0, 16) : "",
      position: p.position || "hero",
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error("Título obrigatório"); return; }
    setSubmitting(true);

    const payload = {
      title: form.title, description: form.description || null, type: form.type,
      discount_type: form.discount_type, discount_value: parseFloat(form.discount_value) || 0,
      image_url: form.image_url || null, link_url: form.link_url || null,
      is_active: form.is_active, position: form.position,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("promotions").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("promotions").insert(payload));
    }

    if (error) toast.error(error.message);
    else { toast.success(editingId ? "Promoção atualizada!" : "Promoção criada!"); resetForm(); refetch(); }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja remover esta promoção?")) return;
    const { error } = await supabase.from("promotions").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Removida!"); refetch(); }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from("promotions").update({ is_active: active }).eq("id", id);
    if (error) toast.error(error.message);
    else { refetch(); }
  };

  const typeLabels: Record<string, { label: string; emoji: string }> = {
    banner: { label: "Banner", emoji: "🖼️" },
    flash_sale: { label: "Flash Sale", emoji: "⚡" },
    kit: { label: "Kit/Combo", emoji: "🎁" },
    coupon_promo: { label: "Cupom Promocional", emoji: "🏷️" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-primary" /> Marketing & Conversão
        </h2>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }} className="text-xs h-8 gap-1">
          <Plus className="w-3.5 h-3.5" /> Nova Promoção
        </Button>
      </div>

      {/* ══════ CART RECOVERY DASHBOARD ══════ */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" /> Recuperação de Carrinho
          </p>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={handleTriggerRecovery} disabled={triggeringRecovery} className="text-[10px] h-7 gap-1">
              {triggeringRecovery ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Processar agora
            </Button>
            <Button size="sm" variant="outline" onClick={handleTriggerPixReminders} disabled={triggeringRecovery} className="text-[10px] h-7 gap-1">
              <MessageCircle className="w-3 h-3" /> PIX Pendentes
            </Button>
          </div>
        </div>

        {/* Abandonment KPIs */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {[
            { label: "Abandonos", value: abandonmentStats.total, emoji: "🛒" },
            { label: "Recuperados", value: abandonmentStats.recovered, emoji: "✅" },
            { label: "Taxa Recup.", value: `${abandonmentStats.rate.toFixed(1)}%`, emoji: "📈" },
            { label: "Notificados", value: abandonmentStats.notified, emoji: "📩" },
            { label: "Valor Perdido", value: `R$ ${abandonmentStats.totalValue.toFixed(0)}`, emoji: "💸" },
            { label: "Valor Recup.", value: `R$ ${abandonmentStats.recoveredValue.toFixed(0)}`, emoji: "💰" },
          ].map(s => (
            <div key={s.label} className="bg-muted rounded-lg p-2.5 text-center">
              <p className="text-sm">{s.emoji}</p>
              <p className="text-xs font-bold">{s.value}</p>
              <p className="text-[8px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Recent abandonments */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Últimos abandonos</p>
          {!abandonments || abandonments.length === 0 ? (
            <p className="text-[10px] text-muted-foreground text-center py-2">Nenhum abandono registrado 🎉</p>
          ) : (
            abandonments.slice(0, 10).map(a => (
              <div key={a.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                <div>
                  <p className="text-[10px] font-medium">
                    {a.items_count} {a.items_count === 1 ? "item" : "itens"} · R$ {Number(a.cart_total).toFixed(2).replace(".", ",")}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {" · Etapa: "}{a.step}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {(a as any).recovered_at ? (
                    <Badge className="text-[8px] bg-accent/15 text-accent">Recuperado ✅</Badge>
                  ) : (a as any).notification_count > 0 ? (
                    <Badge variant="outline" className="text-[8px]">Notificado ({(a as any).notification_count}x)</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[8px]">Pendente</Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recent PIX reminders */}
        {pixReminders && pixReminders.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Lembretes PIX recentes</p>
            {pixReminders.slice(0, 5).map(n => (
              <div key={n.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-1.5">
                <p className="text-[9px] text-muted-foreground truncate flex-1">{n.phone}</p>
                <div className="flex items-center gap-1.5">
                  <Badge variant={n.status === "sent" ? "secondary" : "destructive"} className="text-[8px]">
                    {n.status === "sent" ? "Enviado" : "Falhou"}
                  </Badge>
                  <span className="text-[8px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Ativas", value: activePromos.length, emoji: "✅" },
          { label: "Agendadas", value: scheduledPromos.length, emoji: "📅" },
          { label: "Flash Sales", value: flashSales.length, emoji: "⚡" },
          { label: "Kits", value: kits.length, emoji: "🎁" },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl p-3 border border-border text-center">
            <p className="text-sm">{s.emoji}</p>
            <p className="text-sm font-bold">{s.value}</p>
            <p className="text-[8px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="bg-card rounded-xl p-4 border-2 border-primary/30 space-y-3">
            <h3 className="text-sm font-bold">{editingId ? "Editar Promoção" : "Nova Promoção"}</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">Título</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="bg-muted border-none h-8 text-xs" placeholder="Black Friday 50% OFF" />
              </div>
              <div>
                <Label className="text-[10px]">Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-8 text-xs bg-muted border-none"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.emoji} {v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-[10px]">Descrição</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="bg-muted border-none text-xs min-h-[60px]" placeholder="Descrição da promoção..." />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[10px]">Tipo Desconto</Label>
                <Select value={form.discount_type} onValueChange={v => setForm({ ...form, discount_type: v })}>
                  <SelectTrigger className="h-8 text-xs bg-muted border-none"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual</SelectItem>
                    <SelectItem value="fixed">Valor fixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">Valor</Label>
                <Input type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: e.target.value })}
                  className="bg-muted border-none h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">Posição</Label>
                <Select value={form.position} onValueChange={v => setForm({ ...form, position: v })}>
                  <SelectTrigger className="h-8 text-xs bg-muted border-none"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hero">Hero</SelectItem>
                    <SelectItem value="sidebar">Sidebar</SelectItem>
                    <SelectItem value="popup">Popup</SelectItem>
                    <SelectItem value="bar">Barra topo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">Início (agendamento)</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={e => setForm({ ...form, starts_at: e.target.value })}
                  className="bg-muted border-none h-8 text-xs" />
              </div>
              <div>
                <Label className="text-[10px]">Fim</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={e => setForm({ ...form, ends_at: e.target.value })}
                  className="bg-muted border-none h-8 text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px]">URL da Imagem</Label>
                <Input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })}
                  className="bg-muted border-none h-8 text-xs" placeholder="https://..." />
              </div>
              <div>
                <Label className="text-[10px]">Link destino</Label>
                <Input value={form.link_url} onChange={e => setForm({ ...form, link_url: e.target.value })}
                  className="bg-muted border-none h-8 text-xs" placeholder="/categoria/promos" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label className="text-xs">Ativar imediatamente</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={submitting} className="text-xs gap-1 flex-1">
                {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                {editingId ? "Salvar" : "Criar"}
              </Button>
              <Button variant="outline" onClick={resetForm} className="text-xs"><X className="w-3 h-3" /></Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Flash Sales */}
      {flashSales.length > 0 && (
        <div className="bg-destructive/5 rounded-xl p-4 border border-destructive/20 space-y-2">
          <p className="text-xs font-bold flex items-center gap-1">⚡ Flash Sales Ativas</p>
          {flashSales.map(p => (
            <div key={p.id} className="flex items-center justify-between bg-card rounded-lg px-3 py-2">
              <div>
                <p className="text-xs font-medium">{p.title}</p>
                <p className="text-[9px] text-muted-foreground">
                  {p.discount_value}{p.discount_type === "percentage" ? "%" : " R$"} OFF
                  {p.ends_at && ` • Até ${new Date(p.ends_at).toLocaleDateString("pt-BR")}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEdit(p)}><Pencil className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All Promotions List */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <p className="text-xs font-bold">📋 Todas as Promoções</p>
        {!promotions || promotions.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-4">Nenhuma promoção cadastrada</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {promotions.map(p => {
              const type = typeLabels[p.type] || { label: p.type, emoji: "📌" };
              const isExpired = p.ends_at && new Date(p.ends_at) < now;
              const isScheduled = p.starts_at && new Date(p.starts_at) > now;
              return (
                <div key={p.id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${isExpired ? "bg-muted/50 opacity-60" : "bg-muted"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{type.emoji}</span>
                      <p className="text-xs font-medium truncate">{p.title}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <Badge variant="outline" className="text-[8px]">{type.label}</Badge>
                      {p.discount_value > 0 && (
                        <Badge variant="secondary" className="text-[8px]">
                          {p.discount_value}{p.discount_type === "percentage" ? "%" : " R$"} OFF
                        </Badge>
                      )}
                      {isScheduled && <Badge className="text-[8px] bg-blue-500/15 text-blue-700">📅 Agendada</Badge>}
                      {isExpired && <Badge variant="destructive" className="text-[8px]">Expirada</Badge>}
                      {p.starts_at && <span className="text-[8px] text-muted-foreground">{new Date(p.starts_at).toLocaleDateString("pt-BR")}</span>}
                      {p.ends_at && <span className="text-[8px] text-muted-foreground">→ {new Date(p.ends_at).toLocaleDateString("pt-BR")}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Switch checked={p.is_active} onCheckedChange={v => handleToggleActive(p.id, v)} />
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEdit(p)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketingConversionTab;
