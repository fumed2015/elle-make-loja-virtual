import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Package,
  Zap,
  ChevronDown,
  ChevronUp,
  Heart,
  DollarSign,
  Target,
  Gift,
  Flame,
  Clock,
  ShoppingBag,
} from "lucide-react";

type RiskAlert = {
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  action: string;
};

type Opportunity = {
  type: "margin" | "volume" | "trend" | "bundle";
  title: string;
  detail: string;
  estimated_impact: string;
};

type Bundle = {
  name: string;
  products: string[];
  strategy: "anti-encalhe" | "ticket-booster" | "seasonal" | "cross-sell";
  suggested_price: number;
  estimated_margin: number;
  rationale: string;
};

type BudgetHealth = {
  status: "healthy" | "warning" | "critical";
  label: string;
  message: string;
  margin_avg: number;
  revenue_gap: number;
  ticket_gap: number;
};

type ProductVerdict = {
  product_name: string;
  brand: string;
  verdict: "safe" | "moderate" | "risk";
  verdict_label: string;
  margin_contribution?: number;
  market_analysis: string;
  selling_point: string;
  mix_suggestion: string;
  risk_alert: string;
};

type AnalysisResult = {
  summary: string;
  budget_health?: BudgetHealth | null;
  risk_alerts: (RiskAlert | string)[];
  top_opportunities: (Opportunity | string)[];
  recommended_bundles?: Bundle[];
  verdicts: ProductVerdict[];
};

