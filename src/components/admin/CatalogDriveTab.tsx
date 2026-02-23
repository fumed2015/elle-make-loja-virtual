import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderOpen, Search, Loader2, Sparkles, Download, BarChart3, Package, Tag, Trash2, AlertTriangle, RefreshCw, Play, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import CatalogConsultant from "./CatalogConsultant";
import CatalogAnalysisDashboard from "./CatalogAnalysisDashboard";

const MAX_BATCH_RETRIES = 3;
const BATCH_RETRY_DELAY = 2000;

// Fornecedores pré-configurados
const PRECONFIGURED_SUPPLIERS = [
  { name: "Bem Mulher", folderId: "1MX0Yokicu7eySv8dSP7whn-RZRaqy28-", url: "https://drive.google.com/drive/folders/1MX0Yokicu7eySv8dSP7whn-RZRaqy28-" },
];

type BatchMetric = {
  files: { fileName: string; brandName: string; status: "ok" | "error"; products: number; durationMs: number; error?: string }[];
  successCount: number; failCount: number; totalDurationMs: number;
};

type ProgressState = {
  active: boolean;
  totalFiles: number;
  processedFiles: number;
  totalProducts: number;
  brandsCount: number;
  startTime: number;
  chunkTimes: number[];
  currentChunk: number;
  phase: "discovering" | "processing" | "done" | "error";
  totalErrors: number;
  totalFailures: number;
  batchHistory: BatchMetric[];
  errorDetail?: string;
  supplierName?: string;
};

