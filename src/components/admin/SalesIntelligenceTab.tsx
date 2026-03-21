import { useState, useMemo, useRef } from "react";
import { useAllOrders } from "@/hooks/useOrders";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Flame, Clock, Package, Award, ArrowUpRight, ArrowDownRight } from "lucide-react";

const SalesIntelligenceTab = () => {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const { data: orders } = useAllOrders();
  const { data: products } = useProducts({});
  const { data: categories } = useCategories();

  const periodMs = period === "7d" ? 7 * 86400000 : period === "30d" ? 30 * 86400000 : period === "90d" ? 90 * 86400000 : Infinity;

  const CONFIRMED = ["approved", "confirmed", "processing", "shipped", "delivered"];
  const filteredOrders = useMemo(() => {
    const now = Date.now();
    const cutoff = periodMs === Infinity ? 0 : now - periodMs;
    return orders?.filter(o => CONFIRMED.includes(o.status) && new Date(o.created_at).getTime() >= cutoff) || [];
  }, [orders, periodMs]);

  // ===== TOP SELLING PRODUCTS =====
  const productSales = useMemo(() => {
    const map: Record<string, { qty: number; revenue: number; name: string; brand: string; price: number; cost: number }> = {};
    filteredOrders.forEach(o => {
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach((item: any) => {
        const id = item.product_id;
        if (!id) return;
        const qty = item.quantity || 1;
        const price = item.price || 0;
        if (!map[id]) {
          const prod = products?.find(p => p.id === id);
          map[id] = { qty: 0, revenue: 0, name: prod?.name || item.name || "Desconhecido", brand: prod?.brand || "", price: prod?.price || price, cost: 0 };
        }
        map[id].qty += qty;
        map[id].revenue += qty * price;
      });
    });
    return Object.entries(map)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, products]);

  const top10Products = productSales.slice(0, 10);

  // ===== MARGIN BY BRAND =====
  const brandAnalysis = useMemo(() => {
    const map: Record<string, { revenue: number; qty: number; orders: number }> = {};
    filteredOrders.forEach(o => {
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach((item: any) => {
        const prod = products?.find(p => p.id === item.product_id);
        const brand = prod?.brand || "Sem marca";
        if (!map[brand]) map[brand] = { revenue: 0, qty: 0, orders: 0 };
        map[brand].revenue += (item.quantity || 1) * (item.price || 0);
        map[brand].qty += item.quantity || 1;
        map[brand].orders += 1;
      });
    });
    return Object.entries(map)
      .map(([brand, data]) => ({ brand, ...data, avgTicket: data.orders > 0 ? data.revenue / data.orders : 0 }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, products]);

  // ===== CATEGORY ANALYSIS =====
  const categoryAnalysis = useMemo(() => {
    const map: Record<string, { revenue: number; qty: number; name: string }> = {};
    filteredOrders.forEach(o => {
      const items = Array.isArray(o.items) ? o.items : [];
      items.forEach((item: any) => {
        const prod = products?.find(p => p.id === item.product_id);
        const catId = prod?.category_id || "none";
        const cat = categories?.find(c => c.id === catId);
        const catName = cat?.name || "Sem categoria";
        if (!map[catId]) map[catId] = { revenue: 0, qty: 0, name: catName };
        map[catId].revenue += (item.quantity || 1) * (item.price || 0);
        map[catId].qty += item.quantity || 1;
      });
    });
    return Object.entries(map)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders, products, categories]);

  // ===== SALES HEATMAP (hour x day of week) =====
  const heatmapData = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    filteredOrders.forEach(o => {
      const d = new Date(o.created_at);
      grid[d.getDay()][d.getHours()] += Number(o.total);
    });
    return grid;
  }, [filteredOrders]);

  const maxHeat = useMemo(() => Math.max(...heatmapData.flat(), 1), [heatmapData]);
  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // ===== DEMAND FORECASTING (velocity) =====
  const demandForecast = useMemo(() => {
    if (!products) return [];
    const days = periodMs === Infinity ? 90 : periodMs / 86400000;
    return productSales
      .filter(ps => ps.qty > 0)
      .map(ps => {
        const prod = products.find(p => p.id === ps.id);
        const stock = prod?.stock ?? 0;
        const dailyVelocity = ps.qty / days;
        const daysUntilStockout = dailyVelocity > 0 ? Math.floor(stock / dailyVelocity) : Infinity;
        return {
          id: ps.id,
          name: ps.name,
          brand: ps.brand,
          stock,
          dailyVelocity,
          daysUntilStockout,
          weeklyForecast: Math.round(dailyVelocity * 7),
        };
      })
      .filter(p => p.daysUntilStockout < 60)
      .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout)
      .slice(0, 10);
  }, [productSales, products, periodMs]);

  // Peak hour
  const peakHour = useMemo(() => {
    let maxVal = 0, peakH = 0, peakD = 0;
    heatmapData.forEach((row, d) => row.forEach((val, h) => {
      if (val > maxVal) { maxVal = val; peakH = h; peakD = d; }
    }));
    return { hour: peakH, day: peakD, value: maxVal };
  }, [heatmapData]);

  const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
  const totalRevenue = filteredOrders.reduce((s, o) => s + Number(o.total), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Inteligência de Vendas
        </h2>
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

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card rounded-xl p-3 border border-border text-center">
          <p className="text-lg font-bold">{productSales.length}</p>
          <p className="text-[9px] text-muted-foreground">Produtos vendidos</p>
        </div>
        <div className="bg-card rounded-xl p-3 border border-border text-center">
          <p className="text-lg font-bold">{productSales.reduce((s, p) => s + p.qty, 0)}</p>
          <p className="text-[9px] text-muted-foreground">Unidades vendidas</p>
        </div>
        <div className="bg-card rounded-xl p-3 border border-border text-center">
          <p className="text-lg font-bold text-primary">{peakHour.hour}h</p>
          <p className="text-[9px] text-muted-foreground">Horário pico ({dayLabels[peakHour.day]})</p>
        </div>
      </div>

      {/* Top 10 Products */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold">🏆 Top 10 Produtos Mais Vendidos</p>
        </div>
        {top10Products.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">Sem dados de vendas no período</p>
        ) : (
          <div className="space-y-2">
            {top10Products.map((p, i) => {
              const share = totalRevenue > 0 ? (p.revenue / totalRevenue * 100) : 0;
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <span className={`text-xs font-bold w-5 text-center ${i < 3 ? "text-primary" : "text-muted-foreground"}`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium truncate">{p.name}</p>
                      <span className="text-xs font-bold flex-shrink-0 ml-2">{fmt(p.revenue)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 bg-muted rounded-full h-1.5">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${share}%` }} />
                      </div>
                      <span className="text-[9px] text-muted-foreground flex-shrink-0">{p.qty} un • {share.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Brand Analysis */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card rounded-xl p-4 border border-border space-y-3">
        <p className="text-xs font-bold">💄 Receita por Marca</p>
        {brandAnalysis.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">Sem dados</p>
        ) : (
          <div className="space-y-2">
            {brandAnalysis.slice(0, 8).map((b) => {
              const share = totalRevenue > 0 ? (b.revenue / totalRevenue * 100) : 0;
              return (
                <div key={b.brand} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{b.brand}</span>
                    <span className="text-muted-foreground">{fmt(b.revenue)} ({share.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-accent h-1.5 rounded-full" style={{ width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Category Analysis */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-card rounded-xl p-4 border border-border space-y-3">
        <p className="text-xs font-bold">📁 Receita por Categoria</p>
        {categoryAnalysis.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">Sem dados</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {categoryAnalysis.slice(0, 6).map((c) => (
              <div key={c.id} className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xs font-bold">{fmt(c.revenue)}</p>
                <p className="text-[9px] text-muted-foreground">{c.name}</p>
                <p className="text-[8px] text-muted-foreground">{c.qty} un.</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Sales Heatmap */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold">🔥 Mapa de Calor de Vendas</p>
        </div>
        <p className="text-[10px] text-muted-foreground">Receita por dia da semana e horário</p>
        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            {/* Hour labels */}
            <div className="flex gap-[2px] mb-1 ml-8">
              {[0, 3, 6, 9, 12, 15, 18, 21].map(h => (
                <span key={h} className="text-[7px] text-muted-foreground" style={{ width: `${100 / 8}%` }}>{h}h</span>
              ))}
            </div>
            {/* Grid */}
            {heatmapData.map((row, dayIdx) => (
              <div key={dayIdx} className="flex items-center gap-[2px] mb-[2px]">
                <span className="text-[8px] text-muted-foreground w-7 text-right pr-1">{dayLabels[dayIdx]}</span>
                {row.map((val, hourIdx) => {
                  const intensity = val / maxHeat;
                  return (
                    <div
                      key={hourIdx}
                      className="flex-1 h-4 rounded-[2px] transition-colors"
                      style={{
                        backgroundColor: intensity === 0
                          ? "hsl(var(--muted))"
                          : `hsl(var(--primary) / ${0.15 + intensity * 0.85})`,
                      }}
                      title={`${dayLabels[dayIdx]} ${hourIdx}h: ${fmt(val)}`}
                    />
                  );
                })}
              </div>
            ))}
            {/* Legend */}
            <div className="flex items-center justify-end gap-1 mt-2">
              <span className="text-[7px] text-muted-foreground">Menos</span>
              {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
                <div key={i} className="w-3 h-3 rounded-[2px]"
                  style={{ backgroundColor: v === 0 ? "hsl(var(--muted))" : `hsl(var(--primary) / ${0.15 + v * 0.85})` }} />
              ))}
              <span className="text-[7px] text-muted-foreground">Mais</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Demand Forecast */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold">📈 Previsão de Demanda</p>
        </div>
        <p className="text-[10px] text-muted-foreground">Produtos com previsão de esgotamento baseada na velocidade de vendas</p>
        {demandForecast.length === 0 ? (
          <p className="text-[10px] text-muted-foreground">Nenhum produto com risco de esgotamento nos próximos 60 dias</p>
        ) : (
          <div className="space-y-2">
            {demandForecast.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{p.name}</p>
                  <p className="text-[9px] text-muted-foreground">{p.brand} • {p.dailyVelocity.toFixed(1)} un/dia • ~{p.weeklyForecast} un/sem</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="outline" className="text-[9px]">{p.stock} em estoque</Badge>
                  <Badge
                    variant={p.daysUntilStockout <= 7 ? "destructive" : p.daysUntilStockout <= 14 ? "secondary" : "outline"}
                    className="text-[9px]"
                  >
                    {p.daysUntilStockout <= 0 ? "Esgotado!" : `~${p.daysUntilStockout}d`}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default SalesIntelligenceTab;
