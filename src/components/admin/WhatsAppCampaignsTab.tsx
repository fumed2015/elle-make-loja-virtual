import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Cake, RotateCcw, Megaphone, Send, Users, Clock, History } from "lucide-react";
import { motion } from "framer-motion";

const WhatsAppCampaignsTab = () => {
  const [sending, setSending] = useState<string | null>(null);

  // Birthday state
  const [birthdayCustomMsg, setBirthdayCustomMsg] = useState("");

  // Repurchase state
  const [repurchaseDays, setRepurchaseDays] = useState("30");
  const [repurchaseCustomMsg, setRepurchaseCustomMsg] = useState("");

  // Mass campaign state
  const [campaignMessage, setCampaignMessage] = useState("");
  const [campaignFilter, setCampaignFilter] = useState("all");

  // Fetch today's birthday count
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-whatsapp-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone, birthday");
      if (error) throw error;
      return data;
    },
  });

  const { data: recentNotifications } = useQuery({
    queryKey: ["recent-campaign-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .in("event_type", ["birthday", "repurchase.reminder", "mass.campaign"])
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const birthdayToday = (profiles || []).filter((p) => {
    if (!p.birthday || !p.phone) return false;
    return String(p.birthday).slice(5, 10) === `${mm}-${dd}`;
  });

  const profilesWithPhone = (profiles || []).filter((p) => p.phone);

  const handleBirthdayNotify = async () => {
    setSending("birthday");
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-notifications", {
        body: {
          action: "birthday-notify",
          ...(birthdayCustomMsg ? { custom_message: birthdayCustomMsg } : {}),
        },
      });
      if (error) throw error;
      toast.success(`🎂 Enviado para ${data.sent}/${data.total} aniversariantes!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar");
    } finally {
      setSending(null);
    }
  };

  const handleRepurchaseReminder = async () => {
    setSending("repurchase");
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-notifications", {
        body: {
          action: "repurchase-reminder",
          days: parseInt(repurchaseDays),
          ...(repurchaseCustomMsg ? { custom_message: repurchaseCustomMsg } : {}),
        },
      });
      if (error) throw error;
      toast.success(`🔄 Enviado para ${data.sent}/${data.total} clientes inativos!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar");
    } finally {
      setSending(null);
    }
  };

  const handleMassCampaign = async () => {
    if (!campaignMessage.trim()) {
      toast.error("Digite a mensagem da campanha");
      return;
    }
    setSending("mass");
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-notifications", {
        body: {
          action: "mass-campaign",
          message: campaignMessage,
          filter: campaignFilter,
        },
      });
      if (error) throw error;
      toast.success(`📢 Campanha enviada para ${data.sent}/${data.total} contatos!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar");
    } finally {
      setSending(null);
    }
  };

  const EVENT_LABELS: Record<string, string> = {
    birthday: "🎂 Aniversário",
    "repurchase.reminder": "🔄 Recompra",
    "mass.campaign": "📢 Campanha",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Send className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-display font-bold">Disparos WhatsApp</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Envie mensagens em massa via Z-API. Use variáveis: {"{first_name}"}, {"{merchant}"}, {"{link}"}, {"{days}"}
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Aniversariantes Hoje", value: birthdayToday.length, icon: Cake, color: "text-pink-500" },
          { label: "Com Telefone", value: profilesWithPhone.length, icon: Users, color: "text-primary" },
          { label: "Total Perfis", value: profiles?.length || 0, icon: Users, color: "text-muted-foreground" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl p-3 border border-border text-center">
            <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
            <p className="text-lg font-bold">{s.value}</p>
            <p className="text-[9px] text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Birthday Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Cake className="w-4 h-4 text-pink-500" />
            <div>
              <p className="text-sm font-semibold">Aniversariantes do Dia</p>
              <p className="text-[10px] text-muted-foreground">Envia parabéns para quem faz aniversário hoje</p>
            </div>
          </div>
          <Badge className="text-[10px]">{birthdayToday.length} hoje</Badge>
        </div>
        <div className="p-4 space-y-3">
          {birthdayToday.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {birthdayToday.map((p) => (
                <Badge key={p.user_id} variant="secondary" className="text-[10px]">
                  🎂 {p.full_name?.split(" ")[0] || "Cliente"}
                </Badge>
              ))}
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-[10px]">Mensagem personalizada (opcional)</Label>
            <Textarea
              value={birthdayCustomMsg}
              onChange={(e) => setBirthdayCustomMsg(e.target.value)}
              className="min-h-[80px] text-xs font-mono bg-muted border-none"
              placeholder="Deixe vazio para usar o template padrão. Variáveis: {first_name}, {merchant}, {link}"
            />
          </div>
          <Button
            onClick={handleBirthdayNotify}
            disabled={sending === "birthday" || birthdayToday.length === 0}
            size="sm"
            className="text-xs gap-1"
          >
            {sending === "birthday" ? (
              <><Clock className="w-3 h-3 animate-spin" />Enviando...</>
            ) : (
              <><Send className="w-3 h-3" />Enviar para {birthdayToday.length} aniversariantes</>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Repurchase Reminder Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <RotateCcw className="w-4 h-4 text-amber-500" />
          <div>
            <p className="text-sm font-semibold">Lembrete de Recompra</p>
            <p className="text-[10px] text-muted-foreground">Notifica clientes inativos há X dias</p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-[10px]">Período de inatividade</Label>
            <Select value={repurchaseDays} onValueChange={setRepurchaseDays}>
              <SelectTrigger className="h-8 text-xs bg-muted border-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 dias sem comprar</SelectItem>
                <SelectItem value="60">60 dias sem comprar</SelectItem>
                <SelectItem value="90">90 dias sem comprar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Mensagem personalizada (opcional)</Label>
            <Textarea
              value={repurchaseCustomMsg}
              onChange={(e) => setRepurchaseCustomMsg(e.target.value)}
              className="min-h-[80px] text-xs font-mono bg-muted border-none"
              placeholder="Deixe vazio para usar o template padrão. Variáveis: {first_name}, {merchant}, {link}, {days}"
            />
          </div>
          <Button
            onClick={handleRepurchaseReminder}
            disabled={sending === "repurchase"}
            size="sm"
            className="text-xs gap-1"
          >
            {sending === "repurchase" ? (
              <><Clock className="w-3 h-3 animate-spin" />Enviando...</>
            ) : (
              <><Send className="w-3 h-3" />Disparar lembrete ({repurchaseDays} dias)</>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Mass Campaign Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <Megaphone className="w-4 h-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">Campanha em Massa</p>
            <p className="text-[10px] text-muted-foreground">Envie promoções para toda a base de contatos</p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="space-y-1">
            <Label className="text-[10px]">Público-alvo</Label>
            <Select value={campaignFilter} onValueChange={setCampaignFilter}>
              <SelectTrigger className="h-8 text-xs bg-muted border-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos com telefone ({profilesWithPhone.length})</SelectItem>
                <SelectItem value="buyers">Apenas compradores</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Mensagem da campanha *</Label>
            <Textarea
              value={campaignMessage}
              onChange={(e) => setCampaignMessage(e.target.value)}
              className="min-h-[120px] text-xs font-mono bg-muted border-none"
              placeholder="Ex: 🔥 *Promoção Relâmpago!* Oi {first_name}! Hoje tem 20% OFF em tudo na {merchant}! Corre lá: {link}"
            />
          </div>
          <Button
            onClick={handleMassCampaign}
            disabled={sending === "mass" || !campaignMessage.trim()}
            size="sm"
            className="text-xs gap-1"
          >
            {sending === "mass" ? (
              <><Clock className="w-3 h-3 animate-spin" />Enviando...</>
            ) : (
              <><Megaphone className="w-3 h-3" />Disparar campanha</>
            )}
          </Button>
        </div>
      </motion.div>

      {/* Recent History */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <History className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Histórico Recente</p>
        </div>
        <div className="p-4">
          {(!recentNotifications || recentNotifications.length === 0) ? (
            <p className="text-[10px] text-muted-foreground text-center py-4">Nenhum disparo recente</p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {recentNotifications.map((n) => (
                <div key={n.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px]">{EVENT_LABELS[n.event_type] || n.event_type}</span>
                      <Badge variant={n.status === "sent" ? "default" : "destructive"} className="text-[8px]">
                        {n.status === "sent" ? "✓" : "✗"}
                      </Badge>
                    </div>
                    <p className="text-[9px] text-muted-foreground truncate">{n.phone}</p>
                  </div>
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default WhatsAppCampaignsTab;
