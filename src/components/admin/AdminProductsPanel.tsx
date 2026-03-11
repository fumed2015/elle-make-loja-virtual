import { useState } from "react";
import { Plus, Box, Search, Pencil, Trash2, Eye, EyeOff, Wand2, Loader2, Star, ChevronDown, ChevronUp, ImageIcon, X, Save, ArrowLeft, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type View = "list" | "add" | "edit";

interface Swatch {
  name: string;
  color: string;
  barcode?: string;
  ref_code?: string;
  stock?: number;
  available?: boolean;
}

// Mapa de cores comuns em cosméticos para auto-geração
const COLOR_MAP: Record<string, string> = {
  "nude": "#c8a98a", "bege": "#d4b896", "bege claro": "#e8d5b7", "bege medio": "#c4a882", "bege escuro": "#a07850",
  "marrom": "#6b3a2a", "marrom claro": "#8b5e3c", "marrom escuro": "#4a2a1a", "chocolate": "#5c3317",
  "vermelho": "#c0392b", "red": "#c0392b", "vinho": "#722f37", "marsala": "#8e3741", "borgonha": "#800020",
  "rosa": "#e8a0b4", "pink": "#e84393", "rosa claro": "#f0c0d0", "rosa escuro": "#c45a7a", "rosado": "#d4917a",
  "coral": "#e8735a", "laranja": "#d35400", "pêssego": "#e8b090", "pessego": "#e8b090", "terracota": "#b45639",
  "dourado": "#c9a84c", "gold": "#c9a84c", "bronze": "#8b6b3d", "cobre": "#b87333", "champagne": "#d4b896",
  "preto": "#1a1a1a", "black": "#1a1a1a", "branco": "#f5f5f5", "white": "#f5f5f5",
  "cinza": "#808080", "prata": "#c0c0c0", "natural": "#d4b896", "caramelo": "#a06030",
  "lilás": "#b39ddb", "lilas": "#b39ddb", "roxo": "#6a1b9a", "violeta": "#7b1fa2", "uva": "#5c2a6a",
  "verm. escuro": "#8b1a1a", "berry": "#8e2252", "cereja": "#a0202a", "framboesa": "#c72c48",
  "malva": "#993366", "ameixa": "#6a2c6a", "mogno": "#5a2a1a", "canela": "#8b5740",
  "mel": "#d4a540", "caramelo claro": "#c8943c", "café": "#4a3420", "tabaco": "#6b4226",
  "pêssego claro": "#f0d0b8", "damasco": "#e8a860", "salmão": "#e87060", "salmon": "#e87060",
  "magenta": "#c2185b", "fúcsia": "#c2185b", "fucsia": "#c2185b",
}

function autoGenerateSwatches(productName: string): Swatch[] {
  const name = productName.toLowerCase();
  const results: Swatch[] = [];
  
  // Try to extract color names from the product name
  const sortedKeys = Object.keys(COLOR_MAP).sort((a, b) => b.length - a.length);
  for (const colorName of sortedKeys) {
    if (name.includes(colorName) && !results.find(r => r.color === COLOR_MAP[colorName])) {
      results.push({
        name: colorName.charAt(0).toUpperCase() + colorName.slice(1),
        color: COLOR_MAP[colorName],
        stock: 0,
        available: true,
      });
    }
  }
  
  // If "kit" or "paleta" with number, generate numbered swatches
  const kitMatch = name.match(/kit\s*(\d+)/);
  if (kitMatch && results.length === 0) {
    const count = Math.min(parseInt(kitMatch[1]), 12);
    for (let i = 1; i <= count; i++) {
      results.push({ name: `Tom ${i}`, color: "#c45a5a", stock: 0, available: true });
    }
  }
  
  return results;
}

const emptyForm = {
  name: "", slug: "", description: "", sensorial_description: "", how_to_use: "",
  price: "", compare_at_price: "", brand: "", ingredients: "",
  stock: "0", category_id: "", tags: "",
  is_featured: false, is_active: true,
};

const AdminProductsPanel = () => {
  const { data: products, isLoading, refetch } = useProducts({});
  const { data: categories } = useCategories();
  const queryClient = useQueryClient();

  const [view, setView] = useState<View>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [swatches, setSwatches] = useState<Swatch[]>([]);
  const [newSwatch, setNewSwatch] = useState<Swatch>({ name: "", color: "#c45a5a", barcode: "", ref_code: "", stock: 0, available: true });
  const [submitting, setSubmitting] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generatingReviewsId, setGeneratingReviewsId] = useState<string | null>(null);
  
  const [bulkGenerating, setBulkGenerating] = useState<string | null>(null); // "seo" | "complete" | null
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter products
  const filteredProducts = products?.filter(p => {
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || p.category_id === filterCategory;
    const matchesStatus = filterStatus === "all" || 
      (filterStatus === "active" && p.is_active) ||
      (filterStatus === "inactive" && !p.is_active) ||
      (filterStatus === "featured" && p.is_featured) ||
      (filterStatus === "low-stock" && p.stock <= 5) ||
      (filterStatus === "no-desc" && (!p.description || p.description.length < 30));
    return matchesSearch && matchesCategory && matchesStatus;
  }) || [];

  const resetForm = () => {
    setForm(emptyForm);
    setImages([]);
    setSwatches([]);
    setNewImageUrl("");
    setNewSwatch({ name: "", color: "#c45a5a", barcode: "", ref_code: "", stock: 0, available: true });
    setEditingId(null);
  };

  const openAdd = () => { resetForm(); setView("add"); };

  const openEdit = (product: any) => {
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      sensorial_description: product.sensorial_description || "",
      how_to_use: product.how_to_use || "",
      price: String(product.price),
      compare_at_price: product.compare_at_price ? String(product.compare_at_price) : "",
      brand: product.brand || "",
      ingredients: product.ingredients || "",
      stock: String(product.stock),
      category_id: product.category_id || "",
      tags: (product.tags || []).join(", "),
      is_featured: !!product.is_featured,
      is_active: product.is_active !== false,
    });
    setImages(product.images || []);
    const rawSwatches = typeof product.swatches === "string" ? JSON.parse(product.swatches) : (product.swatches || []);
    setSwatches(rawSwatches);
    setEditingId(product.id);
    setView("edit");
  };

  const handleAddImage = () => {
    if (newImageUrl.trim() && !images.includes(newImageUrl.trim())) {
      setImages([...images, newImageUrl.trim()]);
      setNewImageUrl("");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        
        const { error: upErr } = await supabase.storage
          .from("product-images")
          .upload(fileName, file, { contentType: file.type, upsert: true });
        
        if (upErr) {
          toast.error(`Erro ao enviar ${file.name}: ${upErr.message}`);
          continue;
        }
        
        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);
        
        if (urlData?.publicUrl) {
          newUrls.push(urlData.publicUrl);
        }
      }
      if (newUrls.length > 0) {
        setImages(prev => [...prev, ...newUrls]);
        toast.success(`${newUrls.length} imagem(ns) enviada(s)!`);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar imagens");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveImage = (idx: number) => setImages(images.filter((_, i) => i !== idx));
  const handleMoveImage = (idx: number, dir: -1 | 1) => {
    const newImages = [...images];
    const [moved] = newImages.splice(idx, 1);
    newImages.splice(idx + dir, 0, moved);
    setImages(newImages);
  };

  const handleAddSwatch = () => {
    if (newSwatch.name.trim()) {
      setSwatches([...swatches, { ...newSwatch, name: newSwatch.name.trim() }]);
      setNewSwatch({ name: "", color: "#c45a5a", barcode: "", ref_code: "", stock: 0, available: true });
    }
  };
  const handleRemoveSwatch = (idx: number) => setSwatches(swatches.filter((_, i) => i !== idx));
  const handleToggleSwatchAvailable = (idx: number) => {
    setSwatches(swatches.map((s, i) => i === idx ? { ...s, available: !s.available } : s));
  };
  const handleSwatchStockChange = (idx: number, stock: number) => {
    setSwatches(swatches.map((s, i) => i === idx ? { ...s, stock, available: stock > 0 ? s.available : false } : s));
  };
  const handleAutoGenerateSwatches = async () => {
    if (!form.name) { toast.error("Preencha o nome do produto primeiro"); return; }
    
    // First try local detection
    const generated = autoGenerateSwatches(form.name);
    if (generated.length > 0) {
      setSwatches(prev => [...prev, ...generated]);
      toast.success(`${generated.length} cor(es) adicionada(s) automaticamente!`);
      return;
    }
    
    // Fallback: use AI to detect colors
    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-content-generator", {
        body: {
          action: "generate-swatches",
          product_name: form.name,
          brand: form.brand,
          barcode: swatches.map(s => s.barcode).filter(Boolean).join(", "),
          ref_code: swatches.map(s => s.ref_code).filter(Boolean).join(", "),
        },
      });
      if (error) throw error;
      if (data?.swatches && data.swatches.length > 0) {
        setSwatches(prev => [...prev, ...data.swatches.map((s: any) => ({
          name: s.name,
          color: s.color,
          barcode: s.barcode || "",
          ref_code: s.ref_code || "",
          stock: 0,
          available: true,
        }))]);
        toast.success(`${data.swatches.length} cor(es) detectada(s) pela IA!`);
      } else {
        toast.info("IA não conseguiu detectar cores. Adicione manualmente.");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao detectar cores com IA");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.price) { toast.error("Nome e preço são obrigatórios"); return; }
    setSubmitting(true);
    try {
      const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const tags = form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
      const payload = {
        name: form.name, slug, description: form.description || null,
        sensorial_description: form.sensorial_description || null,
        how_to_use: form.how_to_use || null,
        price: parseFloat(form.price),
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
        brand: form.brand || null, ingredients: form.ingredients || null,
        stock: parseInt(form.stock) || 0, category_id: form.category_id || null,
        images, swatches: (swatches.length > 0 ? swatches : []) as any,
        tags, is_featured: form.is_featured, is_active: form.is_active,
      } as any;

      if (editingId) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Produto atualizado!");
      } else {
        const { data: inserted, error } = await supabase.from("products").insert(payload).select().single();
        if (error) throw error;
        // Auto-generate AI content if no description
        if (!form.description && inserted) {
          try {
            const { data: aiData } = await supabase.functions.invoke("ai-content-generator", {
              body: { action: "generate", product_id: inserted.id },
            });
            if (aiData?.content) {
              await supabase.from("products").update({
                description: aiData.content.description,
                sensorial_description: aiData.content.sensorial_description,
                how_to_use: aiData.content.how_to_use,
                tags: aiData.content.tags,
              }).eq("id", inserted.id);
              toast.success("Produto criado com conteúdo IA! 🎉");
            }
          } catch { /* IA indisponível */ }
        } else {
          toast.success("Produto criado!");
        }
      }
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-unified"] });
      setView("list");
      resetForm();
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Produto excluído"); refetch(); }
  };

  const handleToggle = async (id: string, field: "is_active" | "is_featured", current: boolean) => {
    const { error } = await supabase.from("products").update({ [field]: !current }).eq("id", id);
    if (error) toast.error("Erro ao atualizar");
    else { refetch(); toast.success("Atualizado!"); }
  };

  const handleAIFill = async () => {
    if (!form.name) { toast.error("Preencha o nome primeiro"); return; }
    setAiGenerating(true);
    try {
      if (editingId) {
        const { data: aiData } = await supabase.functions.invoke("ai-content-generator", {
          body: { action: "generate", product_id: editingId },
        });
        if (aiData?.content) {
          setForm(prev => ({
            ...prev,
            description: aiData.content.description || prev.description,
            sensorial_description: aiData.content.sensorial_description || prev.sensorial_description,
            how_to_use: aiData.content.how_to_use || prev.how_to_use,
            tags: aiData.content.tags?.join(", ") || prev.tags,
          }));
          toast.success("Conteúdo IA gerado!");
        }
      } else {
        // Create temp product for AI
        const slug = form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-temp-" + Date.now();
        const { data: temp, error } = await supabase.from("products").insert({
          name: form.name, slug, price: parseFloat(form.price) || 1, stock: 0,
          brand: form.brand || null, ingredients: form.ingredients || null, is_active: false,
        }).select().single();
        if (error) throw error;
        const { data: aiData } = await supabase.functions.invoke("ai-content-generator", {
          body: { action: "generate", product_id: temp.id },
        });
        await supabase.from("products").delete().eq("id", temp.id);
        if (aiData?.content) {
          setForm(prev => ({
            ...prev,
            description: aiData.content.description || prev.description,
            sensorial_description: aiData.content.sensorial_description || prev.sensorial_description,
            how_to_use: aiData.content.how_to_use || prev.how_to_use,
            tags: aiData.content.tags?.join(", ") || prev.tags,
          }));
          toast.success("Conteúdo IA gerado!");
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar IA");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleQuickAI = async (productId: string) => {
    setGeneratingId(productId);
    try {
      const { data, error } = await supabase.functions.invoke("ai-content-generator", {
        body: { action: "generate", product_id: productId },
      });
      if (error) throw new Error(data?.error || error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.content) {
        const updateData: any = {};
        if (data.content.description) updateData.description = data.content.description;
        if (data.content.sensorial_description) updateData.sensorial_description = data.content.sensorial_description;
        if (data.content.how_to_use) updateData.how_to_use = data.content.how_to_use;
        if (data.content.tags) updateData.tags = data.content.tags;
        if (Object.keys(updateData).length > 0) {
          await supabase.from("products").update(updateData).eq("id", productId);
        }
        toast.success("Conteúdo IA gerado e salvo!");
        refetch();
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar conteúdo IA");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleGenerateReviews = async (productId: string) => {
    setGeneratingReviewsId(productId);
    try {
      const { data, error } = await supabase.functions.invoke("ai-content-generator", {
        body: { action: "generate-reviews", product_id: productId },
      });
      if (error) throw new Error(data?.error || error.message);
      if (data?.error) throw new Error(data.error);
      toast.success(data?.message || "Reviews geradas!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar reviews");
    } finally {
      setGeneratingReviewsId(null);
    }
  };


  const handleBulkSEO = async (forceAll = false) => {
    setBulkGenerating("seo");
    const totalProducts = products?.filter(p => forceAll || !p.description)?.length || 0;
    setBulkProgress({ done: 0, total: totalProducts || 45 });
    let totalUpdated = 0;
    let currentOffset = 0;
    let hasMore = true;
    try {
      while (hasMore) {
        const { data, error } = await supabase.functions.invoke("ai-content-generator", {
          body: { action: "bulk-seo", force_all: forceAll, offset: currentOffset, chunk_size: 5 },
        });
        if (error) throw error;
        totalUpdated += (data?.updated || 0);
        hasMore = data?.has_more === true;
        currentOffset = data?.next_offset || currentOffset + 5;
        setBulkProgress({ done: currentOffset, total: Math.max(totalProducts, currentOffset + (hasMore ? 1 : 0)) });
        refetch();
      }
      setBulkProgress({ done: totalUpdated, total: totalUpdated });
      toast.success(`Concluído! ${totalUpdated} produtos atualizados.`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-unified"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar conteúdo em lote");
    } finally {
      setBulkGenerating(null);
      setTimeout(() => setBulkProgress(null), 3000);
    }
  };


  // ============ FORM VIEW ============
  if (view === "add" || view === "edit") {
    return (
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <button type="button" onClick={() => { setView("list"); resetForm(); }} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-bold">{view === "edit" ? "Editar Produto" : "Novo Produto"}</h2>
        </div>

        {/* Basic Info */}
        <fieldset className="bg-card rounded-xl p-4 border border-border space-y-3">
          <legend className="text-xs font-bold text-foreground px-2">Informações Básicas</legend>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editingId ? form.slug : e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })} className="bg-muted border-none min-h-[40px] text-sm" required />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Slug (URL)</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="bg-muted border-none min-h-[40px] text-xs text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Marca</Label>
              <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="bg-muted border-none min-h-[40px] text-sm" placeholder="Ex: Ruby Rose" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? "" : v })}>
                <SelectTrigger className="bg-muted border-none min-h-[40px] text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </fieldset>

        {/* Pricing & Stock */}
        <fieldset className="bg-card rounded-xl p-4 border border-border space-y-3">
          <legend className="text-xs font-bold text-foreground px-2">Preço & Estoque</legend>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Preço (R$) *</Label>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="bg-muted border-none min-h-[40px] text-sm" required />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Preço anterior</Label>
              <Input type="number" step="0.01" value={form.compare_at_price} onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })} className="bg-muted border-none min-h-[40px] text-sm" placeholder="Riscado" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Estoque</Label>
              <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="bg-muted border-none min-h-[40px] text-sm" />
            </div>
          </div>
          {form.price && (
            <p className="text-[10px] text-muted-foreground">
              Pix: R$ {(parseFloat(form.price) * 0.95).toFixed(2).replace(".", ",")} •
              3x R$ {(parseFloat(form.price) / 3).toFixed(2).replace(".", ",")}
              {form.compare_at_price && ` • Desconto: ${Math.round(((parseFloat(form.compare_at_price) - parseFloat(form.price)) / parseFloat(form.compare_at_price)) * 100)}%`}
            </p>
          )}
        </fieldset>

        {/* Images */}
        <fieldset className="bg-card rounded-xl p-4 border border-border space-y-3">
          <legend className="text-xs font-bold text-foreground px-2">Imagens ({images.length})</legend>
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden bg-muted border border-border">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  {i === 0 && <Badge className="absolute top-1 left-1 text-[7px] px-1 py-0 bg-primary text-primary-foreground">Principal</Badge>}
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    {i > 0 && <button type="button" onClick={() => handleMoveImage(i, -1)} className="w-6 h-6 rounded bg-card flex items-center justify-center"><ChevronUp className="w-3 h-3" /></button>}
                    {i < images.length - 1 && <button type="button" onClick={() => handleMoveImage(i, 1)} className="w-6 h-6 rounded bg-card flex items-center justify-center"><ChevronDown className="w-3 h-3" /></button>}
                    <button type="button" onClick={() => handleRemoveImage(i)} className="w-6 h-6 rounded bg-destructive/90 text-destructive-foreground flex items-center justify-center"><X className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <label className={cn(
              "flex items-center justify-center gap-1.5 px-3 h-9 rounded-md border border-dashed border-primary/40 bg-primary/5 text-primary text-xs font-medium cursor-pointer hover:bg-primary/10 transition-colors",
              uploading && "opacity-60 pointer-events-none"
            )}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
              {uploading ? "Enviando..." : "📷 Upload"}
              <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
            </label>
            <Input value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} placeholder="ou cole a URL da imagem..." className="bg-muted border-none min-h-[36px] text-xs flex-1" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddImage())} />
            <Button type="button" onClick={handleAddImage} size="sm" variant="outline" className="text-xs gap-1 h-9"><Plus className="w-3 h-3" />URL</Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Arraste e solte ou clique em Upload para enviar fotos do seu dispositivo. Aceita JPG, PNG e WebP.</p>
        </fieldset>

        {/* Swatches / Variações */}
        <fieldset className="bg-card rounded-xl p-4 border border-border space-y-3">
          <div className="flex items-center justify-between">
            <legend className="text-xs font-bold text-foreground px-2">Variações / Cores ({swatches.length})</legend>
            <Button type="button" onClick={handleAutoGenerateSwatches} disabled={aiGenerating} size="sm" variant="ghost" className="text-xs gap-1 text-primary h-7">
              {aiGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              {aiGenerating ? "Detectando cores..." : "Auto-gerar cores (IA)"}
            </Button>
          </div>
          {swatches.length > 0 && (
            <div className="space-y-2">
              {swatches.map((s, i) => (
                <div key={i} className={cn("flex items-center gap-2 bg-muted rounded-lg px-3 py-2", !s.available && "opacity-60")}>
                  <div className="w-6 h-6 rounded-full border border-border flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate">{s.name}</p>
                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                      {s.barcode && <span>EAN: {s.barcode}</span>}
                      {s.ref_code && <span>Ref: {s.ref_code}</span>}
                      <span>Est: {s.stock ?? 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!s.available && <Badge variant="secondary" className="text-[7px] px-1 py-0 bg-destructive/10 text-destructive">Indisponível</Badge>}
                    <Button type="button" size="sm" variant="ghost" onClick={() => handleToggleSwatchAvailable(i)} className="h-6 w-6 p-0" title={s.available ? "Marcar indisponível" : "Marcar disponível"}>
                      {s.available ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-destructive" />}
                    </Button>
                    <button type="button" onClick={() => handleRemoveSwatch(i)} className="w-5 h-5 flex items-center justify-center"><X className="w-3 h-3 text-muted-foreground" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-[10px] font-semibold text-muted-foreground">Adicionar nova cor</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Nome do tom *</Label>
                <Input value={newSwatch.name} onChange={(e) => setNewSwatch({ ...newSwatch, name: e.target.value })} placeholder="Ex: Bege Claro" className="bg-background border-border min-h-[36px] text-xs" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSwatch())} />
              </div>
              <div className="flex gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-[10px]">Cor</Label>
                  <input type="color" value={newSwatch.color} onChange={(e) => setNewSwatch({ ...newSwatch, color: e.target.value })} className="w-9 h-9 rounded border border-border cursor-pointer" />
                </div>
                <div className="space-y-1 flex-1">
                  <Label className="text-[10px]">Estoque</Label>
                  <Input type="number" value={newSwatch.stock ?? 0} onChange={(e) => setNewSwatch({ ...newSwatch, stock: parseInt(e.target.value) || 0 })} className="bg-background border-border min-h-[36px] text-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Cód. Barras (EAN)</Label>
                <Input value={newSwatch.barcode || ""} onChange={(e) => setNewSwatch({ ...newSwatch, barcode: e.target.value })} placeholder="7891234567890" className="bg-background border-border min-h-[36px] text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Cód. Referência</Label>
                <Input value={newSwatch.ref_code || ""} onChange={(e) => setNewSwatch({ ...newSwatch, ref_code: e.target.value })} placeholder="REF-001" className="bg-background border-border min-h-[36px] text-xs" />
              </div>
            </div>
            <Button type="button" onClick={handleAddSwatch} size="sm" variant="outline" className="text-xs h-8 gap-1 w-full"><Plus className="w-3 h-3" />Adicionar Cor</Button>
          </div>
        </fieldset>

        {/* Content */}
        <fieldset className="bg-card rounded-xl p-4 border border-border space-y-3">
          <div className="flex items-center justify-between">
            <legend className="text-xs font-bold text-foreground px-2">Conteúdo & SEO</legend>
            <Button type="button" onClick={handleAIFill} disabled={aiGenerating || !form.name} size="sm" variant="ghost" className="text-xs gap-1 text-primary h-7">
              {aiGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
              Gerar com IA
            </Button>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Descrição</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-muted border-none min-h-[80px] text-sm" placeholder="Descrição detalhada do produto..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Descrição Sensorial</Label>
            <Textarea value={form.sensorial_description} onChange={(e) => setForm({ ...form, sensorial_description: e.target.value })} className="bg-muted border-none min-h-[60px] text-sm" placeholder="Textura, aroma, sensação..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Como Usar</Label>
            <Textarea value={form.how_to_use} onChange={(e) => setForm({ ...form, how_to_use: e.target.value })} className="bg-muted border-none min-h-[60px] text-sm" placeholder="Passo a passo de aplicação..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ingredientes-chave</Label>
            <Input value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} className="bg-muted border-none min-h-[40px] text-sm" placeholder="Ácido hialurônico, vitamina E..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tags (separadas por vírgula)</Label>
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="bg-muted border-none min-h-[40px] text-sm" placeholder="maquiagem, pele oleosa, matte" />
          </div>
        </fieldset>

        {/* Toggles */}
        <fieldset className="bg-card rounded-xl p-4 border border-border space-y-3">
          <legend className="text-xs font-bold text-foreground px-2">Visibilidade</legend>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">Ativo na loja</p>
              <p className="text-[10px] text-muted-foreground">Produto visível para clientes</p>
            </div>
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">Destaque</p>
              <p className="text-[10px] text-muted-foreground">Aparece na seção de novidades</p>
            </div>
            <Switch checked={form.is_featured} onCheckedChange={(v) => setForm({ ...form, is_featured: v })} />
          </div>
        </fieldset>

        {/* Submit */}
        <div className="flex gap-2">
          <Button type="submit" disabled={submitting} className="flex-1 bg-primary text-primary-foreground min-h-[44px] gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editingId ? "Salvar Alterações" : "Criar Produto"}
          </Button>
          <Button type="button" variant="outline" onClick={() => { setView("list"); resetForm(); }} className="min-h-[44px]">Cancelar</Button>
        </div>
      </form>
    );
  }

  // ============ LIST VIEW ============
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={openAdd} size="sm" className="bg-primary text-primary-foreground text-xs gap-1.5">
          <Plus className="w-3.5 h-3.5" />Novo Produto
        </Button>
        <Button onClick={() => handleBulkSEO(true)} size="sm" variant="outline" disabled={!!bulkGenerating} className="text-xs gap-1.5">
          {bulkGenerating === "seo" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          Gerar Títulos & Descrições
        </Button>
        <div className="flex-1" />
        <Badge variant="secondary" className="text-[10px]">{filteredProducts.length} produtos</Badge>
      </div>

      {/* Progress Bar */}
      {bulkProgress && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-card border border-border rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground flex items-center gap-1.5">
              <Loader2 className={cn("w-3.5 h-3.5", bulkGenerating ? "animate-spin" : "")} />
              {bulkGenerating === "seo" ? "Gerando textos SEO..." : bulkGenerating === "complete" ? "Gerando textos + imagens..." : "Concluído!"}
            </span>
            <span className="text-muted-foreground font-mono">{Math.min(bulkProgress.done, bulkProgress.total)} / {bulkProgress.total}</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (bulkProgress.done / Math.max(bulkProgress.total, 1)) * 100)}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {bulkGenerating ? "Processando em lotes — não feche esta página." : `✅ ${bulkProgress.done} produtos atualizados com sucesso!`}
          </p>
        </motion.div>
      )}

      {/* Search & Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar por nome ou marca..." className="pl-9 bg-muted border-none min-h-[36px] text-xs rounded-full" />
        </div>
        <div className="flex gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="bg-muted border-none min-h-[32px] text-[10px] flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="bg-muted border-none min-h-[32px] text-[10px] flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
              <SelectItem value="featured">Destaques</SelectItem>
              <SelectItem value="low-stock">Estoque baixo</SelectItem>
              <SelectItem value="no-desc">Sem descrição</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Product List */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-xs">Nenhum produto encontrado</div>
      ) : (
        <div className="space-y-2">
          {filteredProducts.map(product => {
            const isExpanded = expandedId === product.id;
            const needsContent = !product.description || product.description.length < 30;
            const lowStock = product.stock > 0 && product.stock <= 5;
            const swatchCount = (typeof product.swatches === "string" ? JSON.parse(product.swatches) : (product.swatches || [])).length;

            return (
              <motion.div key={product.id} layout className="bg-card rounded-xl border border-border overflow-hidden">
                {/* Compact row */}
                <div className="flex items-center gap-2.5 p-3 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : product.id)}>
                  <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                    {product.images?.[0] ? <img src={product.images[0]} alt="" className="w-full h-full object-cover" /> :
                      <div className="w-full h-full flex items-center justify-center"><Box className="w-4 h-4 text-muted-foreground" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold line-clamp-1">{product.name}</p>
                      {product.is_featured && <Star className="w-3 h-3 text-primary fill-primary flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-primary">R$ {Number(product.price).toFixed(2).replace(".", ",")}</span>
                      <span className="text-[10px] text-muted-foreground">Est: {product.stock}</span>
                      {product.brand && <span className="text-[10px] text-muted-foreground">{product.brand}</span>}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {!product.is_active && <Badge variant="secondary" className="text-[7px] px-1 py-0">Inativo</Badge>}
                      {needsContent && <Badge variant="secondary" className="text-[7px] px-1 py-0 bg-destructive/10 text-destructive">Sem desc</Badge>}
                      {lowStock && <Badge variant="secondary" className="text-[7px] px-1 py-0 bg-primary/10 text-primary">Estoque baixo</Badge>}
                      {swatchCount > 0 && <Badge variant="secondary" className="text-[7px] px-1 py-0">{swatchCount} cores</Badge>}
                      {(product.images?.length || 0) > 1 && <Badge variant="secondary" className="text-[7px] px-1 py-0">{product.images?.length} imgs</Badge>}
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>

                {/* Expanded actions */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-3 pb-3 pt-1 border-t border-border space-y-2">
                        {product.description && <p className="text-[10px] text-muted-foreground line-clamp-2">{product.description}</p>}
                        <div className="flex flex-wrap gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => openEdit(product)} className="text-xs h-7 gap-1"><Pencil className="w-3 h-3" />Editar</Button>
                          <Button size="sm" variant="outline" onClick={() => handleToggle(product.id, "is_active", !!product.is_active)} className="text-xs h-7 gap-1">
                            {product.is_active ? <><EyeOff className="w-3 h-3" />Desativar</> : <><Eye className="w-3 h-3" />Ativar</>}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleToggle(product.id, "is_featured", !!product.is_featured)} className="text-xs h-7 gap-1">
                            <Star className={`w-3 h-3 ${product.is_featured ? "fill-primary text-primary" : ""}`} />{product.is_featured ? "Remover destaque" : "Destacar"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleQuickAI(product.id)} disabled={generatingId === product.id} className="text-xs h-7 gap-1">
                            {generatingId === product.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}IA
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleGenerateReviews(product.id)} disabled={generatingReviewsId === product.id} className="text-xs h-7 gap-1">
                            {generatingReviewsId === product.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}Reviews IA
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(product.id, product.name)} className="text-xs h-7 gap-1 text-destructive hover:text-destructive">
                            <Trash2 className="w-3 h-3" />Excluir
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminProductsPanel;
