import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllOrders } from "@/hooks/useOrders";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Megaphone, Tag, TrendingUp, Calendar, Plus, Trash2, DollarSign, Percent, Users } from "lucide-react";
import { toast } from "sonner";

const MarketingTab = () => {
  const queryClient = useQueryClient();
  const { data: orders } = useAllOrders();
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campaign, setCampaign] = useState({ title: "", description: "", date: "", coupon_code: "" });

  const { data: coupons } = useQuery({
    queryKey: ["admin-coupons-mkt"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: campaigns } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: () => {
      const stored = localStorage.getItem("marketing-campaigns");
      return stored ? JSON.parse(stored) : [];
    },
  });

  const activeOrders = orders?.filter(o => o.status !== "cancelled" && o.status !== "refunded") || [];

  const couponAnalytics = coupons?.map(coupon => {
    const couponOrders = activeOrders.filter(o => o.coupon_code === coupon.code);
    const revenue = couponOrders.reduce((s, o) => s + Number(o.total), 0);
    const totalDiscount = couponOrders.reduce((s, o) => s + Number(o.discount || 0), 0);
    const roi = totalDiscount > 0 ? ((revenue - totalDiscount) / totalDiscount * 100) : 0;
    const uniqueUsers = new Set(couponOrders.map(o => o.user_id)).size;
    return { ...coupon, orderCount: couponOrders.length, revenue, totalDiscount, roi, uniqueUsers };
  }).sort((a, b) => b.orderCount - a.orderCount) || [];

  const totalCouponRevenue = couponAnalytics.reduce((s, c) => s + c.revenue, 0);
  const totalCouponDiscount = couponAnalytics.reduce((s, c) => s + c.totalDiscount, 0);
  const overallROI = totalCouponDiscount > 0 ? ((totalCouponRevenue - totalCouponDiscount) / totalCouponDiscount * 100) : 0;

  // Orders with coupons vs without (only active orders)
  const ordersWithCoupon = activeOrders.filter(o => o.coupon_code).length;
  const ordersWithoutCoupon = activeOrders.length - ordersWithCoupon;
  const couponUsageRate = activeOrders.length ? (ordersWithCoupon / activeOrders.length * 100) : 0;

  const handleSaveCampaign = () => {
    if (!campaign.title) { toast.error("Título é obrigatório"); return; }
    const newCampaigns = [...(campaigns || []), { ...campaign, id: Date.now().toString(), created_at: new Date().toISOString() }];
    localStorage.setItem("marketing-campaigns", JSON.stringify(newCampaigns));
    queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
    setCampaign({ title: "", description: "", date: "", coupon_code: "" });
    setShowCampaignForm(false);
    toast.success("Campanha salva!");
  };

  const handleDeleteCampaign = (id: string) => {
    const updated = (campaigns || []).filter((c: any) => c.id !== id);
    localStorage.setItem("marketing-campaigns", JSON.stringify(updated));
    queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
    toast.success("Campanha removida");
  };

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold">📣 Marketing</h2>

      {/* Overall coupon stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Receita via Cupom", value: fmt(totalCouponRevenue), icon: DollarSign },
          { label: "ROI Geral Cupons", value: `${overallROI.toFixed(0)}%`, icon: TrendingUp },
          { label: "Taxa de Uso", value: `${couponUsageRate.toFixed(1)}%`, icon: Percent, sub: `${ordersWithCoupon}/${orders?.length || 0}` },
          { label: "Desconto Total", value: fmt(totalCouponDiscount), icon: Tag },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl p-3 border border-border">
            <kpi.icon className="w-4 h-4 mb-1 text-primary" />
            <p className="text-sm font-bold">{kpi.value}</p>
            <p className="text-[9px] text-muted-foreground">{kpi.label}</p>
            {(kpi as any).sub && <p className="text-[8px] text-muted-foreground">{(kpi as any).sub}</p>}
          </motion.div>
        ))}
      </div>

      {/* Per-Coupon Analytics */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <p className="text-xs font-bold">🏷️ Performance por Cupom</p>
        {couponAnalytics.length === 0 ? <p className="text-[10px] text-muted-foreground">Nenhum cupom cadastrado</p> :
          <div className="max-h-64 overflow-y-auto space-y-2">
            {couponAnalytics.map(c => (
              <div key={c.id} className="bg-muted rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px] font-mono">{c.code}</Badge>
                    <Badge variant={c.is_active ? "default" : "outline"} className="text-[9px]">{c.is_active ? "Ativo" : "Inativo"}</Badge>
                  </div>
                  <span className="text-xs font-bold">{c.orderCount} usos</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground">Receita</p>
                    <p className="text-[10px] font-bold">R$ {c.revenue.toFixed(0)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground">Desconto</p>
                    <p className="text-[10px] font-bold text-destructive">R$ {c.totalDiscount.toFixed(0)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground">ROI</p>
                    <p className={`text-[10px] font-bold ${c.roi >= 0 ? "text-accent" : "text-destructive"}`}>{c.roi.toFixed(0)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground">Clientes</p>
                    <p className="text-[10px] font-bold">{c.uniqueUsers}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        }
      </div>

      {/* Campaign Calendar */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold">Calendário Promocional</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowCampaignForm(!showCampaignForm)} className="text-[10px] h-7 gap-1">
            <Plus className="w-3 h-3" />{showCampaignForm ? "Fechar" : "Nova Campanha"}
          </Button>
        </div>

        {showCampaignForm && (
          <div className="bg-muted rounded-lg p-3 space-y-2">
            <div className="space-y-1">
              <Label className="text-[10px]">Título</Label>
              <Input value={campaign.title} onChange={e => setCampaign({ ...campaign, title: e.target.value })} className="bg-background border-none min-h-[32px] text-xs" placeholder="Ex: Black Friday" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Data</Label>
                <Input type="date" value={campaign.date} onChange={e => setCampaign({ ...campaign, date: e.target.value })} className="bg-background border-none min-h-[32px] text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Cupom vinculado</Label>
                <Input value={campaign.coupon_code} onChange={e => setCampaign({ ...campaign, coupon_code: e.target.value.toUpperCase() })} className="bg-background border-none min-h-[32px] text-xs" placeholder="BLACKFRIDAY" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Descrição</Label>
              <Textarea value={campaign.description} onChange={e => setCampaign({ ...campaign, description: e.target.value })} className="bg-background border-none min-h-[48px] text-xs resize-none" placeholder="Detalhes da campanha..." />
            </div>
            <Button onClick={handleSaveCampaign} size="sm" className="text-xs h-7">Salvar</Button>
          </div>
        )}

        <div className="space-y-1.5">
          {(!campaigns || campaigns.length === 0) ? <p className="text-[10px] text-muted-foreground text-center py-2">Nenhuma campanha planejada</p> :
            [...campaigns].sort((a: any, b: any) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()).map((c: any) => {
              const isUpcoming = c.date && new Date(c.date + "T23:59:59") >= new Date();
              const isPast = c.date && new Date(c.date + "T23:59:59") < new Date();
              return (
                <div key={c.id} className={`flex items-start justify-between rounded-lg px-3 py-2.5 ${isUpcoming ? "bg-primary/5 border border-primary/20" : "bg-muted"}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-medium">{c.title}</p>
                      {isUpcoming && <Badge className="text-[8px] bg-primary text-primary-foreground">Próxima</Badge>}
                      {isPast && <Badge variant="outline" className="text-[8px]">Passada</Badge>}
                    </div>
                    <p className="text-[9px] text-muted-foreground">
                      {c.date ? new Date(c.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "Sem data"}
                      {c.coupon_code && ` • Cupom: ${c.coupon_code}`}
                    </p>
                    {c.description && <p className="text-[9px] text-muted-foreground mt-0.5">{c.description}</p>}
                  </div>
                  <button onClick={() => handleDeleteCampaign(c.id)} className="text-muted-foreground hover:text-destructive ml-2 mt-0.5"><Trash2 className="w-3 h-3" /></button>
                </div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
};

export default MarketingTab;
