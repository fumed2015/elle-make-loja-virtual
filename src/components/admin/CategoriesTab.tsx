import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FolderOpen, Pencil, Trash2 } from "lucide-react";
import { useCategories } from "@/hooks/useProducts";
import { toast } from "sonner";
import { motion } from "framer-motion";

const CategoriesTab = () => {
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useCategories();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", image_url: "", sort_order: "0", parent_id: "" });

  const resetForm = () => {
    setForm({ name: "", slug: "", description: "", image_url: "", sort_order: "0", parent_id: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (cat: any) => {
    setForm({
      name: cat.name, slug: cat.slug, description: cat.description || "",
      image_url: cat.image_url || "", sort_order: String(cat.sort_order || 0),
      parent_id: cat.parent_id || "",
    });
    setEditingId(cat.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast.error("Nome e slug são obrigatórios"); return; }
    const payload = {
      name: form.name,
      slug: form.slug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      description: form.description || null,
      image_url: form.image_url || null,
      sort_order: parseInt(form.sort_order) || 0,
      parent_id: form.parent_id || null,
    };

    const { error } = editingId
      ? await supabase.from("categories").update(payload).eq("id", editingId)
      : await supabase.from("categories").insert(payload);

    if (error) toast.error(error.message);
    else {
      toast.success(editingId ? "Categoria atualizada!" : "Categoria criada!");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      resetForm();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir a categoria "${name}"?`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Categoria excluída!");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    }
  };

  const generateSlug = (name: string) => name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  return (
    <div className="space-y-3">
      <Button onClick={() => { resetForm(); setShowForm(!showForm); }} size="sm" className="bg-primary text-primary-foreground text-xs gap-1">
        <Plus className="w-3 h-3" />{showForm ? "Cancelar" : "Nova Categoria"}
      </Button>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-4 border border-border space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Nome *</Label>
              <Input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value, slug: editingId ? form.slug : generateSlug(e.target.value) }); }} className="bg-muted border-none min-h-[36px] text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Slug *</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ordem</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria pai</Label>
              <Select value={form.parent_id} onValueChange={(v) => setForm({ ...form, parent_id: v === "none" ? "" : v })}>
                <SelectTrigger className="bg-muted border-none min-h-[36px] text-xs"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {categories?.filter((c) => c.id !== editingId).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">URL da Imagem</Label>
              <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="bg-muted border-none min-h-[36px] text-xs" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" />
            </div>
          </div>
          <Button onClick={handleSave} size="sm" className="text-xs bg-primary text-primary-foreground">
            {editingId ? "Atualizar" : "Criar"} Categoria
          </Button>
        </motion.div>
      )}

      {isLoading ? (
        <div className="text-center py-4 text-xs text-muted-foreground">Carregando...</div>
      ) : !categories?.length ? (
        <p className="text-center text-xs text-muted-foreground py-4">Nenhuma categoria</p>
      ) : (
        categories.map((cat) => (
          <motion.div key={cat.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
            {cat.image_url ? (
              <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{cat.name}</p>
              <p className="text-[10px] text-muted-foreground">/{cat.slug} • Ordem: {cat.sort_order}</p>
              {cat.description && <p className="text-[10px] text-muted-foreground truncate">{cat.description}</p>}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => handleEdit(cat)} className="h-8 w-8 p-0">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(cat.id, cat.name)} className="h-8 w-8 p-0 text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
};

export default CategoriesTab;
