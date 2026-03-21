import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, EyeOff, Pencil, Trash2, Tag, Users } from "lucide-react";
import { useInfluencers, useCreateInfluencer } from "@/hooks/useInfluencers";
import { toast } from "sonner";

const InfluencersTab = () => {
  const { data: influencers, isLoading } = useInfluencers();
  const createInfluencer = useCreateInfluencer();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ user_id: "", name: "", instagram: "", commission_percent: "10" });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: allCoupons } = useQuery({
    queryKey: ["admin-coupons-influencers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").not("influencer_id", "is", null);
      if (error) throw error;
      return data;
    },
  });

  const { data: ordersWithCoupons } = useQuery({
    queryKey: ["admin-orders-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id, total, discount, coupon_code, created_at, status").not("coupon_code", "is", null);
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => { setForm({ user_id: "", name: "", instagram: "", commission_percent: "10" }); setEditingId(null); setShowForm(false); };

  const openEdit = (inf: any) => {
    setForm({ user_id: inf.user_id, name: inf.name, instagram: inf.instagram || "", commission_percent: String(inf.commission_percent) });
    setEditingId(inf.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error("Nome é obrigatório"); return; }
    if (editingId) {
      const { error } = await supabase.from("influencers").update({
        name: form.name, instagram: form.instagram || null, commission_percent: parseFloat(form.commission_percent),
      }).eq("id", editingId);
      if (error) toast.error(error.message);
      else { toast.success("Influenciadora atualizada!"); queryClient.invalidateQueries({ queryKey: ["influencers"] }); resetForm(); }
    } else {
      if (!form.user_id) { toast.error("User ID é obrigatório"); return; }
      createInfluencer.mutate({
        user_id: form.user_id, name: form.name, instagram: form.instagram || null,
        commission_percent: parseFloat(form.commission_percent),
      }, {
        onSuccess: () => { toast.success("Influenciadora cadastrada!"); resetForm(); },
        onError: (e: any) => toast.error(e.message),
      });
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("influencers").update({ is_active: !active }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["influencers"] });
    toast.success(active ? "Desativada" : "Ativada");
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"?`)) return;
    const { error } = await supabase.from("influencers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Excluída!"); queryClient.invalidateQueries({ queryKey: ["influencers"] }); }
  };

  const handleCreateCoupon = async (inf: any) => {
    const code = `${inf.name.split(" ")[0].toUpperCase()}${Math.floor(Math.random() * 100)}`;
    const { error } = await supabase.from("coupons").insert({
      code, discount_type: "percentage", discount_value: inf.commission_percent,
      description: `Cupom da influenciadora ${inf.name}`, influencer_id: inf.id,
    });
    if (error) toast.error(error.message);
    else { toast.success(`Cupom ${code} criado!`); queryClient.invalidateQueries({ queryKey: ["admin-coupons-influencers"] }); }
  };

  const getInfluencerStats = (infId: string) => {
    const infCoupons = allCoupons?.filter(c => c.influencer_id === infId) || [];
    const couponCodes = infCoupons.map(c => c.code);
    const infOrders = ordersWithCoupons?.filter(o => couponCodes.includes(o.coupon_code || "")) || [];
    const activeOrders = infOrders.filter(o => o.status !== "cancelled" && o.status !== "refunded");
    return {
      infCoupons, infOrders: activeOrders, orderCount: activeOrders.length,
      totalRevenue: activeOrders.reduce((s, o) => s + Number(o.total), 0),
      totalDiscount: activeOrders.reduce((s, o) => s + Number(o.discount || 0), 0),
    };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }} size="sm" className="bg-primary text-primary-foreground text-xs gap-1">
          <Plus className="w-3 h-3" />{showForm ? "Fechar" : "Nova Influenciadora"}
        </Button>
        <Badge variant="secondary" className="text-[10px]">{influencers?.length || 0} cadastradas</Badge>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl p-4 border border-border space-y-3">
          <p className="text-xs font-bold">{editingId ? "Editar" : "Nova"} Influenciadora</p>
          <div className="grid grid-cols-2 gap-2">
            {!editingId && <div className="col-span-2 space-y-1"><Label className="text-xs">User ID (UUID)</Label><Input value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" placeholder="ID do usuário cadastrado" /></div>}
            <div className="space-y-1"><Label className="text-xs">Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" /></div>
            <div className="space-y-1"><Label className="text-xs">Instagram</Label><Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" placeholder="@usuario" /></div>
            <div className="space-y-1"><Label className="text-xs">Comissão (%)</Label><Input type="number" value={form.commission_percent} onChange={(e) => setForm({ ...form, commission_percent: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" /></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={createInfluencer.isPending} size="sm" className="text-xs bg-primary text-primary-foreground">{editingId ? "Salvar" : "Cadastrar"}</Button>
            {editingId && <Button onClick={resetForm} variant="outline" size="sm" className="text-xs">Cancelar</Button>}
          </div>
        </div>
      )}

      {isLoading ? <div className="text-center py-4 text-xs text-muted-foreground">Carregando...</div> : influencers?.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-4">Nenhuma influenciadora cadastrada</p>
      ) : influencers?.map((inf) => {
        const stats = getInfluencerStats(inf.id);
        const commissionValue = stats.totalRevenue * (inf.commission_percent / 100);
        const profit = stats.totalRevenue - stats.totalDiscount - commissionValue;
        const isExpanded = expandedId === inf.id;

        return (
          <div key={inf.id} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : inf.id)}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-bold">{inf.name}</p>
                  <p className="text-[10px] text-muted-foreground">{inf.instagram || "Sem Instagram"} • {inf.commission_percent}% comissão</p>
                </div>
                <Badge variant={inf.is_active ? "default" : "secondary"} className="text-[10px]">{inf.is_active ? "Ativa" : "Inativa"}</Badge>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[
                  { label: "Pedidos", value: stats.orderCount },
                  { label: "Receita", value: `R$ ${stats.totalRevenue.toFixed(0)}`, cls: "text-accent" },
                  { label: "Comissão", value: `R$ ${commissionValue.toFixed(2).replace(".", ",")}`, cls: "text-primary" },
                  { label: "Lucro", value: `R$ ${profit.toFixed(0)}`, cls: profit >= 0 ? "text-accent" : "text-destructive" },
                ].map(s => (
                  <div key={s.label} className="bg-muted rounded-lg p-2 text-center">
                    <p className="text-[9px] text-muted-foreground">{s.label}</p>
                    <p className={`text-xs font-bold ${s.cls || ""}`}>{s.value}</p>
                  </div>
                ))}
              </div>
              {stats.infCoupons.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {stats.infCoupons.map(c => (
                    <Badge key={c.id} variant="secondary" className="text-[9px] gap-1">
                      <Tag className="w-2.5 h-2.5" />{c.code} ({c.current_uses || 0} usos)
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {isExpanded && (
              <div className="px-4 pb-4 pt-1 border-t border-border space-y-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Detalhamento</p>
                  <div className="text-xs space-y-0.5">
                    <div className="flex justify-between"><span className="text-muted-foreground">Receita total</span><span>R$ {stats.totalRevenue.toFixed(2).replace(".", ",")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Descontos dados</span><span className="text-destructive">-R$ {stats.totalDiscount.toFixed(2).replace(".", ",")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Comissão ({inf.commission_percent}%)</span><span className="text-destructive">-R$ {commissionValue.toFixed(2).replace(".", ",")}</span></div>
                    <div className="flex justify-between border-t border-border pt-1 font-bold"><span>Lucro líquido</span><span className={profit >= 0 ? "text-accent" : "text-destructive"}>R$ {profit.toFixed(2).replace(".", ",")}</span></div>
                  </div>
                </div>
                {stats.infOrders.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Últimos pedidos</p>
                    {stats.infOrders.slice(0, 5).map(o => (
                      <div key={o.id} className="flex items-center justify-between text-[10px] bg-muted rounded-lg px-2 py-1.5">
                        <span className="text-muted-foreground">#{o.id.slice(0, 8)} • {new Date(o.created_at).toLocaleDateString("pt-BR")}</span>
                        <span className="font-medium">R$ {Number(o.total).toFixed(2).replace(".", ",")}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => openEdit(inf)} className="text-xs h-7 gap-1"><Pencil className="w-3 h-3" />Editar</Button>
                  <Button variant="outline" size="sm" onClick={() => handleToggle(inf.id, !!inf.is_active)} className="text-xs h-7 gap-1">
                    {inf.is_active ? <><EyeOff className="w-3 h-3" />Desativar</> : <><Eye className="w-3 h-3" />Ativar</>}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCreateCoupon(inf)} className="text-xs h-7 gap-1"><Tag className="w-3 h-3" />Novo Cupom</Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(inf.id, inf.name)} className="text-xs h-7 gap-1 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" />Excluir</Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default InfluencersTab;
