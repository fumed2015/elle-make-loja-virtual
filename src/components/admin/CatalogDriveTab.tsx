import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderOpen, Search, Loader2, Sparkles, Download, BarChart3, Package, Tag, Trash2, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";

const CatalogDriveTab = () => {
  const queryClient = useQueryClient();
  const [folderUrl, setFolderUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [listing, setListing] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [deletingImport, setDeletingImport] = useState<string | null>(null);

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

  const handleImport = async () => {
    const folderId = extractFolderId(folderUrl);
    if (!folderId) return;
    setImporting(true);
    try {
      const { data: importRecord, error: insertError } = await supabase
        .from("catalog_imports")
        .insert({ folder_id: folderId, folder_name: folderUrl, status: "pending" })
        .select()
        .single();
      if (insertError) throw insertError;

      const { data, error } = await supabase.functions.invoke("catalog-drive-import", {
        body: { action: "import", import_id: importRecord.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Importação concluída! ${data.totalProducts} produtos extraídos.`);
      queryClient.invalidateQueries({ queryKey: ["catalog-items"] });
      queryClient.invalidateQueries({ queryKey: ["catalog-imports"] });
    } catch (e: any) {
      toast.error(e.message || "Erro na importação");
    } finally {
      setImporting(false);
    }
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
            <h2 className="text-sm font-bold">Catálogo Google Drive</h2>
            <p className="text-[10px] text-muted-foreground">Importe e analise catálogos de marcas via Google Drive</p>
          </div>
        </div>
        <div className="space-y-3">
          <Input
            placeholder="Cole o link da pasta do Google Drive..."
            value={folderUrl}
            onChange={(e) => setFolderUrl(e.target.value)}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleListFolder} disabled={listing || !folderUrl}>
              {listing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Search className="w-3.5 h-3.5 mr-1" />}
              Explorar
            </Button>
            <Button size="sm" onClick={handleImport} disabled={importing || !folderUrl}>
              {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Download className="w-3.5 h-3.5 mr-1" />}
              Importar & Analisar
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Brands preview */}
      {brands.length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase text-muted-foreground">Marcas encontradas</h3>
          <div className="grid grid-cols-2 gap-2">
            {brands.map((b) => (
              <div key={b.id} className="bg-muted rounded-lg p-3">
                <p className="text-sm font-semibold">{b.name}</p>
                <p className="text-[10px] text-muted-foreground">{b.pdfCount} PDFs</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Import history with progress & delete */}
      {imports && imports.length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase text-muted-foreground">Importações</h3>
          {imports.map((imp: any) => {
            const progress = imp.total_files > 0 ? Math.round((imp.processed_files / imp.total_files) * 100) : 0;
            const isProcessing = imp.status === "processing";
            return (
              <div key={imp.id} className="bg-muted rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate max-w-[200px]">{imp.folder_name || imp.folder_id}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {imp.processed_files}/{imp.total_files} arquivos • {new Date(imp.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={imp.status === "completed" ? "default" : isProcessing ? "secondary" : "outline"} className="text-[9px]">
                      {imp.status === "completed" ? "✓ Concluído" : isProcessing ? "⏳ Processando" : "Pendente"}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
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

      {/* Stats bar */}
      {catalogItems && catalogItems.length > 0 && (
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
      )}

      {/* Search and Filters */}
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

      {/* Results */}
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
          <p className="text-[10px]">Cole o link de uma pasta pública do Google Drive acima</p>
        </div>
      ) : null}
    </div>
  );
};

export default CatalogDriveTab;
