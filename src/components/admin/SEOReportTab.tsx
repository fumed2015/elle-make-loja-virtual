import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, AlertTriangle, CheckCircle, Info, Eye } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const SEOTab = () => {
  const [generating, setGenerating] = useState(false);
  const { data: reports, isLoading, refetch } = useQuery({
    queryKey: ["seo-reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("seo_reports").select("*").order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-report");
      if (error) throw error;
      toast.success("Relatório SEO gerado!");
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar relatório");
    } finally {
      setGenerating(false);
    }
  };

  const latest = reports?.[0];
  const report = latest?.report as any;

  const severityIcon = (sev: string) => {
    if (sev === "error") return <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />;
    if (sev === "warn") return <Info className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />;
    return <CheckCircle className="w-3.5 h-3.5 text-accent flex-shrink-0" />;
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-accent";
    if (score >= 50) return "text-yellow-500";
    return "text-destructive";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Relatório SEO</h2>
        <Button onClick={handleGenerate} disabled={generating} size="sm" className="bg-primary text-primary-foreground text-xs gap-1 press-scale">
          <Search className="w-3 h-3" />
          {generating ? "Gerando..." : "Gerar Agora"}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
      ) : !latest ? (
        <div className="bg-card rounded-xl p-6 border border-border text-center">
          <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum relatório encontrado. Clique em "Gerar Agora" para criar o primeiro.</p>
        </div>
      ) : (
        <>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-xl p-5 border border-border text-center">
            <p className="text-xs text-muted-foreground mb-1">Score SEO</p>
            <p className={`text-4xl font-bold ${scoreColor(latest.score || 0)}`}>{latest.score}/100</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Gerado em {new Date(latest.created_at).toLocaleString("pt-BR")}
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Produtos ativos", value: latest.total_products },
              { label: "Categorias", value: latest.total_categories },
              { label: "URLs no Sitemap", value: latest.sitemap_urls },
              { label: "Sem imagens", value: latest.products_without_images, bad: true },
            ].map((s) => (
              <div key={s.label} className="bg-card rounded-lg p-3 border border-border text-center">
                <p className={`text-lg font-bold ${s.bad && (s.value || 0) > 0 ? "text-destructive" : ""}`}>{s.value || 0}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {report?.issues && (
            <div className="space-y-2">
              <p className="text-xs font-bold">Problemas Encontrados</p>
              {report.issues.map((issue: any, i: number) => (
                <div key={i} className="flex items-start gap-2 bg-card rounded-lg p-3 border border-border">
                  {severityIcon(issue.severity)}
                  <div>
                    <p className="text-xs font-medium">{issue.title}</p>
                    <p className="text-[10px] text-muted-foreground">{issue.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {report?.recommendations && (
            <div className="space-y-2">
              <p className="text-xs font-bold">Recomendações</p>
              {report.recommendations.map((rec: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-muted rounded-lg p-2">
                  <CheckCircle className="w-3 h-3 text-accent flex-shrink-0" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SEOTab;
