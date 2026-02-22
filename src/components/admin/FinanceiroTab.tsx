import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllOrders } from "@/hooks/useOrders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  DollarSign, Package, TrendingUp, Calculator, Save, Loader2,
  Truck, ShoppingCart, Settings2, Pencil,
  AlertTriangle, CheckCircle, Search, BarChart3, PieChart, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

// ── Types ──
interface FinancialPremises {
  id: string;
  fixed_cost_platform: number;
  fixed_cost_platform_label: string;
  fixed_cost_whatsgw: number;
  fixed_cost_whatsgw_label: string;
  fixed_cost_other: number;
  fixed_cost_other_label: string;
  fixed_cost_extra1: number;
  fixed_cost_extra1_label: string;
  fixed_cost_extra2: number;
  fixed_cost_extra2_label: string;
  fixed_cost_extra3: number;
  fixed_cost_extra3_label: string;
  marketing_budget: number;
  order_target: number;
  packaging_cost: number;
  gateway_rate_credit: number;
  gateway_rate_credit_fixed: number;
  gateway_rate_pix: number;
  gateway_rate_debit: number;
  gateway_rate_physical: number;
  influencer_commission_rate: number;
  desired_margin: number;
  freight_batch_total: number;
  freight_batch_items: number;
}

interface ProductCost {
  id: string;
  product_id: string;
  cost_base: number;
  freight_per_unit: number;
  notes: string | null;
}

const DEFAULT_PREMISES: Omit<FinancialPremises, "id"> = {
  fixed_cost_platform: 69,
  fixed_cost_platform_label: "Nuvemshop",
  fixed_cost_whatsgw: 99,
  fixed_cost_whatsgw_label: "WhatsGW",
  fixed_cost_other: 0,
  fixed_cost_other_label: "",
  fixed_cost_extra1: 0,
  fixed_cost_extra1_label: "",
  fixed_cost_extra2: 0,
  fixed_cost_extra2_label: "",
  fixed_cost_extra3: 0,
  fixed_cost_extra3_label: "",
  marketing_budget: 0,
  order_target: 100,
  packaging_cost: 2.5,
  gateway_rate_credit: 4.19,
  gateway_rate_credit_fixed: 0.35,
  gateway_rate_pix: 0.99,
  gateway_rate_debit: 0.74,
  gateway_rate_physical: 0.74,
  influencer_commission_rate: 10,
  desired_margin: 30,
  freight_batch_total: 0,
  freight_batch_items: 1,
};

const fmt = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const getGatewayRate = (premises: FinancialPremises, method: string | null): { pct: number; fixed: number } => {
  switch (method) {
    case "pix": return { pct: Number(premises.gateway_rate_pix), fixed: 0 };
    case "debit": return { pct: Number(premises.gateway_rate_debit), fixed: 0 };
    case "physical":
    case "presencial": return { pct: Number(premises.gateway_rate_physical), fixed: 0 };
    case "credit":
    case "card":
    default: return { pct: Number(premises.gateway_rate_credit), fixed: Number(premises.gateway_rate_credit_fixed) };
  }
};

