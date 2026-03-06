import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Download, Search, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const NewsletterTab = () => {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  // Popup customization fields
  const popupFields = [
    { key: "newsletter_popup_headline", label: "Título principal", placeholder: "10% OFF" },
    { key: "newsletter_popup_subtitle", label: "Subtítulo", placeholder: "na sua primeira compra!" },
    { key: "newsletter_popup_description", label: "Descrição", placeholder: "Cadastre seu e-mail...", textarea: true },
    { key: "newsletter_popup_coupon_code", label: "Código do cupom", placeholder: "BELEM10" },
    { key: "newsletter_popup_discount_text", label: "Texto do desconto (exibido após cadastro)", placeholder: "10%" },
    { key: "newsletter_popup_button_text", label: "Texto do botão", placeholder: "QUERO MEU CUPOM DE 10% 🎁" },
  ];

  const { data: popupSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["popup-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings" as any)
        .select("key, value")
        .in("key", popupFields.map((f) => f.key));
      const map: Record<string, string> = {};
      (data as any[])?.forEach((row: any) => {
        map[row.key] = typeof row.value === "string" ? row.value : JSON.stringify(row.value);
      });
      return map;
    },
  });

  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({});
  const currentSettings = { ...popupSettings, ...editedSettings };

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(editedSettings);
      if (!entries.length) return;
      for (const [key, value] of entries) {
        const { error } = await supabase
          .from("site_settings" as any)
          .update({ value: JSON.parse(JSON.stringify(value)), updated_at: new Date().toISOString() } as any)
          .eq("key", key);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["popup-settings"] });
      setEditedSettings({});
      toast.success("Configurações do pop-up salvas!");
    },
    onError: () => toast.error("Erro ao salvar configurações"),
  });

  // Popup toggle
  const { data: popupEnabled, isLoading: toggleLoading } = useQuery({
    queryKey: ["site-setting-newsletter-popup"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings" as any)
        .select("value")
        .eq("key", "newsletter_popup_enabled")
        .single();
      if (error) return true;
      return (data as any)?.value === true;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("site_settings" as any)
        .update({ value: enabled, updated_at: new Date().toISOString() } as any)
        .eq("key", "newsletter_popup_enabled");
      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      queryClient.invalidateQueries({ queryKey: ["site-setting-newsletter-popup"] });
      toast.success(enabled ? "Pop-up de newsletter ativado" : "Pop-up de newsletter desativado");
    },
    onError: () => toast.error("Erro ao atualizar configuração"),
  });

  const { data: subscribers, isLoading } = useQuery({
    queryKey: ["admin-newsletter-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .order("subscribed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtered = subscribers?.filter(
    (s) => s.email.toLowerCase().includes(search.toLowerCase()) || s.name?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const activeCount = subscribers?.filter((s) => s.is_active).length || 0;

  const handleExportCSV = () => {
    if (!filtered.length) return toast.error("Nenhum dado para exportar");
    const header = "Email,Nome,Fonte,Data,Ativo\n";
    const rows = filtered.map((s) =>
      `"${s.email}","${s.name || ""}","${s.source || ""}","${format(new Date(s.subscribed_at), "dd/MM/yyyy HH:mm")}","${s.is_active ? "Sim" : "Não"}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-leads-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} leads exportados!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Newsletter</h2>
          <p className="text-sm text-muted-foreground">Gerencie os leads cadastrados na newsletter</p>
        </div>
        <Button onClick={handleExportCSV} size="sm" className="gap-2">
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
      </div>

      {/* Toggle pop-up */}
      <Card>
        <CardContent className="flex items-center justify-between py-4 px-5">
          <div className="space-y-0.5">
            <Label htmlFor="popup-toggle" className="text-sm font-semibold text-foreground cursor-pointer">
              Pop-up de Newsletter
            </Label>
            <p className="text-xs text-muted-foreground">
              {popupEnabled ? "Ativo — o pop-up será exibido para novos visitantes" : "Desativado — o pop-up não será exibido"}
            </p>
          </div>
          <Switch
            id="popup-toggle"
            checked={!!popupEnabled}
            disabled={toggleLoading || toggleMutation.isPending}
            onCheckedChange={(checked) => toggleMutation.mutate(checked)}
          />
        </CardContent>
      </Card>

      {/* Popup customization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">Personalizar Pop-up</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {popupFields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{field.label}</Label>
              {field.textarea ? (
                <Textarea
                  value={currentSettings[field.key] ?? ""}
                  onChange={(e) => setEditedSettings((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  rows={3}
                />
              ) : (
                <Input
                  value={currentSettings[field.key] ?? ""}
                  onChange={(e) => setEditedSettings((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                />
              )}
            </div>
          ))}
          <Button
            onClick={() => saveSettingsMutation.mutate()}
            disabled={!Object.keys(editedSettings).length || saveSettingsMutation.isPending}
            size="sm"
            className="gap-2"
          >
            <Save className="w-4 h-4" /> Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-foreground">{subscribers?.length || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Ativos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">{activeCount}</p></CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Inativos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-muted-foreground">{(subscribers?.length || 0) - activeCount}</p></CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por e-mail ou nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Mail className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhum lead encontrado</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-sm">{s.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.name || "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{s.source || "popup"}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(s.subscribed_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.is_active ? "default" : "secondary"} className="text-[10px]">
                      {s.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default NewsletterTab;
