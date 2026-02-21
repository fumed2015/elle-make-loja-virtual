import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllOrders } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Percent, ArrowUpRight, ArrowDownRight } from "lucide-react";

const FinanceiroTab = () => {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const { data: orders } = useAllOrders();

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-fin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: commissions } = useQuery({
    queryKey: ["admin-commissions-fin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("influencer_commissions").select("*");
      if (error) throw error;
      return data;
    },
  });

  const now = new Date();
  const periodMs = period === "7d" ? 7 * 86400000 : period === "30d" ? 30 * 86400000 : period === "90d" ? 90 * 86400000 : Infinity;
  const cutoff = periodMs === Infinity ? new Date(0) : new Date(now.getTime() - periodMs);

  const filteredOrders = orders?.filter(o => new Date(o.created_at) >= cutoff) || [];
  const prevCutoff = periodMs === Infinity ? new Date(0) : new Date(cutoff.getTime() - periodMs);
  const prevOrders = orders?.filter(o => {
    const d = new Date(o.created_at);
    return d >= prevCutoff && d < cutoff;
  }) || [];

  // Revenue
  const revenue = filteredOrders.reduce((s, o) => s + Number(o.total), 0);
  const prevRevenue = prevOrders.reduce((s, o) => s + Number(o.total), 0);
  const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue * 100) : 0;

  // Discounts given
  const totalDiscounts = filteredOrders.reduce((s, o) => s + Number(o.discount || 0), 0);

  // Commissions paid
  const totalCommissions = commissions?.filter(c => new Date(c.created_at) >= cutoff)
    .reduce((s, c) => s + Number(c.commission_value), 0) || 0;

  // Net revenue
  const netRevenue = revenue - totalDiscounts - totalCommissions;

  // Ticket médio
  const avgTicket = filteredOrders.length > 0 ? revenue / filteredOrders.length : 0;
  const prevAvgTicket = prevOrders.length > 0 ? prevRevenue / prevOrders.length : 0;
  const ticketChange = prevAvgTicket > 0 ? ((avgTicket - prevAvgTicket) / prevAvgTicket * 100) : 0;

  // Orders count
  const orderCount = filteredOrders.length;
  const prevOrderCount = prevOrders.length;
  const orderChange = prevOrderCount > 0 ? ((orderCount - prevOrderCount) / prevOrderCount * 100) : 0;

  // Unique buyers
  const buyerSet = new Set(filteredOrders.map(o => o.user_id));
  const uniqueBuyers = buyerSet.size;

  // LTV (total revenue / unique buyers all time)
  const allBuyers = new Set(orders?.map(o => o.user_id) || []);
  const totalRevenueAll = orders?.reduce((s, o) => s + Number(o.total), 0) || 0;
  const ltv = allBuyers.size > 0 ? totalRevenueAll / allBuyers.size : 0;

  // Margin (revenue - discounts - commissions)
  const marginPercent = revenue > 0 ? (netRevenue / revenue * 100) : 0;

  // Revenue by day (last 30 days for chart-like display)
  const dailyRevenue: { date: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dayStr = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const dayOrders = orders?.filter(o => {
      const od = new Date(o.created_at);
      return od.toDateString() === d.toDateString();
    }) || [];
    dailyRevenue.push({ date: dayStr, value: dayOrders.reduce((s, o) => s + Number(o.total), 0) });
  }
  const maxDaily = Math.max(...dailyRevenue.map(d => d.value), 1);

  // Payment method breakdown
  const paymentMethods: Record<string, number> = {};
  filteredOrders.forEach(o => {
    const m = o.payment_method || "Não informado";
    paymentMethods[m] = (paymentMethods[m] || 0) + 1;
  });

  // Status breakdown
  const statusCounts: Record<string, number> = {};
  filteredOrders.forEach(o => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });

  const ChangeIndicator = ({ value }: { value: number }) => (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${value >= 0 ? "text-accent" : "text-destructive"}`}>
      {value >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">💰 Financeiro</h2>
        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
          <SelectTrigger className="h-7 text-[10px] w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 dias</SelectItem>
            <SelectItem value="30d">30 dias</SelectItem>
            <SelectItem value="90d">90 dias</SelectItem>
            <SelectItem value="all">Tudo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Receita Bruta", value: fmt(revenue), change: revenueChange, icon: DollarSign },
          { label: "Receita Líquida", value: fmt(netRevenue), icon: TrendingUp, accent: true },
          { label: "Ticket Médio", value: fmt(avgTicket), change: ticketChange, icon: ShoppingCart },
          { label: "Pedidos", value: orderCount, change: orderChange, icon: ShoppingCart },
          { label: "Compradores", value: uniqueBuyers, icon: Users },
          { label: "LTV Médio", value: fmt(ltv), icon: TrendingUp },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl p-4 border border-border">
            <kpi.icon className={`w-4 h-4 mb-1.5 ${(kpi as any).accent ? "text-accent" : "text-primary"}`} />
            <p className="text-lg font-bold">{kpi.value}</p>
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
              {kpi.change !== undefined && <ChangeIndicator value={kpi.change} />}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Margin & Expenses */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <p className="text-xs font-bold">Margem & Despesas</p>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Receita bruta</span>
            <span className="font-medium">{fmt(revenue)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">(-) Descontos/cupons</span>
            <span className="text-destructive">-{fmt(totalDiscounts)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">(-) Comissões influenciadoras</span>
            <span className="text-destructive">-{fmt(totalCommissions)}</span>
          </div>
          <div className="flex justify-between text-xs border-t border-border pt-2 font-bold">
            <span>Receita líquida</span>
            <span className={netRevenue >= 0 ? "text-accent" : "text-destructive"}>{fmt(netRevenue)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Margem</span>
            <span className="font-bold">{marginPercent.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Mini revenue chart */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <p className="text-xs font-bold">Receita últimos 7 dias</p>
        <div className="flex items-end gap-1 h-20">
          {dailyRevenue.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-primary/20 rounded-t-sm overflow-hidden" style={{ height: "60px" }}>
                <div className="bg-primary rounded-t-sm w-full transition-all" style={{ height: `${(d.value / maxDaily) * 100}%`, marginTop: `${100 - (d.value / maxDaily) * 100}%` }} />
              </div>
              <span className="text-[8px] text-muted-foreground">{d.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment methods & status */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl p-4 border border-border space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Pagamento</p>
          {Object.entries(paymentMethods).map(([m, c]) => (
            <div key={m} className="flex justify-between text-xs">
              <span className="text-muted-foreground capitalize">{m}</span>
              <Badge variant="secondary" className="text-[9px]">{c}</Badge>
            </div>
          ))}
          {Object.keys(paymentMethods).length === 0 && <p className="text-[10px] text-muted-foreground">Sem dados</p>}
        </div>
        <div className="bg-card rounded-xl p-4 border border-border space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Status Pedidos</p>
          {Object.entries(statusCounts).map(([s, c]) => (
            <div key={s} className="flex justify-between text-xs">
              <span className="text-muted-foreground capitalize">{s}</span>
              <Badge variant="secondary" className="text-[9px]">{c}</Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FinanceiroTab;
