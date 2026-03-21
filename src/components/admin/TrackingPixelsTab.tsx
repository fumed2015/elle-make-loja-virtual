import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { Code, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const PLATFORMS = [
  { value: "meta", label: "Meta Ads (Facebook Pixel)" },
  { value: "google_ads", label: "Google Ads" },
  { value: "google_analytics", label: "Google Analytics (GA4)" },
  { value: "tiktok", label: "TikTok Pixel" },
  { value: "other", label: "Outro" },
];

const TrackingPixelsTab = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", platform: "meta", pixel_code: "" });

  const { data: pixels, isLoading } = useQuery({
    queryKey: ["admin-tracking-pixels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracking_pixels")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleSave = async () => {
    if (!form.name || !form.pixel_code) {
      toast.error("Preencha nome e código do pixel");
      return;
    }
    const { error } = await supabase.from("tracking_pixels").insert({
      name: form.name,
      platform: form.platform,
      pixel_code: form.pixel_code,
    });
    if (error) {
      toast.error("Erro ao salvar pixel");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["admin-tracking-pixels"] });
    setForm({ name: "", platform: "meta", pixel_code: "" });
    setShowForm(false);
    toast.success("Pixel salvo! Já está ativo no site.");
  };

  const handleToggle = async (id: string, current: boolean) => {
    await supabase.from("tracking_pixels").update({ is_active: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-tracking-pixels"] });
    toast.success(!current ? "Pixel ativado" : "Pixel desativado");
  };

  const handleDelete = async (id: string) => {
    await supabase.from("tracking_pixels").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-tracking-pixels"] });
    toast.success("Pixel removido");
  };

  const platformLabel = (val: string) => PLATFORMS.find(p => p.value === val)?.label || val;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Code className="w-4 h-4 text-primary" /> Pixels & Tags de Rastreamento
        </h2>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="text-[10px] h-7 gap-1">
          <Plus className="w-3 h-3" />{showForm ? "Fechar" : "Novo Pixel"}
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Cole o código do pixel (script) de qualquer plataforma. Ele será injetado automaticamente em todas as páginas do site.
      </p>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl p-4 border border-border space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px]">Nome</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Meta Pixel Principal" className="text-xs min-h-[36px]" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Plataforma</Label>
              <Select value={form.platform} onValueChange={v => setForm({ ...form, platform: v })}>
                <SelectTrigger className="text-xs min-h-[36px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORMS.map(p => (
                    <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Código do Pixel (cole o script completo)</Label>
            <Textarea value={form.pixel_code} onChange={e => setForm({ ...form, pixel_code: e.target.value })}
              placeholder={'<script>\n  !function(f,b,e,v,n,t,s)...\n</script>'}
              className="text-xs min-h-[120px] font-mono resize-none" />
          </div>
          <Button onClick={handleSave} size="sm" className="text-xs h-8">Salvar Pixel</Button>
        </motion.div>
      )}

      {/* Pixel List */}
      <div className="space-y-2">
        {isLoading && <p className="text-[10px] text-muted-foreground text-center py-4">Carregando...</p>}
        {!isLoading && (!pixels || pixels.length === 0) && (
          <div className="text-center py-8 bg-muted rounded-xl">
            <Code className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">Nenhum pixel configurado</p>
            <p className="text-[10px] text-muted-foreground">Clique em "Novo Pixel" para adicionar</p>
          </div>
        )}
        {pixels?.map((pixel, i) => (
          <motion.div key={pixel.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl p-4 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold">{pixel.name}</p>
                <Badge variant="secondary" className="text-[9px]">{platformLabel(pixel.platform)}</Badge>
                <Badge variant={pixel.is_active ? "default" : "outline"} className="text-[9px]">
                  {pixel.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleToggle(pixel.id, pixel.is_active)}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title={pixel.is_active ? "Desativar" : "Ativar"}>
                  {pixel.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => handleDelete(pixel.id)}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <pre className="text-[9px] text-muted-foreground bg-muted rounded-lg p-2 overflow-x-auto max-h-24 overflow-y-auto font-mono">
              {pixel.pixel_code.slice(0, 300)}{pixel.pixel_code.length > 300 ? "..." : ""}
            </pre>
            <p className="text-[8px] text-muted-foreground">
              Adicionado em {new Date(pixel.created_at).toLocaleDateString("pt-BR")}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TrackingPixelsTab;