const ANALYSIS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/catalog-consultant`;

const CatalogAnalysisDashboard = () => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [showAllVerdicts, setShowAllVerdicts] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    setAnalysis(null);
    try {
      const resp = await fetch(ANALYSIS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ mode: "analysis" }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro na análise" }));
        throw new Error(err.error || `Erro ${resp.status}`);
      }

      const data = await resp.json();
      setAnalysis(data);
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar análise");
    } finally {
      setLoading(false);
    }
  };

  const verdictIcon = (v: string) => {
    if (v === "safe") return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
    if (v === "moderate") return <ShieldQuestion className="w-4 h-4 text-amber-500" />;
    return <ShieldAlert className="w-4 h-4 text-destructive" />;
  };

  const verdictBadge = (v: string, label: string) => {
    const cls =
      v === "safe"
        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
        : v === "moderate"
        ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
        : "bg-destructive/10 text-destructive border-destructive/30";
    return <Badge className={`text-[9px] ${cls}`}>{label}</Badge>;
  };

  const severityColor = (s: string) => {
    if (s === "high") return "text-destructive";
    if (s === "medium") return "text-amber-600";
    return "text-blue-500";
  };

  const severityIcon = (s: string) => {
    if (s === "high") return "🔴";
    if (s === "medium") return "🟡";
    return "🔵";
  };

  const opportunityIcon = (t: string) => {
    if (t === "margin") return <DollarSign className="w-3.5 h-3.5 text-emerald-500" />;
    if (t === "volume") return <ShoppingBag className="w-3.5 h-3.5 text-blue-500" />;
    if (t === "trend") return <Flame className="w-3.5 h-3.5 text-orange-500" />;
    return <Gift className="w-3.5 h-3.5 text-purple-500" />;
  };

  const strategyLabel = (s: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      "anti-encalhe": { label: "Anti-Encalhe", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
      "ticket-booster": { label: "Ticket Booster", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
      "seasonal": { label: "Sazonal", cls: "bg-purple-500/10 text-purple-600 border-purple-500/30" },
      "cross-sell": { label: "Cross-Sell", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
    };
    const m = map[s] || { label: s, cls: "bg-muted text-muted-foreground" };
    return <Badge className={`text-[8px] ${m.cls}`}>{m.label}</Badge>;
  };

  const budgetHealthColor = (status: string) => {
    if (status === "healthy") return { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-600", icon: <Heart className="w-4 h-4 text-emerald-500" /> };
    if (status === "warning") return { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-600", icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> };
    return { bg: "bg-destructive/10", border: "border-destructive/20", text: "text-destructive", icon: <AlertTriangle className="w-4 h-4 text-destructive" /> };
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-bold">Painel de Análise Estratégica</p>
            <p className="text-[9px] text-muted-foreground">
              Vereditos, orçamento, bundles e alertas de risco em tempo real
            </p>
          </div>
        </div>
        <Button size="sm" onClick={runAnalysis} disabled={loading}>
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
          ) : (
            <Zap className="w-3.5 h-3.5 mr-1" />
          )}
          {loading ? "Analisando..." : "Gerar Análise"}
        </Button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">
            A IA está analisando portfólio, orçamento e margem...
          </p>
        </div>
      )}

      {analysis && (
        <div className="space-y-4">
          {/* Budget Health Card */}
          {analysis.budget_health && (
            <div className={`${budgetHealthColor(analysis.budget_health.status).bg} ${budgetHealthColor(analysis.budget_health.status).border} border rounded-lg p-4`}>
              <div className="flex items-center gap-2 mb-2">
                {budgetHealthColor(analysis.budget_health.status).icon}
                <p className={`text-xs font-bold ${budgetHealthColor(analysis.budget_health.status).text}`}>
                  Saúde Orçamentária: {analysis.budget_health.label}
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground mb-3">{analysis.budget_health.message}</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-background/60 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground">Margem Média</p>
                  <p className="text-sm font-bold">{analysis.budget_health.margin_avg?.toFixed(1) || "—"}%</p>
                </div>
                <div className="bg-background/60 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground">Gap Receita</p>
                  <p className={`text-sm font-bold ${analysis.budget_health.revenue_gap > 0 ? "text-destructive" : "text-emerald-600"}`}>
                    {analysis.budget_health.revenue_gap > 0 ? `R$ ${analysis.budget_health.revenue_gap.toFixed(0)}` : "✓ OK"}
                  </p>
                </div>
                <div className="bg-background/60 rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground">Gap Ticket</p>
                  <p className={`text-sm font-bold ${analysis.budget_health.ticket_gap > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {analysis.budget_health.ticket_gap > 0 ? `R$ ${analysis.budget_health.ticket_gap.toFixed(2)}` : "✓ OK"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs font-medium mb-1">📋 Resumo Executivo</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {analysis.summary}
            </p>
          </div>

          {/* Risk Alerts & Opportunities grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Risk Alerts */}
            {analysis.risk_alerts.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <p className="text-xs font-bold text-destructive">Alertas de Risco</p>
                </div>
                {analysis.risk_alerts.map((alert, i) => {
                  if (typeof alert === "string") {
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-destructive text-[10px] mt-0.5">🔴</span>
                        <p className="text-[10px] text-muted-foreground">{alert}</p>
                      </div>
                    );
                  }
                  return (
                    <div key={i} className="bg-background/50 rounded p-2 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px]">{severityIcon(alert.severity)}</span>
                        <p className={`text-[10px] font-semibold ${severityColor(alert.severity)}`}>{alert.title}</p>
                      </div>
                      <p className="text-[9px] text-muted-foreground">{alert.detail}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Target className="w-3 h-3 text-primary" />
                        <p className="text-[9px] font-medium text-primary">{alert.action}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Top Opportunities */}
            {analysis.top_opportunities.length > 0 && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <p className="text-xs font-bold text-emerald-600">Oportunidades</p>
                </div>
                {analysis.top_opportunities.map((opp, i) => {
                  if (typeof opp === "string") {
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-emerald-500 text-[10px] mt-0.5">🟢</span>
                        <p className="text-[10px] text-muted-foreground">{opp}</p>
                      </div>
                    );
                  }
                  return (
                    <div key={i} className="bg-background/50 rounded p-2 space-y-1">
                      <div className="flex items-center gap-1.5">
                        {opportunityIcon(opp.type)}
                        <p className="text-[10px] font-semibold text-emerald-600">{opp.title}</p>
                      </div>
                      <p className="text-[9px] text-muted-foreground">{opp.detail}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                        <p className="text-[9px] font-medium text-emerald-600">{opp.estimated_impact}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recommended Bundles */}
          {analysis.recommended_bundles && analysis.recommended_bundles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-purple-500" />
                <p className="text-xs font-bold">Bundles Recomendados</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {analysis.recommended_bundles.map((bundle, i) => (
                  <div key={i} className="bg-card border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold">{bundle.name}</p>
                      {strategyLabel(bundle.strategy)}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {bundle.products.map((p, pi) => (
                        <Badge key={pi} variant="outline" className="text-[8px]">{p}</Badge>
                      ))}
                    </div>
                    <p className="text-[9px] text-muted-foreground">{bundle.rationale}</p>
                    <div className="flex items-center gap-3 pt-1 border-t">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-bold">R$ {bundle.suggested_price?.toFixed(2)?.replace(".", ",")}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-500" />
                        <span className="text-[10px] font-medium text-emerald-600">{bundle.estimated_margin}% margem</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Product Verdicts */}
          {analysis.verdicts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-primary" />
                  <p className="text-xs font-bold">Vereditos por Produto</p>
                  <span className="text-[9px] text-muted-foreground">
                    ({analysis.verdicts.length} analisados)
                  </span>
                </div>
                {analysis.verdicts.length > 5 && (
                  <Button size="sm" variant="ghost" className="text-[10px] h-6" onClick={() => setShowAllVerdicts(!showAllVerdicts)}>
                    {showAllVerdicts ? "Mostrar menos" : `Ver todos (${analysis.verdicts.length})`}
                  </Button>
                )}
              </div>

              {(showAllVerdicts ? analysis.verdicts : analysis.verdicts.slice(0, 5)).map((v, i) => {
                const isExpanded = expandedIdx === i;
                return (
                  <div key={i} className="bg-card border rounded-lg overflow-hidden transition-all">
                    <button
                      onClick={() => setExpandedIdx(isExpanded ? null : i)}
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {verdictIcon(v.verdict)}
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{v.product_name}</p>
                          <p className="text-[9px] text-muted-foreground">{v.brand}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {v.margin_contribution != null && (
                          <span className={`text-[9px] font-mono font-bold ${v.margin_contribution >= 30 ? "text-emerald-600" : v.margin_contribution >= 15 ? "text-amber-600" : "text-destructive"}`}>
                            MC {v.margin_contribution.toFixed(0)}%
                          </span>
                        )}
                        {verdictBadge(v.verdict, v.verdict_label)}
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 space-y-2 border-t pt-2">
                        <div>
                          <p className="text-[9px] font-semibold uppercase text-muted-foreground mb-0.5">
                            Análise de Mercado
                          </p>
                          <p className="text-[10px]">{v.market_analysis}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-semibold uppercase text-muted-foreground mb-0.5">
                            Ponto Forte de Venda
                          </p>
                          <p className="text-[10px]">{v.selling_point}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-semibold uppercase text-muted-foreground mb-0.5">
                            Sugestão de Mix
                          </p>
                          <p className="text-[10px]">{v.mix_suggestion}</p>
                        </div>
                        {v.risk_alert && (
                          <div className="bg-destructive/5 rounded p-2">
                            <p className="text-[9px] font-semibold uppercase text-destructive mb-0.5">
                              ⚠️ Alerta de Risco
                            </p>
                            <p className="text-[10px] text-destructive/80">{v.risk_alert}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default CatalogAnalysisDashboard;
