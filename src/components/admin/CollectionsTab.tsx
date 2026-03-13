import { useState, useMemo } from "react";
import { useProducts } from "@/hooks/useProducts";
import {
  useAllCollections,
  useAddToCollection,
  useRemoveFromCollection,
  COLLECTION_LABELS,
  type CollectionSlug,
} from "@/hooks/useCollections";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Search, Sparkles, TrendingUp, Flame, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const SLUGS: CollectionSlug[] = ["lancamentos", "mais-vendidos", "tendencias", "ofertas"];
const SLUG_ICONS: Record<CollectionSlug, any> = {
  lancamentos: Sparkles,
  "mais-vendidos": TrendingUp,
  tendencias: Flame,
  ofertas: Flame,
};

const CollectionsTab = () => {
  const { data: allProducts } = useProducts({});
  const { data: allCollections, isLoading } = useAllCollections();
  const addMutation = useAddToCollection();
  const removeMutation = useRemoveFromCollection();
  const qc = useQueryClient();

  const [activeSlug, setActiveSlug] = useState<CollectionSlug>("lancamentos");
  const [searchQuery, setSearchQuery] = useState("");
  const [addingProductId, setAddingProductId] = useState("");

  const collectionItems = useMemo(() => {
    if (!allCollections) return [];
    return allCollections
      .filter((c) => c.collection_slug === activeSlug)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [allCollections, activeSlug]);

  const collectionProductIds = useMemo(() => {
    return new Set(collectionItems.map((c) => c.product_id));
  }, [collectionItems]);

  const availableProducts = useMemo(() => {
    if (!allProducts) return [];
    let filtered = allProducts.filter((p) => !collectionProductIds.has(p.id));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q)
      );
    }
    return filtered.slice(0, 20);
  }, [allProducts, collectionProductIds, searchQuery]);

  const handleAdd = async (productId: string) => {
    const nextOrder = collectionItems.length;
    try {
      await addMutation.mutateAsync({
        collectionSlug: activeSlug,
        productId,
        sortOrder: nextOrder,
      });
      toast.success("Produto adicionado à coleção!");
    } catch {
      toast.error("Erro ao adicionar produto");
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeMutation.mutateAsync(id);
      toast.success("Produto removido da coleção");
    } catch {
      toast.error("Erro ao remover");
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    const items = [...collectionItems];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return;

    const [a, b] = [items[index], items[swapIndex]];
    await Promise.all([
      supabase.from("product_collections").update({ sort_order: swapIndex }).eq("id", a.id),
      supabase.from("product_collections").update({ sort_order: index }).eq("id", b.id),
    ]);
    qc.invalidateQueries({ queryKey: ["all-collections"] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold">Coleções de Produtos</h2>
        <p className="text-sm text-muted-foreground">
          Gerencie os produtos das páginas Lançamentos, Mais Vendidos e Tendências
        </p>
      </div>

      {/* Collection tabs */}
      <div className="flex gap-2 flex-wrap">
        {SLUGS.map((slug) => {
          const Icon = SLUG_ICONS[slug];
          const count = allCollections?.filter((c) => c.collection_slug === slug).length || 0;
          return (
            <Button
              key={slug}
              variant={activeSlug === slug ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveSlug(slug)}
              className="gap-1.5"
            >
              <Icon className="w-4 h-4" />
              {COLLECTION_LABELS[slug]}
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">
                {count}
              </Badge>
            </Button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current collection items */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold">
            Produtos em "{COLLECTION_LABELS[activeSlug]}" ({collectionItems.length})
          </h3>

          {collectionItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              Nenhum produto nesta coleção. Adicione pela lista ao lado.
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {collectionItems.map((item, index) => {
                const product = item.products as any;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl"
                  >
                    <span className="text-xs font-bold text-muted-foreground w-6 text-center">
                      {index + 1}
                    </span>
                    <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      {product?.images?.[0] && (
                        <img src={product.images[0]} alt="" className="w-full h-full object-contain" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-1">{product?.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        R$ {Number(product?.price || 0).toFixed(2).replace(".", ",")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={index === 0}
                        onClick={() => handleMove(index, "up")}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={index === collectionItems.length - 1}
                        onClick={() => handleMove(index, "down")}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleRemove(item.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add products */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold">Adicionar Produtos</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto por nome ou marca..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
            {availableProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 p-3 bg-muted/50 border border-border rounded-xl hover:bg-muted transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-card overflow-hidden flex-shrink-0">
                  {product.images?.[0] && (
                    <img src={product.images[0]} alt="" className="w-full h-full object-contain" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium line-clamp-1">{product.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {product.brand} · R$ {Number(product.price).toFixed(2).replace(".", ",")}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleAdd(product.id)}
                  disabled={addMutation.isPending}
                >
                  <Plus className="w-3 h-3" /> Adicionar
                </Button>
              </div>
            ))}
            {availableProducts.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                {searchQuery ? "Nenhum produto encontrado" : "Todos os produtos já estão na coleção"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionsTab;
