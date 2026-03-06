import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, X, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SECTIONS = [
  { key: "novidades", label: "✨ Novidades", description: "Produtos em destaque no topo da página" },
  { key: "super_ofertas", label: "🔥 Super Ofertas", description: "Produtos com desconto especial" },
  { key: "mais_produtos", label: "🛍️ Mais Produtos", description: "Produtos adicionais exibidos abaixo" },
];

const HomepageSectionsTab = () => {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("super_ofertas");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Record<string, string[]>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Load existing section configs from promotions
  const { data: sectionConfigs, isLoading: loadingConfigs } = useQuery({
    queryKey: ["homepage-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .eq("type", "homepage_section");
      if (error) throw error;
      return data || [];
    },
  });

  // Load all active products
  const { data: allProducts } = useQuery({
    queryKey: ["admin-all-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, price, compare_at_price, images, brand, is_featured, is_active, stock")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // Initialize selectedIds from DB when data loads
  useEffect(() => {
    if (!sectionConfigs || isDirty) return;
    const map: Record<string, string[]> = {};
    for (const sec of SECTIONS) {
      const config = sectionConfigs.find((c) => c.position === sec.key);
      map[sec.key] = config?.product_ids || [];
    }
    setSelectedIds(map);
  }, [sectionConfigs]);

  const currentIds = selectedIds[activeSection] || [];
  const currentProducts = allProducts?.filter((p) => currentIds.includes(p.id)) || [];
  const sortedProducts = currentIds
    .map((id) => currentProducts.find((p) => p.id === id))
    .filter(Boolean) as typeof currentProducts;

  const availableProducts = allProducts?.filter(
    (p) => !currentIds.includes(p.id) && (
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.brand || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
  ) || [];

  const addProduct = (productId: string) => {
    setIsDirty(true);
    setSelectedIds((prev) => ({
      ...prev,
      [activeSection]: [...(prev[activeSection] || []), productId],
    }));
  };

  const removeProduct = (productId: string) => {
    setIsDirty(true);
    setSelectedIds((prev) => ({
      ...prev,
      [activeSection]: (prev[activeSection] || []).filter((id) => id !== productId),
    }));
  };

  const moveProduct = (index: number, direction: -1 | 1) => {
    const ids = [...(selectedIds[activeSection] || [])];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= ids.length) return;
    [ids[index], ids[newIndex]] = [ids[newIndex], ids[index]];
    setIsDirty(true);
    setSelectedIds((prev) => ({ ...prev, [activeSection]: ids }));
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (sectionsToSave: string[]) => {
      for (const sectionKey of sectionsToSave) {
        const ids = selectedIds[sectionKey] || [];
        const existing = sectionConfigs?.find((c) => c.position === sectionKey);

        if (existing) {
          const { error } = await supabase
            .from("promotions")
            .update({ product_ids: ids, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("promotions").insert({
            title: SECTIONS.find((s) => s.key === sectionKey)?.label || sectionKey,
            type: "homepage_section",
            position: sectionKey,
            product_ids: ids,
            is_active: true,
          });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["homepage-sections"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-section-products"] });
      toast.success("Seção salva com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar: " + err.message);
    },
  });

  const saveSection = () => saveMutation.mutate([activeSection]);
  const saveAll = () => saveMutation.mutate(SECTIONS.map((s) => s.key));

  if (loadingConfigs) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Seções da Página Inicial</h2>
          <p className="text-xs text-muted-foreground">Escolha quais produtos aparecem em cada seção</p>
        </div>
        <Button onClick={saveAll} disabled={saveMutation.isPending} className="gap-2">
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Tudo
        </Button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SECTIONS.map((sec) => (
          <button
            key={sec.key}
            onClick={() => { setActiveSection(sec.key); setSearchQuery(""); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${
              activeSection === sec.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {sec.label}
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {(selectedIds[sec.key] || []).length}
            </Badge>
          </button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {SECTIONS.find((s) => s.key === activeSection)?.description}
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Selected products */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center justify-between">
            Produtos selecionados ({sortedProducts.length})
            <Button
              size="sm"
              variant="outline"
              onClick={saveSection}
              disabled={saveMutation.isPending}
              className="h-7 text-xs gap-1"
            >
              {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Salvar seção
            </Button>
          </h3>

          {sortedProducts.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground">Nenhum produto selecionado</p>
              <p className="text-xs text-muted-foreground mt-1">Adicione produtos da lista ao lado</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {sortedProducts.map((product, idx) => (
                <div
                  key={product.id}
                  className="flex items-center gap-2 bg-card border border-border rounded-lg p-2"
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveProduct(idx, -1)}
                      disabled={idx === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
                    >▲</button>
                    <button
                      onClick={() => moveProduct(idx, 1)}
                      disabled={idx === sortedProducts.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-xs"
                    >▼</button>
                  </div>
                  <img
                    src={product.images?.[0] || "/placeholder.svg"}
                    alt={product.name}
                    className="w-10 h-10 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{product.name}</p>
                    <p className="text-[10px] text-muted-foreground">{product.brand} · R$ {Number(product.price).toFixed(2)}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">#{idx + 1}</span>
                  <button
                    onClick={() => removeProduct(product.id)}
                    className="w-7 h-7 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available products */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Adicionar produtos</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto por nome ou marca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-1 max-h-[450px] overflow-y-auto">
            {availableProducts.slice(0, 30).map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-2 bg-card border border-border rounded-lg p-2 hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => addProduct(product.id)}
              >
                <img
                  src={product.images?.[0] || "/placeholder.svg"}
                  alt={product.name}
                  className="w-10 h-10 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{product.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{product.brand}</span>
                    <span className="text-[10px] font-semibold text-primary">R$ {Number(product.price).toFixed(2)}</span>
                    {product.compare_at_price && product.compare_at_price > product.price && (
                      <span className="text-[10px] line-through text-muted-foreground">R$ {Number(product.compare_at_price).toFixed(2)}</span>
                    )}
                    {product.stock <= 0 && <Badge variant="destructive" className="text-[9px] px-1 py-0">Sem estoque</Badge>}
                  </div>
                </div>
                <Plus className="w-4 h-4 text-primary flex-shrink-0" />
              </div>
            ))}
            {availableProducts.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum produto encontrado</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomepageSectionsTab;