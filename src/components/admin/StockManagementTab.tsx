import { useState, useRef } from "react";
import { Download, Upload, Package, AlertTriangle, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useProducts } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface StockUpdate {
  id: string;
  name: string;
  currentStock: number;
  newStock: number;
  status: "pending" | "success" | "error";
  error?: string;
}

const StockManagementTab = () => {
  const { data: products, refetch } = useProducts({});
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<StockUpdate[] | null>(null);
  const [applying, setApplying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inlineEdits, setInlineEdits] = useState<Record<string, string>>({});

  const lowStockProducts = products?.filter((p) => p.stock <= 5 && p.is_active) || [];
  const outOfStockProducts = products?.filter((p) => p.stock <= 0 && p.is_active) || [];

  const filteredProducts = products?.filter((p) =>
    !searchQuery ||
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // ── Export CSV ──
  const handleExport = () => {
    if (!products || products.length === 0) {
      toast.error("Nenhum produto para exportar");
      return;
    }

    const headers = ["id", "name", "brand", "stock", "price", "is_active"];
    const rows = products.map((p) => [
      p.id,
      `"${(p.name || "").replace(/"/g, '""')}"`,
      `"${(p.brand || "").replace(/"/g, '""')}"`,
      p.stock,
      p.price,
      p.is_active ? "true" : "false",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `estoque_ellemake_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${products.length} produtos exportados!`);
  };

  // ── Import CSV ──
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length < 2) throw new Error("CSV vazio ou inválido");

        const header = lines[0].toLowerCase();
        const idCol = header.split(",").findIndex((h) => h.trim() === "id");
        const stockCol = header.split(",").findIndex((h) => h.trim() === "stock" || h.trim() === "estoque");

        if (idCol === -1 || stockCol === -1) {
          throw new Error("CSV deve conter colunas 'id' e 'stock'");
        }

        const updates: StockUpdate[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i]);
          const productId = cols[idCol]?.trim();
          const newStockStr = cols[stockCol]?.trim();
          if (!productId || !newStockStr) continue;

          const newStock = parseInt(newStockStr);
          if (isNaN(newStock) || newStock < 0) continue;

          const product = products?.find((p) => p.id === productId);
          if (!product) continue;

          if (product.stock !== newStock) {
            updates.push({
              id: productId,
              name: product.name,
              currentStock: product.stock,
              newStock,
              status: "pending",
            });
          }
        }

        if (updates.length === 0) {
          toast.info("Nenhuma alteração de estoque encontrada no CSV");
          setPreview(null);
        } else {
          setPreview(updates);
          toast.success(`${updates.length} alterações encontradas`);
        }
      } catch (err: any) {
        toast.error(err.message || "Erro ao ler CSV");
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  // Simple CSV line parser handling quoted fields
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === "," && !inQuotes) { result.push(current); current = ""; continue; }
      current += char;
    }
    result.push(current);
    return result;
  };

  // ── Apply import ──
  const handleApplyImport = async () => {
    if (!preview) return;
    setApplying(true);

    const updated = [...preview];
    let successCount = 0;

    for (let i = 0; i < updated.length; i++) {
      try {
        const { error } = await supabase
          .from("products")
          .update({ stock: updated[i].newStock })
          .eq("id", updated[i].id);
        if (error) throw error;
        updated[i].status = "success";
        successCount++;
      } catch (err: any) {
        updated[i].status = "error";
        updated[i].error = err.message;
      }
      setPreview([...updated]);
    }

    queryClient.invalidateQueries({ queryKey: ["products"] });
    refetch();
    toast.success(`${successCount}/${updated.length} estoques atualizados!`);
    setApplying(false);
  };

  // ── Inline stock edit ──
  const handleInlineStockSave = async (productId: string) => {
    const newVal = parseInt(inlineEdits[productId]);
    if (isNaN(newVal) || newVal < 0) {
      toast.error("Valor inválido");
      return;
    }

    const { error } = await supabase
      .from("products")
      .update({ stock: newVal })
      .eq("id", productId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Estoque atualizado!");
      setInlineEdits((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
      refetch();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button onClick={handleExport} variant="outline" size="sm" className="gap-1.5 text-xs h-8">
          <Download className="w-3.5 h-3.5" /> Exportar CSV
        </Button>
        <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm" className="gap-1.5 text-xs h-8" disabled={importing}>
          {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Importar CSV
        </Button>
        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
      </div>

      {/* Alerts */}
      {outOfStockProducts.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-destructive">{outOfStockProducts.length} produto(s) sem estoque</p>
            <p className="text-[10px] text-muted-foreground">{outOfStockProducts.map((p) => p.name).join(", ")}</p>
          </div>
        </div>
      )}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2">
          <Package className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-700">{lowStockProducts.length} produto(s) com estoque baixo (≤5)</p>
            <p className="text-[10px] text-muted-foreground">{lowStockProducts.map((p) => `${p.name} (${p.stock})`).join(", ")}</p>
          </div>
        </div>
      )}

      {/* Import Preview */}
      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-card rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Pré-visualização ({preview.length} alterações)</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setPreview(null)} className="text-xs h-7" disabled={applying}>
                  <X className="w-3 h-3 mr-1" /> Cancelar
                </Button>
                <Button size="sm" onClick={handleApplyImport} className="text-xs h-7 gap-1" disabled={applying}>
                  {applying ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  Aplicar
                </Button>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-1">
              {preview.map((item) => (
                <div key={item.id} className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-lg ${
                  item.status === "success" ? "bg-accent/10" : item.status === "error" ? "bg-destructive/10" : "bg-muted"
                }`}>
                  <span className="truncate flex-1">{item.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-muted-foreground">{item.currentStock}</span>
                    <span>→</span>
                    <span className={`font-bold ${item.newStock > item.currentStock ? "text-accent" : item.newStock < item.currentStock ? "text-destructive" : ""}`}>
                      {item.newStock}
                    </span>
                    {item.status === "success" && <Check className="w-3 h-3 text-accent" />}
                    {item.status === "error" && <X className="w-3 h-3 text-destructive" />}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stock Table */}
      <div className="space-y-2">
        <Input
          placeholder="Buscar produto..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-muted border-none min-h-[36px] text-sm"
        />
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_80px_60px] gap-2 px-3 py-2 bg-muted text-[10px] font-bold text-muted-foreground uppercase">
            <span>Produto</span>
            <span className="text-center">Estoque</span>
            <span className="text-center">Novo</span>
            <span className="text-center">Ação</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto divide-y divide-border">
            {filteredProducts.map((product) => (
              <div key={product.id} className="grid grid-cols-[1fr_80px_80px_60px] gap-2 px-3 py-2 items-center">
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{product.name}</p>
                  <p className="text-[10px] text-muted-foreground">{product.brand}</p>
                </div>
                <div className="text-center">
                  <Badge variant={product.stock <= 0 ? "destructive" : product.stock <= 5 ? "secondary" : "outline"} className="text-[10px]">
                    {product.stock}
                  </Badge>
                </div>
                <div>
                  <Input
                    type="number"
                    min="0"
                    value={inlineEdits[product.id] ?? ""}
                    onChange={(e) => setInlineEdits({ ...inlineEdits, [product.id]: e.target.value })}
                    placeholder={String(product.stock)}
                    className="bg-muted border-none h-7 text-xs text-center p-1"
                  />
                </div>
                <div className="text-center">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    disabled={!inlineEdits[product.id] || inlineEdits[product.id] === String(product.stock)}
                    onClick={() => handleInlineStockSave(product.id)}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          {filteredProducts.length} produto(s) • CSV: exporte, edite a coluna "stock" e reimporte
        </p>
      </div>
    </div>
  );
};

export default StockManagementTab;
