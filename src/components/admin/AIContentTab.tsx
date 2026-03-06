import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Wand2, Sparkles, Loader2, RefreshCw, CheckCircle, AlertTriangle, Info, Eye } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { toast } from "sonner";
import { motion } from "framer-motion";

const AIContentTab = () => {
  const { data: products, refetch } = useProducts({});
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkAllRunning, setBulkAllRunning] = useState(false);
  const [bulkCompleteRunning, setBulkCompleteRunning] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);

  const productsNoDesc = products?.filter(p => !p.description || p.description.length < 30) || [];
  const productsNoSensorial = products?.filter(p => !p.sensorial_description) || [];
  const productsNoTags = products?.filter(p => !p.tags || p.tags.length === 0) || [];
  const productsNoImages = products?.filter(p => !p.images || p.images.length === 0) || [];

  const handleBulkSEO = async (forceAll = false) => {
    if (forceAll) setBulkAllRunning(true);
    else setBulkRunning(true);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-content-generator", {
        body: { action: "bulk-seo", force_all: forceAll },
      });
      if (error) throw error;
      setResults(data?.results || []);
      toast.success(`${data?.updated || 0} produtos otimizados!`);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Erro no SEO em lote");
    } finally {
      setBulkRunning(false);
      setBulkAllRunning(false);
    }
  };

  const handleBulkComplete = async () => {
    setBulkCompleteRunning(true);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-content-generator", {
        body: { action: "bulk-complete", force_all: false },
      });
      if (error) throw error;
      setResults(data?.results || []);
      toast.success(`${data?.updated || 0} produtos completos (descrição + imagem)!`);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Erro na geração completa");
    } finally {
      setBulkCompleteRunning(false);
    }
  };

  const handleGeneratePreview = async (productId: string) => {
    setGeneratingId(productId);
    setPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-content-generator", {
        body: { action: "generate", product_id: productId },
      });
      if (error) throw error;
      setPreview({ ...data?.content, product_id: productId });
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar preview");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleApplyPreview = async () => {
    if (!preview) return;
    const updateData: any = {};
    if (preview.description) updateData.description = preview.description;
    if (preview.sensorial_description) updateData.sensorial_description = preview.sensorial_description;
    if (preview.how_to_use) updateData.how_to_use = preview.how_to_use;
    if (preview.tags) updateData.tags = preview.tags;

    const { error } = await supabase.from("products").update(updateData).eq("id", preview.product_id);
    if (error) toast.error("Erro ao salvar");
    else {
      toast.success("Conteúdo aplicado com sucesso!");
      setPreview(null);
      refetch();
    }
  };

  const anyRunning = bulkRunning || bulkAllRunning || bulkCompleteRunning;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-5 border border-primary/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Gerador de Conteúdo com IA</h2>
            <p className="text-xs text-muted-foreground">Crie descrições, títulos SEO, tags e imagens automaticamente</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Sem descrição", count: productsNoDesc.length, bad: true },
          { label: "Sem copy sensorial", count: productsNoSensorial.length, warn: true },
          { label: "Sem tags", count: productsNoTags.length, warn: true },
          { label: "Sem imagens", count: productsNoImages.length, bad: true },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-lg p-3 border border-border text-center">
            <p className={`text-lg font-bold ${s.count > 0 ? (s.bad ? "text-destructive" : "text-yellow-500") : "text-accent"}`}>{s.count}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4 border-2 border-primary/30 space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          🚀 Geração Completa (Descrições + Imagens)
        </h3>
        <p className="text-xs text-muted-foreground">
          A IA irá gerar descrições SEO, copy sensorial, instruções de uso, tags E imagens profissionais para todos os produtos que ainda não possuem conteúdo.
        </p>
        <Button onClick={handleBulkComplete} disabled={anyRunning} className="w-full bg-primary text-primary-foreground text-xs gap-2 h-10">
          {bulkCompleteRunning ? <><Loader2 className="w-4 h-4 animate-spin" />Gerando...</> : <><Wand2 className="w-4 h-4" />Gerar Tudo para Produtos Incompletos</>}
        </Button>
      </div>

      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Otimização de Texto em Lote
        </h3>
        <div className="flex flex-col gap-2">
          <Button onClick={() => handleBulkSEO(false)} disabled={anyRunning} className="bg-primary text-primary-foreground text-xs gap-2">
            {bulkRunning ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Processando...</> : <><Wand2 className="w-3.5 h-3.5" />Otimizar Produtos sem Conteúdo (até 10)</>}
          </Button>
          <Button onClick={() => handleBulkSEO(true)} disabled={anyRunning} variant="outline" className="text-xs gap-2 border-primary/30 text-primary">
            {bulkAllRunning ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Gerando para TODOS...</> : <><RefreshCw className="w-3.5 h-3.5" />Regerar Textos para TODOS</>}
          </Button>
        </div>

        {results && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs p-2 bg-muted rounded-lg">
                {r.status === "updated" ? <CheckCircle className="w-3.5 h-3.5 text-accent flex-shrink-0" /> :
                 r.status === "skipped" ? <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> :
                 <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
                <span className="truncate">{r.name}</span>
                <Badge variant="secondary" className="text-[8px] ml-auto flex-shrink-0">
                  {r.status === "updated" ? `✓ ${r.fields?.join(", ")}` : r.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-primary" />
          Gerar para Produto Específico
        </h3>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {products?.map((p) => (
            <div key={p.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <div className="w-8 h-8 rounded bg-background overflow-hidden flex-shrink-0">
                {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[7px] text-muted-foreground">📷</div>}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs truncate block">{p.name}</span>
                <div className="flex gap-1 mt-0.5">
                  {(!p.description || p.description.length < 30) && <Badge variant="destructive" className="text-[7px] px-1 py-0">sem texto</Badge>}
                  {(!p.images || p.images.length === 0) && <Badge variant="destructive" className="text-[7px] px-1 py-0">sem imagem</Badge>}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleGeneratePreview(p.id)} disabled={generatingId === p.id} className="text-xs h-7 gap-1 px-2">
                {generatingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                Texto
              </Button>
            </div>
          ))}
        </div>
      </div>

      {preview && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-5 border-2 border-primary/30 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
            <Eye className="w-4 h-4" />
            Preview do Conteúdo Gerado
          </h3>
          <div className="space-y-3">
            {preview.description && <div><Label className="text-xs font-bold text-muted-foreground">Descrição</Label><p className="text-xs leading-relaxed mt-1 bg-muted p-3 rounded-lg">{preview.description}</p></div>}
            {preview.sensorial_description && <div><Label className="text-xs font-bold text-muted-foreground">Descrição Sensorial</Label><p className="text-xs leading-relaxed mt-1 bg-muted p-3 rounded-lg">{preview.sensorial_description}</p></div>}
            {preview.how_to_use && <div><Label className="text-xs font-bold text-muted-foreground">Como Usar</Label><p className="text-xs leading-relaxed mt-1 bg-muted p-3 rounded-lg whitespace-pre-line">{preview.how_to_use}</p></div>}
            {preview.tags && <div><Label className="text-xs font-bold text-muted-foreground">Tags SEO</Label><div className="flex flex-wrap gap-1 mt-1">{preview.tags.map((tag: string, i: number) => <Badge key={i} variant="secondary" className="text-[10px]">{tag}</Badge>)}</div></div>}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleApplyPreview} className="bg-primary text-primary-foreground text-xs gap-1 flex-1"><CheckCircle className="w-3.5 h-3.5" />Aplicar ao Produto</Button>
            <Button onClick={() => setPreview(null)} variant="outline" className="text-xs">Descartar</Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AIContentTab;
