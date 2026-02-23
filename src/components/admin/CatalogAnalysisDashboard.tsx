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
} from "lucide-react";

type ProductVerdict = {
  product_name: string;
  brand: string;
  verdict: "safe" | "moderate" | "risk";
  verdict_label: string;
  market_analysis: string;
  selling_point: string;
  mix_suggestion: string;
  risk_alert: string;
};

type AnalysisResult = {
  summary: string;
  risk_alerts: string[];
  top_opportunities: string[];
  verdicts: ProductVerdict[];
};

const ANALYSIS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/catalog-consultant`;

const CatalogAnalysisDashboard = () => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

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
              Vereditos, alertas de risco e oportunidades do seu catálogo
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
            A IA está analisando seu portfólio completo...
          </p>
        </div>
      )}

      {analysis && (
        <div className="space-y-4">
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
                {analysis.risk_alerts.map((alert, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-destructive text-[10px] mt-0.5">🔴</span>
                    <p className="text-[10px] text-muted-foreground">{alert}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Top Opportunities */}
            {analysis.top_opportunities.length > 0 && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <p className="text-xs font-bold text-emerald-600">Oportunidades</p>
                </div>
                {analysis.top_opportunities.map((opp, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500 text-[10px] mt-0.5">🟢</span>
                    <p className="text-[10px] text-muted-foreground">{opp}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Product Verdicts */}
          {analysis.verdicts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Package className="w-4 h-4 text-primary" />
                <p className="text-xs font-bold">Vereditos por Produto</p>
                <span className="text-[9px] text-muted-foreground">
                  ({analysis.verdicts.length} analisados)
                </span>
              </div>

              {analysis.verdicts.map((v, i) => {
                const isExpanded = expandedIdx === i;
                return (
                  <div
                    key={i}
                    className="bg-card border rounded-lg overflow-hidden transition-all"
                  >
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
