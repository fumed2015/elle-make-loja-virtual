import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllOrders } from "@/hooks/useOrders";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Target, Users, ShoppingCart, TrendingUp, Crown, Award, Star, MessageCircle } from "lucide-react";

const ComercialTab = () => {
  const [monthlyGoal, setMonthlyGoal] = useState(() => localStorage.getItem("sales-goal") || "10000");
  const { data: orders } = useAllOrders();

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-com"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const CONFIRMED = ["approved", "confirmed", "processing", "shipped", "delivered"];
  const monthOrders = orders?.filter(o => new Date(o.created_at) >= monthStart && CONFIRMED.includes(o.status)) || [];
  const monthRevenue = monthOrders.reduce((s, o) => s + Number(o.total), 0);
  const goal = parseFloat(monthlyGoal) || 10000;
  const goalPercent = Math.min(100, (monthRevenue / goal) * 100);

  // ===== Funil de Vendas =====
  const activeOrders = orders?.filter(o => o.status !== "cancelled" && o.status !== "refunded") || [];
  const totalUsers = profiles?.length || 0;
  const usersWithPhone = profiles?.filter(p => p.phone).length || 0;
  const buyerIds = new Set(activeOrders.map(o => o.user_id));
  const firstTimeBuyers = buyerIds.size;

  // Recurrent buyers (2+ active orders)
  const orderCountByUser: Record<string, number> = {};
  activeOrders.forEach(o => { orderCountByUser[o.user_id] = (orderCountByUser[o.user_id] || 0) + 1; });
  const recurrentBuyers = Object.values(orderCountByUser).filter(c => c >= 2).length;

  const funnelSteps = [
    { label: "Cadastros", value: totalUsers, percent: 100 },
    { label: "Com telefone", value: usersWithPhone, percent: totalUsers > 0 ? (usersWithPhone / totalUsers * 100) : 0 },
    { label: "Primeira compra", value: firstTimeBuyers, percent: totalUsers > 0 ? (firstTimeBuyers / totalUsers * 100) : 0 },
    { label: "Recorrentes (2+)", value: recurrentBuyers, percent: totalUsers > 0 ? (recurrentBuyers / totalUsers * 100) : 0 },
  ];

  // ===== Segmentação =====
  const segments = profiles?.map(p => {
    const userOrders = activeOrders.filter(o => o.user_id === p.user_id);
    const totalSpent = userOrders.reduce((s, o) => s + Number(o.total), 0);
    const orderCount = userOrders.length;
    const lastOrder = userOrders.length > 0 ? new Date(Math.max(...userOrders.map(o => new Date(o.created_at).getTime()))) : null;
    const daysSinceLastOrder = lastOrder ? Math.floor((now.getTime() - lastOrder.getTime()) / 86400000) : Infinity;

    let segment: "vip" | "active" | "at-risk" | "dormant" | "new";
    if (totalSpent >= 500 && orderCount >= 3) segment = "vip";
    else if (orderCount >= 1 && daysSinceLastOrder <= 60) segment = "active";
    else if (orderCount >= 1 && daysSinceLastOrder > 60) segment = "at-risk";
    else if (orderCount === 0 && daysSinceLastOrder === Infinity) {
      const daysSinceSignup = Math.floor((now.getTime() - new Date(p.created_at).getTime()) / 86400000);
      segment = daysSinceSignup <= 30 ? "new" : "dormant";
    } else segment = "dormant";

    return { ...p, totalSpent, orderCount, lastOrder, daysSinceLastOrder, segment };
  }) || [];

  const segmentCounts = {
    vip: segments.filter(s => s.segment === "vip").length,
    active: segments.filter(s => s.segment === "active").length,
    "at-risk": segments.filter(s => s.segment === "at-risk").length,
    dormant: segments.filter(s => s.segment === "dormant").length,
    new: segments.filter(s => s.segment === "new").length,
  };

  const segmentConfig: Record<string, { label: string; emoji: string; color: string }> = {
    vip: { label: "VIP", emoji: "👑", color: "text-primary" },
    active: { label: "Ativo", emoji: "✅", color: "text-accent" },
    "at-risk": { label: "Em risco", emoji: "⚠️", color: "text-yellow-500" },
    dormant: { label: "Dormiente", emoji: "💤", color: "text-muted-foreground" },
    new: { label: "Novo", emoji: "🆕", color: "text-blue-500" },
  };

  // Top customers
  const topCustomers = [...segments].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

  const handleSaveGoal = () => {
    localStorage.setItem("sales-goal", monthlyGoal);
  };

  const getWhatsAppLink = (phone: string, name: string, msg: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold">📊 Comercial & Vendas</h2>

      {/* Monthly Goal */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold">Meta do Mês</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Meta:</span>
            <Input value={monthlyGoal} onChange={e => setMonthlyGoal(e.target.value)} onBlur={handleSaveGoal}
              className="w-24 h-6 text-[10px] bg-muted border-none px-2" type="number" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">R$ {monthRevenue.toFixed(0)} de R$ {goal.toFixed(0)}</span>
            <span className="font-bold">{goalPercent.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div className={`h-3 rounded-full transition-all ${goalPercent >= 100 ? "bg-accent" : goalPercent >= 60 ? "bg-primary" : "bg-yellow-500"}`}
              style={{ width: `${goalPercent}%` }} />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {goalPercent >= 100 ? "🎉 Meta atingida!" : `Faltam R$ ${(goal - monthRevenue).toFixed(0)} para a meta`}
          </p>
        </div>
        <div className="text-[10px] text-muted-foreground">{monthOrders.length} pedidos este mês</div>
      </motion.div>

      {/* Sales Funnel */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <p className="text-xs font-bold">🔥 Funil de Vendas</p>
        <div className="space-y-2">
          {funnelSteps.map((step, i) => (
            <div key={step.label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{step.label}</span>
                <span className="font-bold">{step.value} <span className="text-muted-foreground font-normal">({step.percent.toFixed(0)}%)</span></span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary/80 h-2 rounded-full transition-all" style={{ width: `${step.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Customer Segments */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <p className="text-xs font-bold">👥 Segmentação de Clientes</p>
        <div className="grid grid-cols-5 gap-1.5">
          {Object.entries(segmentCounts).map(([key, count]) => {
            const cfg = segmentConfig[key];
            return (
              <div key={key} className="bg-muted rounded-lg p-2 text-center">
                <p className="text-sm">{cfg.emoji}</p>
                <p className="text-xs font-bold">{count}</p>
                <p className="text-[8px] text-muted-foreground">{cfg.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Customers */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <p className="text-xs font-bold">🏆 Top Clientes</p>
        {topCustomers.length === 0 ? <p className="text-[10px] text-muted-foreground">Sem dados</p> :
          topCustomers.map((c, i) => (
            <div key={c.user_id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}.</span>
                <div>
                  <p className="text-xs font-medium">{c.full_name || "Sem nome"}</p>
                  <p className="text-[9px] text-muted-foreground">{c.orderCount} pedidos • {segmentConfig[c.segment].emoji} {segmentConfig[c.segment].label}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">R$ {c.totalSpent.toFixed(0)}</span>
                {c.phone && (
                  <a href={getWhatsAppLink(c.phone, c.full_name || "Cliente", `Olá ${c.full_name || ""}! 😊 Aqui é da Elle Make. Temos novidades incríveis pra você! 💄✨`)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-3.5 h-3.5 text-accent hover:text-accent/80" />
                  </a>
                )}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
};

export default ComercialTab;
