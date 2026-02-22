import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { MessageCircle, Save, RotateCcw, Eye, EyeOff, Info } from "lucide-react";
import { motion } from "framer-motion";

const EVENT_LABELS: Record<string, { label: string; emoji: string; description: string }> = {
  "order.created": { label: "Pedido Criado", emoji: "🛒", description: "Enviado quando um novo pedido é registrado" },
  "order.paid": { label: "Pagamento Confirmado", emoji: "✅", description: "Enviado quando o pagamento é aprovado" },
  "order.shipped": { label: "Pedido Enviado", emoji: "📦", description: "Enviado quando o pedido sai para entrega" },
  "order.delivered": { label: "Pedido Entregue", emoji: "🎉", description: "Enviado quando o pedido é entregue" },
  "checkout.abandoned": { label: "Carrinho Abandonado", emoji: "💄", description: "Enviado para recuperar carrinhos abandonados" },
};

const AVAILABLE_VARS: Record<string, string[]> = {
  "order.created": ["{first_name}", "{merchant}", "{products_list}", "{total}"],
  "order.paid": ["{first_name}", "{merchant}", "{products_list}"],
  "order.shipped": ["{first_name}", "{merchant}", "{products_list}", "{tracking_code}", "{tracking_url}"],
  "order.delivered": ["{first_name}", "{merchant}", "{products_list}"],
  "checkout.abandoned": ["{first_name}", "{merchant}", "{products_list}", "{link}"],
};

const WhatsAppTemplatesTab = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ["message-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const handleEdit = (template: any) => {
    setEditingId(template.id);
    setEditValue(template.template);
  };

  const handleSave = async (id: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("message_templates")
        .update({ template: editValue, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success("Template salvo com sucesso! ✅");
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("message_templates")
        .update({ is_active: !currentState })
        .eq("id", id);
      if (error) throw error;
      toast.success(!currentState ? "Template ativado" : "Template desativado");
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const renderPreview = (template: string) => {
    return template
      .replace(/{first_name}/g, "Maria")
      .replace(/{merchant}/g, "Elle Make")
      .replace(/{products_list}/g, "• Base Líquida Matte (1x) — R$ 45,90\n• Paleta de Sombras 18 Cores (1x) — R$ 89,90")
      .replace(/{total}/g, "135,80")
      .replace(/{tracking_code}/g, "BR123456789XX")
      .replace(/{tracking_url}/g, "https://rastreamento.correios.com.br")
      .replace(/{link}/g, "https://elle-make.checkout.yampi.com.br/cart/abc123");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-display font-bold">Templates WhatsApp</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Edite as mensagens enviadas automaticamente via Z-API. Use as variáveis disponíveis para personalizar.
      </p>

      {templates?.map((tmpl, i) => {
        const meta = EVENT_LABELS[tmpl.event_type] || { label: tmpl.event_type, emoji: "📩", description: "" };
        const vars = AVAILABLE_VARS[tmpl.event_type] || [];
        const isEditing = editingId === tmpl.id;
        const isPreviewing = previewId === tmpl.id;

        return (
          <motion.div
            key={tmpl.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <span className="text-lg">{meta.emoji}</span>
                <div>
                  <p className="text-sm font-semibold">{meta.label}</p>
                  <p className="text-[10px] text-muted-foreground">{meta.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={tmpl.is_active ? "default" : "secondary"} className="text-[9px]">
                  {tmpl.is_active ? "Ativo" : "Inativo"}
                </Badge>
                <Switch
                  checked={tmpl.is_active}
                  onCheckedChange={() => handleToggle(tmpl.id, tmpl.is_active)}
                />
              </div>
            </div>

            {/* Variables */}
            <div className="px-4 pt-3">
              <div className="flex items-center gap-1 mb-2">
                <Info className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground font-medium">Variáveis disponíveis:</span>
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {vars.map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      if (isEditing) {
                        setEditValue((prev) => prev + " " + v);
                      }
                    }}
                    className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono hover:bg-primary/20 transition-colors cursor-pointer"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Content */}
            <div className="px-4 pb-3">
              {isEditing ? (
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="min-h-[160px] text-xs font-mono bg-muted border-none"
                  placeholder="Digite o template da mensagem..."
                />
              ) : isPreviewing ? (
                <div className="bg-[hsl(142,70%,95%)] rounded-xl p-3 text-xs whitespace-pre-wrap font-sans border border-[hsl(142,70%,85%)]">
                  {renderPreview(tmpl.template)}
                </div>
              ) : (
                <div className="bg-muted rounded-xl p-3 text-xs whitespace-pre-wrap font-mono text-muted-foreground">
                  {tmpl.template}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 px-4 pb-3">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={() => handleSave(tmpl.id)} disabled={saving} className="text-xs gap-1 h-8">
                    <Save className="w-3 h-3" />{saving ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="text-xs h-8">
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(tmpl)} className="text-xs gap-1 h-8">
                    ✏️ Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreviewId(isPreviewing ? null : tmpl.id)}
                    className="text-xs gap-1 h-8"
                  >
                    {isPreviewing ? <><EyeOff className="w-3 h-3" />Ocultar</> : <><Eye className="w-3 h-3" />Preview</>}
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default WhatsAppTemplatesTab;