/** Editable label+value row for fixed costs */
const EditableCostRow = ({ label, labelField, valueField, premises, onUpdate }: {
  label: string;
  labelField: keyof FinancialPremises;
  valueField: keyof FinancialPremises;
  premises: Partial<FinancialPremises> | undefined;
  onUpdate: (field: keyof FinancialPremises, value: string) => void;
}) => {
  const [editingLabel, setEditingLabel] = useState(false);
  const currentLabel = String(premises?.[labelField] ?? label);
  const currentValue = premises?.[valueField] ?? 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        {editingLabel ? (
          <Input
            value={currentLabel}
            onChange={e => onUpdate(labelField, e.target.value)}
            onBlur={() => setEditingLabel(false)}
            onKeyDown={e => e.key === "Enter" && setEditingLabel(false)}
            autoFocus
            className="h-5 text-[10px] px-1 py-0 border-primary"
          />
        ) : (
          <button
            onClick={() => setEditingLabel(true)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors group"
          >
            <span>{currentLabel || "Sem nome (clique para editar)"}</span>
            <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>
      <Input
        type="number"
        step="0.01"
        value={currentValue as number}
        onChange={e => onUpdate(valueField, e.target.value)}
        className="h-9 text-xs"
      />
    </div>
  );
};

const FinanceiroTab = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("audit");
  const [productSearch, setProductSearch] = useState("");
  const [editingCosts, setEditingCosts] = useState<Record<string, { cost_base: string; freight_per_unit: string; notes: string }>>({});
  const [savingProduct, setSavingProduct] = useState<string | null>(null);

  // ── Queries ──
  const { data: products } = useQuery({
    queryKey: ["products-active-financial"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name, slug)")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: orders } = useAllOrders();

  const { data: premises, isLoading: premisesLoading } = useQuery({
    queryKey: ["financial-premises"],
    queryFn: async () => {
      const { data, error } = await supabase.from("financial_premises").select("*").limit(1).maybeSingle();
      if (error) throw error;
      if (!data) {
        const { data: inserted, error: insertErr } = await supabase
          .from("financial_premises")
          .insert(DEFAULT_PREMISES as any)
          .select()
          .single();
        if (insertErr) throw insertErr;
        return inserted as unknown as FinancialPremises;
      }
      return data as unknown as FinancialPremises;
    },
  });

  const { data: productCosts } = useQuery({
    queryKey: ["product-costs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_costs").select("*");
      if (error) throw error;
      return data as unknown as ProductCost[];
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

  // ── Premises form state ──
  const [premisesForm, setPremisesForm] = useState<Partial<FinancialPremises> | null>(null);
  const activePremises = premisesForm || premises;

  const updatePremisesField = (field: keyof FinancialPremises, value: string) => {
    const isLabel = field.endsWith("_label");
    const numVal = isLabel ? value : parseFloat(value) || 0;
    setPremisesForm(prev => ({
      ...(prev || premises || {}),
      [field]: numVal,
    } as FinancialPremises));
  };

  // ── Mutations ──
  const savePremises = useMutation({
    mutationFn: async () => {
      if (!premisesForm || !premises?.id) return;
      const { id, ...updates } = premisesForm as FinancialPremises;
      const { error } = await supabase.from("financial_premises").update(updates as any).eq("id", premises.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-premises"] });
      setPremisesForm(null);
      toast.success("Premissas salvas!");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const saveProductCost = useCallback(async (productId: string, costBase: number, freightPerUnit: number, notes: string) => {
    setSavingProduct(productId);
    try {
      const { error } = await supabase.from("product_costs").upsert({
        product_id: productId,
        cost_base: costBase,
        freight_per_unit: freightPerUnit,
        notes: notes || null,
      } as any, { onConflict: "product_id" });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["product-costs"] });
      setEditingCosts(prev => { const next = { ...prev }; delete next[productId]; return next; });
      toast.success("Custo salvo!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingProduct(null);
    }
  }, [queryClient]);

  // ── Computed values ──
  const p = activePremises;

  const totalFixedCosts = useMemo(() => {
    if (!p) return 0;
    return Number(p.fixed_cost_platform || 0) + Number(p.fixed_cost_whatsgw || 0) +
      Number(p.fixed_cost_other || 0) + Number(p.fixed_cost_extra1 || 0) +
      Number(p.fixed_cost_extra2 || 0) + Number(p.fixed_cost_extra3 || 0);
  }, [p]);

  const cacUnitario = useMemo(() => {
    if (!p || Number(p.order_target) <= 0) return 0;
    return (totalFixedCosts + Number(p.marketing_budget)) / Number(p.order_target);
  }, [p, totalFixedCosts]);

  const freightPerUnit = useMemo(() => {
    if (!p || Number(p.freight_batch_items) <= 0) return 0;
    return Number(p.freight_batch_total) / Number(p.freight_batch_items);
  }, [p]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    const search = productSearch.toLowerCase();
    return products.filter(prod =>
      prod.name.toLowerCase().includes(search) ||
      (prod.brand || "").toLowerCase().includes(search)
    );
  }, [products, productSearch]);

  const costMap = useMemo(() => {
    const map: Record<string, ProductCost> = {};
    productCosts?.forEach(c => { map[c.product_id] = c; });
    return map;
  }, [productCosts]);

  const revenueStats = useMemo(() => {
    if (!orders || !p) return { revenue: 0, netRevenue: 0, orderCount: 0, avgTicket: 0, discounts: 0, commissionsTotal: 0 };
    const now = new Date();
    const cutoff = new Date(now.getTime() - 30 * 86400000);
    const filtered = orders.filter(o => new Date(o.created_at) >= cutoff && o.status !== "cancelled");
    const revenue = filtered.reduce((s, o) => s + Number(o.total), 0);
    const discounts = filtered.reduce((s, o) => s + Number(o.discount || 0), 0);
    const commissionsTotal = commissions?.filter(c => new Date(c.created_at) >= cutoff)
      .reduce((s, c) => s + Number(c.commission_value), 0) || 0;
    const gatewayTotal = filtered.reduce((s, o) => {
      const { pct, fixed } = getGatewayRate(p as FinancialPremises, o.payment_method);
      return s + (Number(o.total) * pct / 100) + fixed;
    }, 0);

    return {
      revenue,
      netRevenue: revenue - discounts - commissionsTotal - gatewayTotal,
      orderCount: filtered.length,
      avgTicket: filtered.length > 0 ? revenue / filtered.length : 0,
      discounts,
      commissionsTotal,
    };
  }, [orders, commissions, p]);

  const calcMarkup = useCallback((costBase: number, freightUnit: number) => {
    if (!p) return { suggestedPrice: 0, totalCost: 0, margin: 0, profit: 0, marginPct: 0, contributionMargin: 0, cmvTotal: 0, variableCosts: 0 };
    const cmvTotal = costBase + freightUnit;
    const packaging = Number(p.packaging_cost);
    const fixedUnit = cacUnitario;
    const creditFixed = Number(p.gateway_rate_credit_fixed);
    const gatewayRate = Number(p.gateway_rate_credit) / 100;
    const commissionRate = Number(p.influencer_commission_rate) / 100;
    const desiredMargin = Number(p.desired_margin) / 100;
    const divisor = 1 - (gatewayRate + commissionRate + desiredMargin);
    const suggestedPrice = divisor > 0 ? (cmvTotal + packaging + fixedUnit + creditFixed) / divisor : 0;
    const variableCosts = packaging + (suggestedPrice * gatewayRate) + creditFixed + (suggestedPrice * commissionRate);
    const totalCost = cmvTotal + variableCosts + fixedUnit;
    const profit = suggestedPrice - totalCost;
    const marginPct = suggestedPrice > 0 ? (profit / suggestedPrice) * 100 : 0;
    const contributionMargin = suggestedPrice - (cmvTotal + variableCosts);
    return { suggestedPrice, totalCost, profit, marginPct, contributionMargin, cmvTotal, variableCosts };
  }, [p, cacUnitario]);

  const calcAtPrice = useCallback((sellingPrice: number, costBase: number, freightUnit: number) => {
    if (!p || sellingPrice <= 0) return { totalCost: 0, profit: 0, marginPct: 0, contributionMargin: 0 };
    const cmvTotal = costBase + freightUnit;
    const packaging = Number(p.packaging_cost);
    const gatewayRate = Number(p.gateway_rate_credit) / 100;
    const creditFixed = Number(p.gateway_rate_credit_fixed);
    const commissionRate = Number(p.influencer_commission_rate) / 100;
    const variableCosts = packaging + (sellingPrice * gatewayRate) + creditFixed + (sellingPrice * commissionRate);
    const totalCost = cmvTotal + variableCosts + cacUnitario;
    const profit = sellingPrice - totalCost;
    const marginPct = (profit / sellingPrice) * 100;
    const contributionMargin = sellingPrice - (cmvTotal + variableCosts);
    return { totalCost, profit, marginPct, contributionMargin };
  }, [p, cacUnitario]);

  if (premisesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">💰 Controle Financeiro</h2>
      </div>

      {/* Revenue Summary */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Receita 30d", value: fmt(revenueStats.revenue), icon: DollarSign },
          { label: "Receita Líquida", value: fmt(revenueStats.netRevenue), icon: TrendingUp, accent: true },
          { label: "Ticket Médio", value: fmt(revenueStats.avgTicket), icon: ShoppingCart },
          { label: "CAC Unitário", value: fmt(cacUnitario), icon: Calculator },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl p-4 border border-border">
            <kpi.icon className={`w-4 h-4 mb-1.5 ${(kpi as any).accent ? "text-accent" : "text-primary"}`} />
            <p className="text-lg font-bold">{kpi.value}</p>
            <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-5 h-9">
          <TabsTrigger value="audit" className="text-[10px] gap-1"><TrendingUp className="w-3 h-3" />Auditoria</TabsTrigger>
          <TabsTrigger value="cmv" className="text-[10px] gap-1"><Package className="w-3 h-3" />CMV</TabsTrigger>
          <TabsTrigger value="premises" className="text-[10px] gap-1"><Settings2 className="w-3 h-3" />Premissas</TabsTrigger>
          <TabsTrigger value="pricing" className="text-[10px] gap-1"><Calculator className="w-3 h-3" />Preços</TabsTrigger>
          <TabsTrigger value="dre" className="text-[10px] gap-1"><DollarSign className="w-3 h-3" />DRE</TabsTrigger>
        </TabsList>

        {/* ══════════════════ AUDIT DASHBOARD TAB ══════════════════ */}
        <TabsContent value="audit" className="space-y-4 mt-4">
          <AuditDashboard products={products} costMap={costMap} premises={p as FinancialPremises} orders={orders} commissions={commissions} freightPerUnit={freightPerUnit} cacUnitario={cacUnitario} totalFixedCosts={totalFixedCosts} calcAtPrice={calcAtPrice} />
        </TabsContent>

        {/* ══════════════════ CMV TAB ══════════════════ */}
        <TabsContent value="cmv" className="space-y-4 mt-4">
          <div className="bg-card rounded-xl p-4 border border-border space-y-3">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold">Rateio de Frete (SP → PA)</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px]">Custo Total Frete</Label>
                <Input type="number" step="0.01"
                  value={activePremises?.freight_batch_total ?? 0}
                  onChange={e => updatePremisesField("freight_batch_total", e.target.value)}
                  className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Qtd Itens no Lote</Label>
                <Input type="number" step="1" min="1"
                  value={activePremises?.freight_batch_items ?? 1}
                  onChange={e => updatePremisesField("freight_batch_items", e.target.value)}
                  className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Frete/Unidade</Label>
                <div className="h-9 rounded-md bg-muted flex items-center px-3 text-xs font-bold text-primary">
                  {fmt(freightPerUnit)}
                </div>
              </div>
            </div>
            {premisesForm && (
              <Button size="sm" onClick={() => savePremises.mutate()} disabled={savePremises.isPending} className="text-xs gap-1.5">
                {savePremises.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Salvar Frete
              </Button>
            )}
          </div>

          {/* Product cost list */}
          <div className="bg-card rounded-xl p-4 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold">Custo Base por Produto</h3>
              <Badge variant="secondary" className="text-[9px]">{products?.length || 0} produtos</Badge>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar produto..." value={productSearch}
                onChange={e => setProductSearch(e.target.value)} className="h-8 text-xs pl-9" />
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {filteredProducts.map(prod => {
                const existing = costMap[prod.id];
                const editing = editingCosts[prod.id];
                const costBase = editing ? parseFloat(editing.cost_base) || 0 : Number(existing?.cost_base || 0);
                const freightU = editing ? parseFloat(editing.freight_per_unit) || 0 : Number(existing?.freight_per_unit || freightPerUnit);
                const cmvTotal = costBase + freightU;
                const hasCost = existing && Number(existing.cost_base) > 0;
                const notes = editing?.notes ?? existing?.notes ?? "";

                return (
                  <div key={prod.id} className="bg-muted rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{prod.name}</p>
                        <p className="text-[9px] text-muted-foreground">{prod.brand || "Sem marca"} • Venda: {fmt(Number(prod.price))}</p>
                      </div>
                      {hasCost ? (
                        <CheckCircle className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-0.5">
                        <Label className="text-[9px] text-muted-foreground">Custo Base</Label>
                        <Input type="number" step="0.01"
                          value={editing?.cost_base ?? existing?.cost_base ?? ""}
                          placeholder="0.00"
                          onChange={e => setEditingCosts(prev => ({
                            ...prev,
                            [prod.id]: {
                              cost_base: e.target.value,
                              freight_per_unit: prev[prod.id]?.freight_per_unit ?? String(existing?.freight_per_unit ?? freightPerUnit),
                              notes: prev[prod.id]?.notes ?? existing?.notes ?? "",
                            },
                          }))}
                          className="h-8 text-[11px]" />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[9px] text-muted-foreground">Frete/Unid</Label>
                        <Input type="number" step="0.01"
                          value={editing?.freight_per_unit ?? existing?.freight_per_unit ?? freightPerUnit}
                          onChange={e => setEditingCosts(prev => ({
                            ...prev,
                            [prod.id]: {
                              cost_base: prev[prod.id]?.cost_base ?? String(existing?.cost_base ?? ""),
                              freight_per_unit: e.target.value,
                              notes: prev[prod.id]?.notes ?? existing?.notes ?? "",
                            },
                          }))}
                          className="h-8 text-[11px]" />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[9px] text-muted-foreground">CMV Total</Label>
                        <div className="h-8 rounded-md bg-background flex items-center px-2 text-[11px] font-bold">
                          {fmt(cmvTotal)}
                        </div>
                      </div>
                    </div>
                    {/* Notes field */}
                    <div className="space-y-0.5">
                      <Label className="text-[9px] text-muted-foreground">Observações (fornecedor, lote, etc.)</Label>
                      <Textarea
                        value={notes}
                        placeholder="Ex: Fornecedor XYZ, lote #123, validade 06/2026"
                        onChange={e => setEditingCosts(prev => ({
                          ...prev,
                          [prod.id]: {
                            cost_base: prev[prod.id]?.cost_base ?? String(existing?.cost_base ?? ""),
                            freight_per_unit: prev[prod.id]?.freight_per_unit ?? String(existing?.freight_per_unit ?? freightPerUnit),
                            notes: e.target.value,
                          },
                        }))}
                        className="text-[11px] min-h-[36px] resize-none"
                        rows={1}
                      />
                    </div>
                    {editing && (
                      <Button size="sm" onClick={() => saveProductCost(prod.id, costBase, freightU, notes)}
                        disabled={savingProduct === prod.id} className="text-[10px] h-7 gap-1">
                        {savingProduct === prod.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Salvar
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════ PREMISES TAB ══════════════════ */}
        <TabsContent value="premises" className="space-y-4 mt-4">
          {/* Fixed Costs - All editable labels */}
          <div className="bg-card rounded-xl p-4 border border-border space-y-3">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold">Custos Fixos Mensais</h3>
              <Badge variant="outline" className="text-[8px]">Clique no nome para editar</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <EditableCostRow
                label="Nuvemshop"
                labelField="fixed_cost_platform_label"
                valueField="fixed_cost_platform"
                premises={activePremises}
                onUpdate={updatePremisesField}
              />
              <EditableCostRow
                label="WhatsGW"
                labelField="fixed_cost_whatsgw_label"
                valueField="fixed_cost_whatsgw"
                premises={activePremises}
                onUpdate={updatePremisesField}
              />
              <EditableCostRow
                label="Outros"
                labelField="fixed_cost_other_label"
                valueField="fixed_cost_other"
                premises={activePremises}
                onUpdate={updatePremisesField}
              />
              <EditableCostRow
                label="Despesa Extra 1"
                labelField="fixed_cost_extra1_label"
                valueField="fixed_cost_extra1"
                premises={activePremises}
                onUpdate={updatePremisesField}
              />
              <EditableCostRow
                label="Despesa Extra 2"
                labelField="fixed_cost_extra2_label"
                valueField="fixed_cost_extra2"
                premises={activePremises}
                onUpdate={updatePremisesField}
              />
              <EditableCostRow
                label="Despesa Extra 3"
                labelField="fixed_cost_extra3_label"
                valueField="fixed_cost_extra3"
                premises={activePremises}
                onUpdate={updatePremisesField}
              />
            </div>
            <div className="bg-muted rounded-lg p-3 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Total Custos Fixos</span>
              <span className="text-sm font-bold text-primary">{fmt(totalFixedCosts)}</span>
            </div>
          </div>

          {/* Marketing */}
          <div className="bg-card rounded-xl p-4 border border-border space-y-3">
            <h3 className="text-xs font-bold">📣 Marketing & Meta</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px]">Verba Anúncios (mensal)</Label>
                <Input type="number" step="0.01"
                  value={activePremises?.marketing_budget ?? 0}
                  onChange={e => updatePremisesField("marketing_budget", e.target.value)}
                  className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Meta de Pedidos (mensal)</Label>
                <Input type="number" step="1" min="1"
                  value={activePremises?.order_target ?? 100}
                  onChange={e => updatePremisesField("order_target", e.target.value)}
                  className="h-9 text-xs" />
              </div>
            </div>
            <div className="bg-muted rounded-lg p-3 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">CAC Unitário (Fixos + Marketing / Pedidos)</span>
                <span className="text-sm font-bold text-primary">{fmt(cacUnitario)}</span>
              </div>
              <p className="text-[9px] text-muted-foreground">
                ({fmt(totalFixedCosts)} + {fmt(Number(activePremises?.marketing_budget || 0))}) ÷ {activePremises?.order_target || 1} pedidos
              </p>
            </div>
          </div>

          {/* Variable Costs */}
          <div className="bg-card rounded-xl p-4 border border-border space-y-3">
            <h3 className="text-xs font-bold">📦 Custos Variáveis (por pedido)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px]">Embalagem + Brindes</Label>
                <Input type="number" step="0.01"
                  value={activePremises?.packaging_cost ?? 2.50}
                  onChange={e => updatePremisesField("packaging_cost", e.target.value)}
                  className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Comissão Influencer (%)</Label>
                <Input type="number" step="0.1"
                  value={activePremises?.influencer_commission_rate ?? 10}
                  onChange={e => updatePremisesField("influencer_commission_rate", e.target.value)}
                  className="h-9 text-xs" />
              </div>
            </div>

            <p className="text-[10px] font-bold text-muted-foreground uppercase mt-2">Taxas de Gateway</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px]">Crédito Online (%)</Label>
                <Input type="number" step="0.01"
                  value={activePremises?.gateway_rate_credit ?? 4.19}
                  onChange={e => updatePremisesField("gateway_rate_credit", e.target.value)}
                  className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Crédito Fixo (R$)</Label>
                <Input type="number" step="0.01"
                  value={activePremises?.gateway_rate_credit_fixed ?? 0.35}
                  onChange={e => updatePremisesField("gateway_rate_credit_fixed", e.target.value)}
                  className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Pix Online (%)</Label>
                <Input type="number" step="0.01"
                  value={activePremises?.gateway_rate_pix ?? 0.99}
                  onChange={e => updatePremisesField("gateway_rate_pix", e.target.value)}
                  className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Débito Físico (%)</Label>
                <Input type="number" step="0.01"
                  value={activePremises?.gateway_rate_debit ?? 0.74}
                  onChange={e => updatePremisesField("gateway_rate_debit", e.target.value)}
                  className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Crédito Físico (%)</Label>
                <Input type="number" step="0.01"
                  value={activePremises?.gateway_rate_physical ?? 0.74}
                  onChange={e => updatePremisesField("gateway_rate_physical", e.target.value)}
                  className="h-9 text-xs" />
              </div>
            </div>
          </div>

          {/* Desired Margin */}
          <div className="bg-card rounded-xl p-4 border border-border space-y-3">
            <h3 className="text-xs font-bold">🎯 Margem Desejada</h3>
            <div className="space-y-1">
              <Label className="text-[10px]">Margem de Lucro Desejada (%)</Label>
              <Input type="number" step="0.1"
                value={activePremises?.desired_margin ?? 30}
                onChange={e => updatePremisesField("desired_margin", e.target.value)}
                className="h-9 text-xs" />
            </div>
            <p className="text-[9px] text-muted-foreground">
              Esta margem será usada no Markup Divisor para calcular o preço de venda sugerido na aba "Preços".
            </p>
          </div>

          {premisesForm && (
            <Button onClick={() => savePremises.mutate()} disabled={savePremises.isPending}
              className="w-full min-h-[44px] gap-2 font-semibold">
              {savePremises.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Todas as Premissas
            </Button>
          )}
        </TabsContent>

        {/* ══════════════════ PRICING TAB ══════════════════ */}
        <TabsContent value="pricing" className="space-y-4 mt-4">
          <div className="bg-card rounded-xl p-4 border border-border space-y-2">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold">Precificação por Markup Divisor</h3>
            </div>
            <p className="text-[9px] text-muted-foreground">
              Preço = (CMV + Embalagem + CAC + Taxa Fixa) ÷ (1 - Taxa% - Comissão% - Margem%)
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar produto..." value={productSearch}
              onChange={e => setProductSearch(e.target.value)} className="h-8 text-xs pl-9" />
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {filteredProducts.map(prod => {
              const existing = costMap[prod.id];
              const costBase = Number(existing?.cost_base || 0);
              const freightU = Number(existing?.freight_per_unit || freightPerUnit);
              const markup = calcMarkup(costBase, freightU);
              const actual = calcAtPrice(Number(prod.price), costBase, freightU);

              if (costBase <= 0) {
                return (
                  <div key={prod.id} className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs font-medium truncate">{prod.name}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1">Preencha o custo base na aba CMV para calcular.</p>
                  </div>
                );
              }

              const priceDiff = Number(prod.price) - markup.suggestedPrice;
              const isUnderpriced = priceDiff < -1;
              const isOverpriced = priceDiff > 5;

              return (
                <motion.div key={prod.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-card rounded-xl p-4 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{prod.name}</p>
                      <p className="text-[9px] text-muted-foreground">{prod.brand}</p>
                    </div>
                    <Badge variant={isUnderpriced ? "destructive" : isOverpriced ? "secondary" : "default"}
                      className="text-[9px] flex-shrink-0">
                      {isUnderpriced ? "Subprecificado" : isOverpriced ? "Margem alta" : "OK"}
                    </Badge>
                  </div>

                  <div className="bg-muted rounded-lg p-3 space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CMV (Base + Frete)</span>
                      <span>{fmt(costBase)} + {fmt(freightU)} = <strong>{fmt(costBase + freightU)}</strong></span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Embalagem</span>
                      <span>{fmt(Number(p?.packaging_cost || 0))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CAC Unitário</span>
                      <span>{fmt(cacUnitario)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxa Fixa Gateway</span>
                      <span>{fmt(Number(p?.gateway_rate_credit_fixed || 0))}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1.5">
                      <span className="text-muted-foreground">Taxa Gateway ({p?.gateway_rate_credit}%)</span>
                      <span>{fmt(Number(prod.price) * Number(p?.gateway_rate_credit || 0) / 100)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Comissão ({p?.influencer_commission_rate}%)</span>
                      <span>{fmt(Number(prod.price) * Number(p?.influencer_commission_rate || 0) / 100)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted rounded-lg p-2.5 text-center">
                      <p className="text-[9px] text-muted-foreground">Preço Atual</p>
                      <p className="text-sm font-bold">{fmt(Number(prod.price))}</p>
                      <p className={`text-[9px] font-bold ${actual.marginPct >= 0 ? "text-accent" : "text-destructive"}`}>
                        Margem: {fmtPct(actual.marginPct)}
                      </p>
                    </div>
                    <div className="bg-primary/5 rounded-lg p-2.5 text-center border border-primary/20">
                      <p className="text-[9px] text-muted-foreground">Preço Sugerido</p>
                      <p className="text-sm font-bold text-primary">{fmt(markup.suggestedPrice)}</p>
                      <p className="text-[9px] font-bold text-accent">
                        Margem: {fmtPct(Number(p?.desired_margin || 30))}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[9px] text-muted-foreground">Lucro Real</p>
                      <p className={`text-xs font-bold ${actual.profit >= 0 ? "text-accent" : "text-destructive"}`}>
                        {fmt(actual.profit)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Contribuição</p>
                      <p className="text-xs font-bold">{fmt(actual.contributionMargin)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground">Custo Total</p>
                      <p className="text-xs font-bold">{fmt(actual.totalCost)}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        {/* ══════════════════ DRE TAB ══════════════════ */}
        <TabsContent value="dre" className="space-y-4 mt-4">
          <DRESection orders={orders} commissions={commissions} premises={p} products={products} costMap={costMap} cacUnitario={cacUnitario} totalFixedCosts={totalFixedCosts} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ── Audit Dashboard Component ──
const AuditDashboard = ({ products, costMap, premises, orders, commissions, freightPerUnit, cacUnitario, totalFixedCosts, calcAtPrice }: {
  products: any[] | undefined;
  costMap: Record<string, ProductCost>;
  premises: FinancialPremises;
  orders: any[] | undefined;
  commissions: any[] | undefined;
  freightPerUnit: number;
  cacUnitario: number;
  totalFixedCosts: number;
  calcAtPrice: (price: number, costBase: number, freight: number) => { totalCost: number; profit: number; marginPct: number; contributionMargin: number };
}) => {
  const audit = useMemo(() => {
    if (!products || !premises) return null;

    const withCosts = products.filter(p => costMap[p.id] && Number(costMap[p.id].cost_base) > 0);
    const withoutCosts = products.filter(p => !costMap[p.id] || Number(costMap[p.id].cost_base) <= 0);
    const coverage = products.length > 0 ? (withCosts.length / products.length) * 100 : 0;

    // CMV aggregates
    let totalCmv = 0;
    let totalSuggestedRevenue = 0;
    let totalActualRevenue = 0;
    const productBreakdown: Array<{
      name: string; brand: string; price: number; cmv: number;
      profit: number; marginPct: number; status: string;
    }> = [];

    withCosts.forEach(prod => {
      const cost = costMap[prod.id];
      const costBase = Number(cost.cost_base);
      const freight = Number(cost.freight_per_unit);
      const cmv = costBase + freight;
      totalCmv += cmv;
      totalActualRevenue += Number(prod.price);

      const actual = calcAtPrice(Number(prod.price), costBase, freight);
      const status = actual.marginPct < 0 ? "negative" : actual.marginPct < 15 ? "low" : actual.marginPct < 30 ? "ok" : "high";

      productBreakdown.push({
        name: prod.name,
        brand: prod.brand || "—",
        price: Number(prod.price),
        cmv,
        profit: actual.profit,
        marginPct: actual.marginPct,
        status,
      });
    });

    productBreakdown.sort((a, b) => a.marginPct - b.marginPct);

    const negativeMargin = productBreakdown.filter(p => p.status === "negative");
    const lowMargin = productBreakdown.filter(p => p.status === "low");
    const avgMargin = productBreakdown.length > 0 ? productBreakdown.reduce((s, p) => s + p.marginPct, 0) / productBreakdown.length : 0;
    const avgCmv = withCosts.length > 0 ? totalCmv / withCosts.length : 0;

    // Order-based stats (30d)
    const now = new Date();
    const cutoff = new Date(now.getTime() - 30 * 86400000);
    const recentOrders = (orders || []).filter(o => new Date(o.created_at) >= cutoff && o.status !== "cancelled");

    let orderCmvTotal = 0;
    recentOrders.forEach(order => {
      ((order.items as any[]) || []).forEach((item: any) => {
        const cost = costMap[item.product_id];
        if (cost) orderCmvTotal += (Number(cost.cost_base) + Number(cost.freight_per_unit)) * (item.quantity || 1);
      });
    });

    const orderRevenue = recentOrders.reduce((s, o) => s + Number(o.total), 0);
    const grossProfit = orderRevenue - orderCmvTotal;
    const grossMargin = orderRevenue > 0 ? (grossProfit / orderRevenue) * 100 : 0;

    const commTotal = (commissions || []).filter(c => new Date(c.created_at) >= cutoff)
      .reduce((s, c) => s + Number(c.commission_value), 0);
    const packagingTotal = recentOrders.length * Number(premises.packaging_cost || 0);
    const gatewayTotal = recentOrders.reduce((s, o) => {
      const { pct, fixed } = getGatewayRate(premises, o.payment_method);
      return s + (Number(o.total) * pct / 100) + fixed;
    }, 0);
    const netProfit = grossProfit - packagingTotal - gatewayTotal - commTotal - totalFixedCosts - Number(premises.marketing_budget || 0);
    const netMargin = orderRevenue > 0 ? (netProfit / orderRevenue) * 100 : 0;

    return {
      coverage, withCosts: withCosts.length, withoutCosts: withoutCosts.length, total: products.length,
      totalCmv, avgCmv, avgMargin, negativeMargin, lowMargin, productBreakdown,
      orderRevenue, orderCmvTotal, grossProfit, grossMargin, netProfit, netMargin,
      orderCount: recentOrders.length, packagingTotal, gatewayTotal, commTotal,
      missingProducts: withoutCosts.map(p => p.name),
    };
  }, [products, costMap, premises, orders, commissions, freightPerUnit, cacUnitario, totalFixedCosts, calcAtPrice]);

  if (!audit) return <div className="text-xs text-muted-foreground py-8 text-center">Carregando auditoria...</div>;

  return (
    <div className="space-y-4">
      {/* Health Score */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold">Saúde Financeira</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-[9px] text-muted-foreground">Cobertura CMV</p>
            <p className="text-xl font-bold text-primary">{fmtPct(audit.coverage)}</p>
            <Progress value={audit.coverage} className="h-1.5 mt-1" />
            <p className="text-[8px] text-muted-foreground mt-1">{audit.withCosts}/{audit.total} produtos</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-[9px] text-muted-foreground">CMV Médio</p>
            <p className="text-xl font-bold">{fmt(audit.avgCmv)}</p>
            <p className="text-[8px] text-muted-foreground mt-1">por produto cadastrado</p>
          </div>
        </div>
      </motion.div>

      {/* Real-time P&L 30d */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-card rounded-xl p-4 border border-border space-y-3">
        <div className="flex items-center gap-2">
          <PieChart className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold">Rentabilidade em Tempo Real (30d)</h3>
          <Badge variant="outline" className="text-[8px]">{audit.orderCount} pedidos</Badge>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-[8px] text-muted-foreground">Receita</p>
            <p className="text-sm font-bold">{fmt(audit.orderRevenue)}</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-[8px] text-muted-foreground">CMV Total</p>
            <p className="text-sm font-bold text-destructive">{fmt(audit.orderCmvTotal)}</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-[8px] text-muted-foreground">Lucro Bruto</p>
            <p className={`text-sm font-bold ${audit.grossProfit >= 0 ? "text-accent" : "text-destructive"}`}>
              {fmt(audit.grossProfit)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-xl p-4 text-center border ${audit.grossMargin >= 30 ? "bg-accent/5 border-accent/20" : audit.grossMargin >= 15 ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800" : "bg-destructive/5 border-destructive/20"}`}>
            <div className="flex items-center justify-center gap-1 mb-1">
              {audit.grossMargin >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 text-accent" /> : <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />}
              <p className="text-[9px] text-muted-foreground">Margem Bruta</p>
            </div>
            <p className={`text-2xl font-bold ${audit.grossMargin >= 30 ? "text-accent" : audit.grossMargin >= 15 ? "text-amber-600" : "text-destructive"}`}>
              {fmtPct(audit.grossMargin)}
            </p>
          </div>
          <div className={`rounded-xl p-4 text-center border ${audit.netMargin >= 15 ? "bg-accent/5 border-accent/20" : audit.netMargin >= 0 ? "bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800" : "bg-destructive/5 border-destructive/20"}`}>
            <div className="flex items-center justify-center gap-1 mb-1">
              {audit.netMargin >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 text-accent" /> : <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />}
              <p className="text-[9px] text-muted-foreground">Margem Líquida</p>
            </div>
            <p className={`text-2xl font-bold ${audit.netMargin >= 15 ? "text-accent" : audit.netMargin >= 0 ? "text-amber-600" : "text-destructive"}`}>
              {fmtPct(audit.netMargin)}
            </p>
          </div>
        </div>

        <div className="bg-muted rounded-lg p-3 space-y-1.5 text-[11px]">
          <div className="flex justify-between"><span className="text-muted-foreground">Embalagens</span><span>{fmt(audit.packagingTotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Taxas Gateway</span><span>{fmt(audit.gatewayTotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Comissões</span><span>{fmt(audit.commTotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Custos Fixos</span><span>{fmt(totalFixedCosts)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Marketing</span><span>{fmt(Number(premises.marketing_budget || 0))}</span></div>
          <div className="flex justify-between border-t border-border pt-1.5 font-bold">
            <span>Lucro Líquido</span>
            <span className={audit.netProfit >= 0 ? "text-accent" : "text-destructive"}>{fmt(audit.netProfit)}</span>
          </div>
        </div>
      </motion.div>

      {/* Alerts */}
      {(audit.negativeMargin.length > 0 || audit.lowMargin.length > 0 || audit.withoutCosts > 0) && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-xl p-4 border border-border space-y-3">
          <h3 className="text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />Alertas de Auditoria
          </h3>

          {audit.negativeMargin.length > 0 && (
            <div className="bg-destructive/5 rounded-lg p-3 border border-destructive/20 space-y-1">
              <p className="text-[10px] font-bold text-destructive">⚠️ {audit.negativeMargin.length} produto(s) com margem negativa</p>
              {audit.negativeMargin.slice(0, 5).map((p, i) => (
                <p key={i} className="text-[9px] text-muted-foreground">• {p.name} — margem {fmtPct(p.marginPct)}, lucro {fmt(p.profit)}</p>
              ))}
            </div>
          )}

          {audit.lowMargin.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3 border border-amber-200 dark:border-amber-800 space-y-1">
              <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300">⚡ {audit.lowMargin.length} produto(s) com margem baixa (&lt;15%)</p>
              {audit.lowMargin.slice(0, 5).map((p, i) => (
                <p key={i} className="text-[9px] text-muted-foreground">• {p.name} — margem {fmtPct(p.marginPct)}</p>
              ))}
            </div>
          )}

          {audit.withoutCosts > 0 && (
            <div className="bg-muted rounded-lg p-3 space-y-1">
              <p className="text-[10px] font-bold">📋 {audit.withoutCosts} produto(s) sem custo cadastrado</p>
              {audit.missingProducts.slice(0, 5).map((name, i) => (
                <p key={i} className="text-[9px] text-muted-foreground">• {name}</p>
              ))}
              {audit.missingProducts.length > 5 && <p className="text-[9px] text-muted-foreground">... e mais {audit.missingProducts.length - 5}</p>}
            </div>
          )}
        </motion.div>
      )}

      {/* Product ranking by margin */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-card rounded-xl p-4 border border-border space-y-3">
        <h3 className="text-xs font-bold">📊 Ranking de Margem por Produto</h3>
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {audit.productBreakdown.map((prod, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
              <span className="text-[9px] text-muted-foreground w-4">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium truncate">{prod.name}</p>
                <p className="text-[8px] text-muted-foreground">{prod.brand} • CMV: {fmt(prod.cmv)}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-[10px] font-bold ${prod.marginPct >= 15 ? "text-accent" : prod.marginPct >= 0 ? "text-amber-600" : "text-destructive"}`}>
                  {fmtPct(prod.marginPct)}
                </p>
                <p className="text-[8px] text-muted-foreground">{fmt(prod.profit)}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};


const DRESection = ({ orders, commissions, premises, products, costMap, cacUnitario, totalFixedCosts }: {
  orders: any[] | undefined;
  commissions: any[] | undefined;
  premises: any;
  products: any[] | undefined;
  costMap: Record<string, ProductCost>;
  cacUnitario: number;
  totalFixedCosts: number;
}) => {
  const [drePeriod, setDrePeriod] = useState<"30d" | "90d" | "all">("30d");

  const stats = useMemo(() => {
    if (!orders || !premises) return null;

    const now = new Date();
    const periodMs = drePeriod === "30d" ? 30 * 86400000 : drePeriod === "90d" ? 90 * 86400000 : Infinity;
    const cutoff = periodMs === Infinity ? new Date(0) : new Date(now.getTime() - periodMs);
    const filtered = orders.filter(o => new Date(o.created_at) >= cutoff && o.status !== "cancelled");

    const revenue = filtered.reduce((s, o) => s + Number(o.total), 0);
    const discounts = filtered.reduce((s, o) => s + Number(o.discount || 0), 0);
    const commissionsTotal = commissions?.filter(c => new Date(c.created_at) >= cutoff)
      .reduce((s, c) => s + Number(c.commission_value), 0) || 0;

    let cmvTotal = 0;
    filtered.forEach(order => {
      const items = (order.items as any[]) || [];
      items.forEach((item: any) => {
        const cost = costMap[item.product_id];
        if (cost) {
          cmvTotal += (Number(cost.cost_base) + Number(cost.freight_per_unit)) * (item.quantity || 1);
        }
      });
    });

    const packagingTotal = filtered.length * Number(premises.packaging_cost || 0);
    const gatewayTotal = filtered.reduce((s, o) => {
      const { pct, fixed } = getGatewayRate(premises as FinancialPremises, o.payment_method);
      return s + (Number(o.total) * pct / 100) + fixed;
    }, 0);

    const months = periodMs === Infinity ? Math.max(1, Math.ceil((now.getTime() - new Date(orders[orders.length - 1]?.created_at || now).getTime()) / (30 * 86400000))) :
      drePeriod === "30d" ? 1 : 3;
    const fixedTotal = totalFixedCosts * months;
    const marketingTotal = Number(premises.marketing_budget || 0) * months;

    const grossProfit = revenue - cmvTotal;
    const contributionMargin = grossProfit - packagingTotal - gatewayTotal - commissionsTotal - discounts;
    const netProfit = contributionMargin - fixedTotal - marketingTotal;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return {
      revenue, discounts, commissionsTotal, cmvTotal, packagingTotal, gatewayTotal,
      fixedTotal, marketingTotal, grossProfit, contributionMargin, netProfit, netMargin,
      orderCount: filtered.length,
    };
  }, [orders, commissions, premises, costMap, drePeriod, totalFixedCosts]);

  if (!stats) return null;

  const lines = [
    { label: "Receita Bruta", value: stats.revenue, bold: true },
    { label: "(-) CMV (Mercadoria + Frete)", value: -stats.cmvTotal, negative: true },
    { label: "= Lucro Bruto", value: stats.grossProfit, bold: true, accent: true },
    { label: "(-) Embalagens & Brindes", value: -stats.packagingTotal, negative: true },
    { label: "(-) Taxas de Gateway", value: -stats.gatewayTotal, negative: true },
    { label: "(-) Comissões Influencers", value: -stats.commissionsTotal, negative: true },
    { label: "(-) Descontos/Cupons", value: -stats.discounts, negative: true },
    { label: "= Margem de Contribuição", value: stats.contributionMargin, bold: true, accent: true },
    { label: "(-) Custos Fixos", value: -stats.fixedTotal, negative: true },
    { label: "(-) Marketing / Tráfego", value: -stats.marketingTotal, negative: true },
    { label: "= Lucro Líquido", value: stats.netProfit, bold: true, final: true },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold">📊 DRE Simplificado</h3>
        <Select value={drePeriod} onValueChange={(v: any) => setDrePeriod(v)}>
          <SelectTrigger className="h-7 text-[10px] w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="30d">30 dias</SelectItem>
            <SelectItem value="90d">90 dias</SelectItem>
            <SelectItem value="all">Tudo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {lines.map((line, i) => (
          <div key={i} className={`flex justify-between items-center px-4 py-2.5 text-xs ${
            line.bold ? "bg-muted/50 font-bold" : ""
          } ${(line as any).final ? "bg-primary/5 border-t-2 border-primary/20" : i > 0 ? "border-t border-border/50" : ""}`}>
            <span className={line.bold ? "" : "text-muted-foreground"}>{line.label}</span>
            <span className={
              (line as any).final ? (line.value >= 0 ? "text-accent text-sm" : "text-destructive text-sm") :
              (line as any).accent ? (line.value >= 0 ? "text-accent" : "text-destructive") :
              line.negative ? "text-destructive" : ""
            }>
              {line.negative ? `-${fmt(Math.abs(line.value))}` : fmt(line.value)}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card rounded-xl p-3 border border-border text-center">
          <p className="text-[9px] text-muted-foreground">Margem Líquida</p>
          <p className={`text-lg font-bold ${stats.netMargin >= 0 ? "text-accent" : "text-destructive"}`}>
            {fmtPct(stats.netMargin)}
          </p>
        </div>
        <div className="bg-card rounded-xl p-3 border border-border text-center">
          <p className="text-[9px] text-muted-foreground">Lucro/Pedido</p>
          <p className={`text-lg font-bold ${stats.netProfit >= 0 ? "text-accent" : "text-destructive"}`}>
            {fmt(stats.orderCount > 0 ? stats.netProfit / stats.orderCount : 0)}
          </p>
        </div>
        <div className="bg-card rounded-xl p-3 border border-border text-center">
          <p className="text-[9px] text-muted-foreground">Pedidos</p>
          <p className="text-lg font-bold">{stats.orderCount}</p>
        </div>
      </div>

      {stats.cmvTotal === 0 && stats.orderCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-200 dark:border-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-[10px] text-amber-700 dark:text-amber-300">
            Preencha os custos dos produtos na aba CMV para um DRE preciso.
          </p>
        </div>
      )}
    </div>
  );
};

export default FinanceiroTab;