const CatalogDriveTab = () => {
  const queryClient = useQueryClient();
  const [folderUrl, setFolderUrl] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importingSupplier, setImportingSupplier] = useState<string | null>(null);
  const [listing, setListing] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [deletingImport, setDeletingImport] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<ProgressState | null>(null);

  const { data: catalogItems, isLoading } = useQuery({
    queryKey: ["catalog-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: imports } = useQuery({
    queryKey: ["catalog-imports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("catalog_imports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: importing ? 3000 : false,
  });

  const extractFolderId = (url: string): string | null => {
    const patterns = [
      /\/folders\/([a-zA-Z0-9_-]+)/,
      /id=([a-zA-Z0-9_-]+)/,
      /^([a-zA-Z0-9_-]{20,})$/,
    ];
    for (const p of patterns) {
      const match = url.match(p);
      if (match) return match[1];
    }
    return null;
  };

  // Get import status for a given folder ID
  const getSupplierImportStatus = useCallback((folderId: string) => {
    if (!imports) return null;
    const supplierImports = imports.filter((imp: any) => imp.folder_id === folderId);
    if (supplierImports.length === 0) return null;
    // Prefer processing, then pending, then completed
    const processing = supplierImports.find((imp: any) => imp.status === "processing");
    if (processing) return processing;
    const pending = supplierImports.find((imp: any) => imp.status === "pending");
    if (pending) return pending;
    return supplierImports[0]; // most recent (completed or other)
  }, [imports]);

  const handleListFolder = async () => {
    const folderId = extractFolderId(folderUrl);
    if (!folderId) {
      toast.error("URL de pasta inválida. Cole o link da pasta do Google Drive.");
      return;
    }
    setListing(true);
    setBrands([]);
    try {
      const { data, error } = await supabase.functions.invoke("catalog-drive-import", {
        body: { action: "list-folder", folder_id: folderId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBrands(data.brands || []);
      if (data.brands?.length === 0) {
        toast.info("Nenhuma subpasta (marca) encontrada nessa pasta.");
      } else {
        toast.success(`${data.brands.length} marcas encontradas!`);
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao listar pasta");
    } finally {
      setListing(false);
    }
  };

  const invokeImportWithRetry = async (importId: string, retries = MAX_BATCH_RETRIES): Promise<any> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { data, error } = await supabase.functions.invoke("catalog-drive-import", {
          body: { action: "import", import_id: importId },
        });
        if (error) throw error;
        return data;
      } catch (e: any) {
        console.warn(`Batch attempt ${attempt}/${retries} failed:`, e.message);
        if (attempt === retries) throw e;
        await new Promise(r => setTimeout(r, BATCH_RETRY_DELAY * attempt));
      }
    }
  };

  // Core import logic - works for both supplier buttons and manual URL
  const runImport = async (folderId: string, name: string) => {
    setImporting(true);
    setImportingSupplier(name || folderId);
    try {
      // 1. Check for existing resumable import (processing or pending)
      const { data: existingImports } = await supabase
        .from("catalog_imports")
        .select("id, status, processed_files, total_files")
        .eq("folder_id", folderId)
        .in("status", ["processing", "pending"])
        .order("created_at", { ascending: false })
        .limit(1);

      let importId: string;

      if (existingImports && existingImports.length > 0) {
        const existing = existingImports[0];
        importId = existing.id;

        if (existing.status === "pending") {
          // Needs discover first
          setProgressData({
            active: true, totalFiles: 0, processedFiles: 0, totalProducts: 0, brandsCount: 0,
            startTime: Date.now(), chunkTimes: [], currentChunk: 0, phase: "discovering",
            totalErrors: 0, totalFailures: 0, batchHistory: [], supplierName: name,
          });

          const { data: discoverData, error: discoverError } = await supabase.functions.invoke("catalog-drive-import", {
            body: { action: "discover", import_id: importId },
          });
          if (discoverError) throw discoverError;
          if (discoverData?.error) throw new Error(discoverData.error);

          setProgressData(p => p ? { ...p, totalFiles: discoverData.totalFiles, brandsCount: discoverData.brandsCount, phase: "processing" } : p);
        } else {
          // Resume from last processed index
          toast.info(`Retomando importação: ${existing.processed_files}/${existing.total_files} arquivos já processados`);
          setProgressData({
            active: true, totalFiles: existing.total_files || 0, processedFiles: existing.processed_files || 0,
            totalProducts: 0, brandsCount: 0, startTime: Date.now(), chunkTimes: [], currentChunk: 0,
            phase: "processing", totalErrors: 0, totalFailures: 0, batchHistory: [], supplierName: name,
          });
        }
      } else {
        // Create new import record
        const { data: importRecord, error: insertError } = await supabase
          .from("catalog_imports")
          .insert({ folder_id: folderId, folder_name: name || folderId, status: "pending", supplier_name: name || null } as any)
          .select()
          .single();
        if (insertError) throw insertError;
        importId = importRecord.id;

        // Discover files
        setProgressData({
          active: true, totalFiles: 0, processedFiles: 0, totalProducts: 0, brandsCount: 0,
          startTime: Date.now(), chunkTimes: [], currentChunk: 0, phase: "discovering",
          totalErrors: 0, totalFailures: 0, batchHistory: [], supplierName: name,
        });

        const { data: discoverData, error: discoverError } = await supabase.functions.invoke("catalog-drive-import", {
          body: { action: "discover", import_id: importId },
        });
        if (discoverError) throw discoverError;
        if (discoverData?.error) throw new Error(discoverData.error);

        setProgressData(p => p ? { ...p, totalFiles: discoverData.totalFiles, brandsCount: discoverData.brandsCount, phase: "processing" } : p);
      }

      queryClient.invalidateQueries({ queryKey: ["catalog-imports"] });

      // 2. Process files one at a time with retry loop
      let done = false;
      let totalProducts = 0;
      let consecutiveErrors = 0;

      while (!done) {
        const chunkStart = Date.now();
        try {
          const data = await invokeImportWithRetry(importId);
          consecutiveErrors = 0;

          if (data?.needsDiscover) {
            const { data: discoverData, error: discoverError } = await supabase.functions.invoke("catalog-drive-import", {
              body: { action: "discover", import_id: importId },
            });
            if (discoverError) throw discoverError;
            if (discoverData?.error) throw new Error(discoverData.error);
            setProgressData(p => p ? { ...p, totalFiles: discoverData.totalFiles, brandsCount: discoverData.brandsCount, phase: "processing" } : p);
            continue;
          }

          if (data?.error) { console.warn("Batch warning:", data.error); break; }

          const chunkMs = Date.now() - chunkStart;
          done = data.done;
          totalProducts += data.productsInChunk || 0;

          const batchMetrics = data.batchMetrics as BatchMetric | undefined;
          setProgressData(p => p ? {
            ...p,
            processedFiles: data.processedFiles || p.processedFiles,
            totalFiles: data.totalFiles || p.totalFiles,
            totalProducts,
            currentChunk: p.currentChunk + 1,
            chunkTimes: [...p.chunkTimes, chunkMs],
            totalErrors: p.totalErrors + (batchMetrics?.failCount || 0),
            totalFailures: data.totalFailures || p.totalFailures,
            batchHistory: batchMetrics ? [...p.batchHistory, batchMetrics] : p.batchHistory,
            phase: done ? "done" : "processing",
          } : p);
        } catch (batchErr: any) {
          consecutiveErrors++;
          const chunkMs = Date.now() - chunkStart;
          setProgressData(p => p ? {
            ...p, currentChunk: p.currentChunk + 1, chunkTimes: [...p.chunkTimes, chunkMs],
            totalErrors: p.totalErrors + 1, errorDetail: batchErr.message,
          } : p);

          if (consecutiveErrors >= 3) {
            toast.error(`Importação pausada após ${consecutiveErrors} erros consecutivos. Clique novamente para retomar.`);
            setProgressData(p => p ? { ...p, phase: "error", errorDetail: `${consecutiveErrors} erros consecutivos: ${batchErr.message}` } : p);
            break;
          }
          await new Promise(r => setTimeout(r, 3000));
        }
        queryClient.invalidateQueries({ queryKey: ["catalog-imports"] });
      }

      if (done) {
        toast.success(`Catálogo ${name || "do fornecedor"} importado! ${totalProducts} produtos extraídos.`);
        setProgressData(p => p ? { ...p, phase: "done" } : p);
      }
      queryClient.invalidateQueries({ queryKey: ["catalog-items"] });
      queryClient.invalidateQueries({ queryKey: ["catalog-imports"] });
    } catch (e: any) {
      const errorMsg = e.message || "Erro na importação";
      toast.error(errorMsg);
      setProgressData(p => p ? { ...p, phase: "error", errorDetail: errorMsg } : p);
      queryClient.invalidateQueries({ queryKey: ["catalog-imports"] });
    } finally {
      setImporting(false);
      setImportingSupplier(null);
    }
  };

  const handleImport = async () => {
    const folderId = extractFolderId(folderUrl);
    if (!folderId) return;
    const name = supplierName || PRECONFIGURED_SUPPLIERS.find(s => s.folderId === folderId)?.name || "";
    await runImport(folderId, name);
  };

  const handleSupplierImport = async (supplier: typeof PRECONFIGURED_SUPPLIERS[0]) => {
    setFolderUrl(supplier.url);
    setSupplierName(supplier.name);
    await runImport(supplier.folderId, supplier.name);
  };

  const handleDeleteImport = async (importId: string) => {
    setDeletingImport(importId);
    try {
      const { data, error } = await supabase.functions.invoke("catalog-drive-import", {
        body: { action: "delete-import", import_id: importId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Importação e itens removidos.");
      queryClient.invalidateQueries({ queryKey: ["catalog-items"] });
      queryClient.invalidateQueries({ queryKey: ["catalog-imports"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao deletar importação");
    } finally {
      setDeletingImport(null);
    }
  };

  const handleDeleteAllCatalog = async () => {
    if (!confirm("Tem certeza que deseja apagar TODOS os itens do catálogo?")) return;
    try {
      const { error } = await supabase.from("catalog_items").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      const { error: err2 } = await supabase.from("catalog_imports").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (err2) throw err2;
      toast.success("Todos os itens do catálogo foram removidos.");
      queryClient.invalidateQueries({ queryKey: ["catalog-items"] });
      queryClient.invalidateQueries({ queryKey: ["catalog-imports"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao limpar catálogo");
    }
  };

  const handleGenerateInsights = async () => {
    setGeneratingInsights(true);
    setInsights(null);
    try {
      const { data, error } = await supabase.functions.invoke("catalog-drive-import", {
        body: { action: "insights" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setInsights(data.insights);
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar insights");
    } finally {
      setGeneratingInsights(false);
    }
  };

  const allBrands = [...new Set(catalogItems?.map((i) => i.brand) || [])].sort();
  const allCategories = [...new Set(catalogItems?.map((i) => i.category).filter(Boolean) || [])].sort();

  const filtered = catalogItems?.filter((item) => {
    const matchSearch =
      !search ||
      item.product_name.toLowerCase().includes(search.toLowerCase()) ||
      item.brand.toLowerCase().includes(search.toLowerCase()) ||
      item.description?.toLowerCase().includes(search.toLowerCase());
    const matchBrand = filterBrand === "all" || item.brand === filterBrand;
    const matchCategory = filterCategory === "all" || item.category === filterCategory;
    return matchSearch && matchBrand && matchCategory;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-5 border border-primary/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold">Catálogo de Fornecedores</h2>
            <p className="text-[10px] text-muted-foreground">Importe catálogos de fornecedores via Google Drive</p>
          </div>
        </div>

        {/* Supplier Cards */}
        {PRECONFIGURED_SUPPLIERS.length > 0 && (
          <div className="space-y-2 mb-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase">Fornecedores cadastrados</p>
            <div className="grid grid-cols-1 gap-2">
              {PRECONFIGURED_SUPPLIERS.map((supplier) => {
                const importStatus = getSupplierImportStatus(supplier.folderId);
                const isThisImporting = importingSupplier === supplier.name;
                const status = importStatus?.status;
                const processed = importStatus?.processed_files || 0;
                const total = importStatus?.total_files || 0;

                return (
                  <Card key={supplier.folderId} className="p-3 border-primary/10">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{supplier.name}</p>
                          <div className="flex items-center gap-1.5">
                            {status === "completed" && (
                              <Badge variant="default" className="text-[8px] h-4 gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                Importado ({processed} arquivos)
                              </Badge>
                            )}
                            {status === "processing" && (
                              <Badge variant="secondary" className="text-[8px] h-4 gap-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                {processed}/{total} processados
                              </Badge>
                            )}
                            {status === "pending" && (
                              <Badge variant="outline" className="text-[8px] h-4">Pendente</Badge>
                            )}
                            {!status && (
                              <span className="text-[9px] text-muted-foreground">Não importado</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={status === "processing" ? "default" : "outline"}
                        className="text-[10px] h-7 gap-1 shrink-0"
                        disabled={isThisImporting || (importing && !isThisImporting)}
                        onClick={() => handleSupplierImport(supplier)}
                      >
                        {isThisImporting ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : status === "processing" ? (
                          <RefreshCw className="w-3 h-3" />
                        ) : status === "completed" ? (
                          <RefreshCw className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                        {status === "processing" ? "Retomar" : status === "completed" ? "Reimportar" : "Importar"}
                      </Button>
                    </div>
                    {status === "processing" && total > 0 && (
                      <Progress value={(processed / total) * 100} className="h-1 mt-2" />
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Manual URL input */}
        <div className="space-y-3">
          <Input
            placeholder="Ou cole o link da pasta do fornecedor no Google Drive..."
            value={folderUrl}
            onChange={(e) => { setFolderUrl(e.target.value); setSupplierName(""); }}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleListFolder} disabled={listing || !folderUrl}>
              {listing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Search className="w-3.5 h-3.5 mr-1" />}
              Explorar
            </Button>
            <Button size="sm" onClick={handleImport} disabled={importing || !folderUrl}>
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Download className="w-3.5 h-3.5 mr-1" />}
              Importar Catálogo
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Brands preview */}
      {brands.length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase text-muted-foreground">Marcas encontradas</h3>
          <div className="grid grid-cols-2 gap-2">
            {brands.map((b: any) => (
              <div key={b.id} className="bg-muted rounded-lg p-3">
                <p className="text-sm font-semibold">{b.name}</p>
                <p className="text-[10px] text-muted-foreground">{b.pdfCount} PDFs</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Live Progress Panel ── */}
      {progressData && progressData.active && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-5 space-y-4 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  {progressData.phase === "processing" && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold">
                    {progressData.supplierName ? `Importando: ${progressData.supplierName}` : "Progresso da Importação"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    {progressData.phase === "discovering" && "Descobrindo arquivos do fornecedor..."}
                    {progressData.phase === "processing" && "Processando PDFs (1 arquivo por vez com retry automático)..."}
                    {progressData.phase === "done" && "✓ Catálogo do fornecedor importado com sucesso!"}
                    {progressData.phase === "error" && (
                      <span className="text-destructive">
                        ✗ Importação pausada — {progressData.errorDetail || "erro desconhecido"}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {progressData.phase === "error" && progressData.supplierName && (
                  <Button size="sm" variant="outline" className="text-[10px] h-6 gap-1" 
                    onClick={() => {
                      const supplier = PRECONFIGURED_SUPPLIERS.find(s => s.name === progressData.supplierName);
                      if (supplier) handleSupplierImport(supplier);
                    }} 
                    disabled={importing}>
                    <RefreshCw className="w-3 h-3" />
                    Retomar
                  </Button>
                )}
                {(progressData.phase === "done" || progressData.phase === "error") && (
                  <Button size="sm" variant="ghost" className="text-[10px] h-6" onClick={() => setProgressData(null)}>
                    Fechar
                  </Button>
                )}
              </div>
            </div>

            {progressData.totalFiles > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{progressData.processedFiles} de {progressData.totalFiles} PDFs</span>
                  <span className="font-bold text-foreground">
                    {Math.round((progressData.processedFiles / progressData.totalFiles) * 100)}%
                  </span>
                </div>
                <Progress value={(progressData.processedFiles / progressData.totalFiles) * 100} className="h-2.5" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>{progressData.totalFiles - progressData.processedFiles} PDFs restantes</span>
                  <span>Arquivo #{progressData.currentChunk}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2">
              <div className="bg-card rounded-lg p-2.5 border text-center">
                <p className="text-lg font-bold text-primary">{progressData.processedFiles}</p>
                <p className="text-[8px] text-muted-foreground uppercase">Processados</p>
              </div>
              <div className="bg-card rounded-lg p-2.5 border text-center">
                <p className="text-lg font-bold text-destructive">{progressData.totalFiles - progressData.processedFiles}</p>
                <p className="text-[8px] text-muted-foreground uppercase">Restantes</p>
              </div>
              <div className="bg-card rounded-lg p-2.5 border text-center">
                <p className="text-lg font-bold text-accent-foreground">{progressData.totalProducts}</p>
                <p className="text-[8px] text-muted-foreground uppercase">Produtos</p>
              </div>
              <div className="bg-card rounded-lg p-2.5 border text-center">
                <p className="text-lg font-bold text-accent-foreground">
                  {progressData.chunkTimes.length > 0
                    ? `${Math.round(progressData.chunkTimes[progressData.chunkTimes.length - 1] / 1000)}s`
                    : "—"}
                </p>
                <p className="text-[8px] text-muted-foreground uppercase">Último</p>
              </div>
            </div>

            {progressData.chunkTimes.length > 1 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Tempo por Arquivo (s)</p>
                <div className="flex items-end gap-0.5 h-12">
                  {progressData.chunkTimes.map((ms, i) => {
                    const maxMs = Math.max(...progressData.chunkTimes);
                    const heightPct = maxMs > 0 ? (ms / maxMs) * 100 : 10;
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-primary/60 rounded-t-sm transition-all duration-300 min-w-[3px]"
                        style={{ height: `${Math.max(heightPct, 8)}%` }}
                        title={`Arquivo ${i + 1}: ${(ms / 1000).toFixed(1)}s`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[8px] text-muted-foreground">
                  <span>Média: {(progressData.chunkTimes.reduce((a, b) => a + b, 0) / progressData.chunkTimes.length / 1000).toFixed(1)}s</span>
                  <span>
                    ETA: {(() => {
                      const remaining = progressData.totalFiles - progressData.processedFiles;
                      const avgMs = progressData.chunkTimes.reduce((a, b) => a + b, 0) / progressData.chunkTimes.length;
                      const etaSec = (remaining * avgMs) / 1000;
                      if (etaSec < 60) return `~${Math.round(etaSec)}s`;
                      return `~${Math.round(etaSec / 60)}min`;
                    })()}
                  </span>
                </div>
              </div>
            )}

            {progressData.currentChunk > 0 && (
              <div className="flex gap-2 text-[10px]">
                <span className="text-primary font-semibold">
                  ✓ {progressData.batchHistory.reduce((s, b) => s + b.successCount, 0)} OK
                </span>
                {progressData.totalErrors > 0 && (
                  <span className="text-destructive font-semibold">
                    ✗ {progressData.totalErrors} erro(s)
                  </span>
                )}
                {progressData.totalFailures > 0 && (
                  <span className="text-destructive/70 font-semibold">
                    ⚠ {progressData.totalFailures} falha(s) persistidas
                  </span>
                )}
              </div>
            )}

            {progressData.batchHistory.length > 0 && (() => {
              const last = progressData.batchHistory[progressData.batchHistory.length - 1];
              return (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Último Arquivo (#{progressData.currentChunk})
                  </p>
                  {last.files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-card rounded px-2 py-1 border text-[9px]">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className={f.status === "ok" ? "text-primary" : "text-destructive"}>
                          {f.status === "ok" ? "✓" : "✗"}
                        </span>
                        <span className="truncate">{f.fileName}</span>
                        <span className="text-muted-foreground shrink-0">({f.brandName})</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {f.status === "ok" ? (
                          <>
                            <span className="font-semibold">{f.products} prod.</span>
                            <span className="text-muted-foreground">{(f.durationMs / 1000).toFixed(1)}s</span>
                          </>
                        ) : (
                          <span className="text-destructive truncate max-w-[120px]">{f.error}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="text-[9px] text-muted-foreground text-right">
              Tempo decorrido: {(() => {
                const elapsed = (Date.now() - progressData.startTime) / 1000;
                if (elapsed < 60) return `${Math.round(elapsed)}s`;
                return `${Math.floor(elapsed / 60)}min ${Math.round(elapsed % 60)}s`;
              })()}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Import History */}
      {imports && imports.length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase text-muted-foreground">Histórico de Importações</h3>
          {imports.map((imp: any) => {
            const progress = imp.total_files > 0 ? Math.round((imp.processed_files / imp.total_files) * 100) : 0;
            const isProcessing = imp.status === "processing";
            const displayName = imp.supplier_name || imp.folder_name || imp.folder_id;
            return (
              <div key={imp.id} className="bg-muted rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate max-w-[200px]">{displayName}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {imp.processed_files}/{imp.total_files} arquivos • {new Date(imp.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={imp.status === "completed" ? "default" : isProcessing ? "secondary" : "outline"} className="text-[9px]">
                      {imp.status === "completed" ? "✓ Concluído" : isProcessing ? "⏳ Processando" : "Pendente"}
                    </Badge>
                    {isProcessing && !importing && (
                      <Button
                        size="icon" variant="ghost" className="h-6 w-6" title="Retomar importação"
                        onClick={() => runImport(imp.folder_id, imp.supplier_name || imp.folder_name || "")}
                      >
                        <RefreshCw className="w-3 h-3 text-primary" />
                      </Button>
                    )}
                    <Button
                      size="icon" variant="ghost" className="h-6 w-6"
                      disabled={deletingImport === imp.id}
                      onClick={() => handleDeleteImport(imp.id)}
                    >
                      {deletingImport === imp.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>
                {isProcessing && <Progress value={progress} className="h-1.5" />}
                {imp.error_message && (
                  <div className="flex items-center gap-1 text-[9px] text-destructive">
                    <AlertTriangle className="w-3 h-3" />
                    {imp.error_message}
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      {/* AI Insights */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase text-muted-foreground">Insights IA</h3>
          </div>
          <Button size="sm" variant="outline" onClick={handleGenerateInsights} disabled={generatingInsights || !catalogItems?.length}>
            {generatingInsights ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <BarChart3 className="w-3.5 h-3.5 mr-1" />}
            Gerar Insights
          </Button>
        </div>
        {insights && (
          <div className="prose prose-sm max-w-none dark:prose-invert bg-muted rounded-lg p-4 text-xs">
            <ReactMarkdown>{insights}</ReactMarkdown>
          </div>
        )}
      </Card>

      <CatalogAnalysisDashboard />
      <CatalogConsultant />

      {catalogItems && catalogItems.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-card rounded-xl p-3 border text-center">
              <Package className="w-4 h-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">{catalogItems.length}</p>
              <p className="text-[9px] text-muted-foreground">Produtos</p>
            </div>
            <div className="bg-card rounded-xl p-3 border text-center">
              <Tag className="w-4 h-4 mx-auto mb-1 text-accent" />
              <p className="text-lg font-bold">{allBrands.length}</p>
              <p className="text-[9px] text-muted-foreground">Marcas</p>
            </div>
            <div className="bg-card rounded-xl p-3 border text-center">
              <FolderOpen className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{allCategories.length}</p>
              <p className="text-[9px] text-muted-foreground">Categorias</p>
            </div>
          </div>
          <Button size="sm" variant="destructive" className="w-full text-xs" onClick={handleDeleteAllCatalog}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Limpar Todo o Catálogo
          </Button>
        </div>
      )}

      {catalogItems && catalogItems.length > 0 && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por produto, marca..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterBrand} onValueChange={setFilterBrand}>
              <SelectTrigger className="text-xs h-8 flex-1">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as marcas</SelectItem>
                {allBrands.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="text-xs h-8 flex-1">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {allCategories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground">{filtered.length} produtos encontrados</p>
          {filtered.slice(0, 100).map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.5) }}>
              <Card className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge variant="secondary" className="text-[8px] shrink-0">{item.brand}</Badge>
                      {item.category && <Badge variant="outline" className="text-[8px] shrink-0">{item.category}</Badge>}
                    </div>
                    <p className="text-sm font-medium truncate">{item.product_name}</p>
                    {item.description && (
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>
                    )}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {item.tags.slice(0, 4).map((tag: string, ti: number) => (
                          <span key={ti} className="text-[8px] bg-muted px-1.5 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {item.price ? (
                      <>
                        {item.compare_at_price && (
                          <p className="text-[9px] text-muted-foreground line-through">
                            R$ {Number(item.compare_at_price).toFixed(2).replace(".", ",")}
                          </p>
                        )}
                        <p className="text-sm font-bold text-primary">
                          R$ {Number(item.price).toFixed(2).replace(".", ",")}
                        </p>
                      </>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">Sem preço</p>
                    )}
                  </div>
                </div>
                <p className="text-[8px] text-muted-foreground mt-1">📄 {item.source_file}</p>
              </Card>
            </motion.div>
          ))}
          {filtered.length > 100 && (
            <p className="text-[10px] text-center text-muted-foreground">Mostrando 100 de {filtered.length} produtos</p>
          )}
        </div>
      ) : catalogItems && catalogItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum catálogo importado ainda</p>
          <p className="text-[10px]">Clique em um fornecedor acima ou cole um link do Google Drive</p>
        </div>
      ) : null}
    </div>
  );
};

export default CatalogDriveTab;
