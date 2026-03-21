import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, EyeOff, Pencil, Trash2, RefreshCw, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";

const CouponsTab = () => {
  const queryClient = useQueryClient();
  const { data: coupons, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const emptyForm = { code: "", description: "", discount_type: "percentage", discount_value: "", min_order_value: "0", max_uses: "", expires_at: "" };
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filtered = coupons?.filter(c =>
    !searchQuery || c.code.toLowerCase().includes(searchQuery.toLowerCase()) || c.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const resetForm = () => { setForm(emptyForm); setEditingId(null); setShowForm(false); };

  const openEdit = (c: any) => {
    setForm({
      code: c.code, description: c.description || "", discount_type: c.discount_type,
      discount_value: String(c.discount_value), min_order_value: String(c.min_order_value || 0),
      max_uses: c.max_uses ? String(c.max_uses) : "", expires_at: c.expires_at ? c.expires_at.slice(0, 16) : "",
    });
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.code || !form.discount_value) { toast.error("Código e valor são obrigatórios"); return; }
    setSubmitting(true);
    try {
      const payload = {
        code: form.code.toUpperCase(), description: form.description || null,
        discount_type: form.discount_type, discount_value: parseFloat(form.discount_value),
        min_order_value: parseFloat(form.min_order_value || "0"),
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      };
      if (editingId) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("Cupom atualizado!");
      } else {
        const { error } = await supabase.from("coupons").insert(payload);
        if (error) throw error;
        toast.success("Cupom criado!");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar cupom");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("coupons").update({ is_active: !active }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    toast.success(active ? "Cupom desativado" : "Cupom ativado");
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`Excluir cupom "${code}"?`)) return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Cupom excluído"); queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }); }
  };

  const handleResetUses = async (id: string) => {
    await supabase.from("coupons").update({ current_uses: 0 }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    toast.success("Contador zerado!");
  };

  const isExpired = (expiresAt: string | null) => expiresAt && new Date(expiresAt) < new Date();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }} size="sm" className="bg-primary text-primary-foreground text-xs gap-1"><Plus className="w-3 h-3" />{showForm && !editingId ? "Fechar" : "Novo Cupom"}</Button>
        <Badge variant="secondary" className="text-[10px]">{filtered.length} cupons</Badge>
      </div>

      {!showForm && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar cupom..." className="pl-9 bg-muted border-none min-h-[36px] text-xs rounded-full" />
        </div>
      )}

      {showForm && (
        <div className="bg-card rounded-xl p-4 border border-border space-y-3">
          <p className="text-xs font-bold">{editingId ? "Editar Cupom" : "Novo Cupom"}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-xs">Código *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="bg-muted border-none min-h-[36px] text-xs uppercase" placeholder="EX: ELLE10" /></div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                <SelectTrigger className="bg-muted border-none min-h-[36px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="percentage">Percentual (%)</SelectItem><SelectItem value="fixed">Fixo (R$)</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Valor *</Label><Input type="number" step="0.01" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" placeholder={form.discount_type === "percentage" ? "Ex: 10" : "Ex: 15.00"} /></div>
            <div className="space-y-1"><Label className="text-xs">Pedido mínimo (R$)</Label><Input type="number" step="0.01" value={form.min_order_value} onChange={(e) => setForm({ ...form, min_order_value: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" /></div>
            <div className="space-y-1"><Label className="text-xs">Máx. usos</Label><Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="Ilimitado" className="bg-muted border-none min-h-[36px] text-xs" /></div>
            <div className="space-y-1"><Label className="text-xs">Expira em</Label><Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" placeholder="Descrição interna do cupom" /></div>
          {form.discount_value && (
            <p className="text-[10px] text-muted-foreground">
              Prévia: {form.discount_type === "percentage" ? `${form.discount_value}% de desconto` : `R$ ${parseFloat(form.discount_value).toFixed(2).replace(".", ",")} de desconto`}
              {form.min_order_value && parseFloat(form.min_order_value) > 0 ? ` • Mínimo R$ ${parseFloat(form.min_order_value).toFixed(2).replace(".", ",")}` : ""}
              {form.max_uses ? ` • Até ${form.max_uses} usos` : " • Usos ilimitados"}
              {form.expires_at ? ` • Expira ${new Date(form.expires_at).toLocaleDateString("pt-BR")}` : ""}
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={submitting} size="sm" className="text-xs bg-primary text-primary-foreground gap-1">
              {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              {editingId ? "Salvar" : "Criar Cupom"}
            </Button>
            {editingId && <Button onClick={resetForm} variant="outline" size="sm" className="text-xs">Cancelar</Button>}
          </div>
        </div>
      )}

      {isLoading ? <div className="text-center py-4 text-xs text-muted-foreground">Carregando...</div> : filtered.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-4">Nenhum cupom encontrado</p>
      ) : filtered.map((c) => {
        const expired = isExpired(c.expires_at);
        const exhausted = c.max_uses && (c.current_uses || 0) >= c.max_uses;
        return (
          <div key={c.id} className="bg-card rounded-xl p-4 border border-border space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold flex-1">{c.code}</p>
              <Badge variant={c.is_active && !expired && !exhausted ? "default" : "secondary"} className="text-[10px]">
                {!c.is_active ? "Inativo" : expired ? "Expirado" : exhausted ? "Esgotado" : "Ativo"}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>{c.discount_type === "percentage" ? `${c.discount_value}% off` : `R$ ${Number(c.discount_value).toFixed(2).replace(".", ",")} off`}
                {Number(c.min_order_value) > 0 ? ` • Mín: R$ ${Number(c.min_order_value).toFixed(2).replace(".", ",")}` : ""}</p>
              <p>Usos: {c.current_uses || 0}/{c.max_uses || "∞"}
                {c.expires_at ? ` • ${expired ? "Expirou" : "Expira"}: ${new Date(c.expires_at).toLocaleDateString("pt-BR")}` : ""}</p>
              {c.description && <p className="italic">{c.description}</p>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button variant="outline" size="sm" onClick={() => openEdit(c)} className="text-xs h-7 gap-1"><Pencil className="w-3 h-3" />Editar</Button>
              <Button variant="outline" size="sm" onClick={() => handleToggle(c.id, !!c.is_active)} className="text-xs h-7 gap-1">
                {c.is_active ? <><EyeOff className="w-3 h-3" />Desativar</> : <><Eye className="w-3 h-3" />Ativar</>}
              </Button>
              {(c.current_uses || 0) > 0 && (
                <Button variant="outline" size="sm" onClick={() => handleResetUses(c.id)} className="text-xs h-7 gap-1"><RefreshCw className="w-3 h-3" />Zerar usos</Button>
              )}
              <Button variant="outline" size="sm" onClick={() => handleDelete(c.id, c.code)} className="text-xs h-7 gap-1 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" />Excluir</Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CouponsTab;
