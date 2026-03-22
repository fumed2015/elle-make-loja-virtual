import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Ghost, PhoneCall, CheckCircle, Clock, TrendingUp, Users, Percent, ShoppingCart, MessageCircle, Search, RefreshCw, Filter } from "lucide-react";
import { toast } from "sonner";

type LeadStatus = "all" | "pending" | "notified" | "converted";

const CheckoutLeadsTab = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<LeadStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: leads, isLoading, refetch } = useQuery({
    queryKey: ["admin-checkout-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkout_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const filteredLeads = (leads || []).filter((lead) => {
    // Status filter
    if (statusFilter === "pending" && (lead.converted_at || lead.notified_at)) return false;
    if (statusFilter === "notified" && (!lead.notified_at || lead.converted_at)) return false;
    if (statusFilter === "converted" && !lead.converted_at) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (lead.first_name || "").toLowerCase();
      const phone = lead.phone || "";
      if (!name.includes(q) && !phone.includes(q)) return false;
    }

    return true;
  });

  const total = leads?.length || 0;
  const converted = leads?.filter((l) => l.converted_at).length || 0;
  const notified = leads?.filter((l) => l.notified_at && !l.converted_at).length || 0;
  const pending = leads?.filter((l) => !l.converted_at && !l.notified_at).length || 0;
  const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : "0";
  const totalRevenue = leads?.filter((l) => l.converted_at).reduce((acc, l) => acc + Number(l.cart_total || 0), 0) || 0;
  const avgCartValue = total > 0 ? ((leads || []).reduce((acc, l) => acc + Number(l.cart_total || 0), 0) / total) : 0;

  const markAsNotified = async (leadId: string) => {
    const { error } = await supabase
      .from("checkout_leads")
      .update({ notified_at: new Date().toISOString() } as any)
      .eq("id", leadId);
    if (error) {
      toast.error("Erro ao marcar como notificado");
    } else {
      toast.success("Lead marcado como notificado");
      queryClient.invalidateQueries({ queryKey: ["admin-checkout-leads"] });
    }
  };

  const openWhatsApp = (phone: string, firstName: string, cartTotal: number) => {
    let cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone.startsWith("55")) cleanPhone = "55" + cleanPhone;
    const msg = encodeURIComponent(
      `Oi, ${firstName || "tudo bem"}! 💄\n\nVi que você estava finalizando uma compra de R$ ${cartTotal.toFixed(2).replace(".", ",")} na Elle Make mas não concluiu.\n\nPosso te ajudar com algo? Use o cupom *VOLTEI5* e ganhe 5% OFF! 🎁`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            <Ghost className="w-5 h-5 text-primary" /> Ghost Leads — Checkout Abandonado
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Leads capturados quando o cliente preenche o telefone no checkout mas não finaliza o pedido. Funciona para usuários logados e visitantes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-[10px] text-muted-foreground">Total Leads</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pending}</p>
              <p className="text-[10px] text-muted-foreground">Aguardando</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <PhoneCall className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{notified}</p>
              <p className="text-[10px] text-muted-foreground">Notificados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{converted}</p>
              <p className="text-[10px] text-muted-foreground">Convertidos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Percent className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{conversionRate}%</p>
              <p className="text-[10px] text-muted-foreground">Taxa Conversão</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue + Avg cart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-green-600">R$ {totalRevenue.toFixed(2).replace(".", ",")}</p>
              <p className="text-xs text-muted-foreground">Receita recuperada (leads convertidos)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold">R$ {avgCartValue.toFixed(2).replace(".", ",")}</p>
              <p className="text-xs text-muted-foreground">Ticket médio dos leads</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "pending", "notified", "converted"] as LeadStatus[]).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className="text-xs"
            >
              {s === "all" ? "Todos" : s === "pending" ? "Aguardando" : s === "notified" ? "Notificados" : "Convertidos"}
            </Button>
          ))}
        </div>
      </div>

      {/* Leads Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Leads ({filteredLeads.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredLeads.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {searchQuery || statusFilter !== "all" ? "Nenhum lead encontrado com os filtros aplicados" : "Nenhum lead capturado ainda"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3 font-semibold">Nome</th>
                    <th className="text-left p-3 font-semibold">Telefone</th>
                    <th className="text-left p-3 font-semibold">Valor</th>
                    <th className="text-left p-3 font-semibold">Itens</th>
                    <th className="text-left p-3 font-semibold">Etapa</th>
                    <th className="text-left p-3 font-semibold">Tipo</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold">Data</th>
                    <th className="text-left p-3 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => {
                    const status = lead.converted_at
                      ? "converted"
                      : lead.notified_at
                        ? "notified"
                        : "pending";
                    const isGuest = !lead.user_id;
                    return (
                      <tr key={lead.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="p-3 font-medium">{lead.first_name || "—"}</td>
                        <td className="p-3 font-mono">
                          {lead.phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
                        </td>
                        <td className="p-3 font-semibold text-primary">
                          R$ {Number(lead.cart_total || 0).toFixed(2).replace(".", ",")}
                        </td>
                        <td className="p-3">{lead.items_count}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px]">
                            <ShoppingCart className="w-3 h-3 mr-1" />{lead.step}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className={`text-[10px] ${isGuest ? "border-orange-300 text-orange-600" : "border-blue-300 text-blue-600"}`}>
                            {isGuest ? "Visitante" : "Logado"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {status === "converted" && (
                            <Badge className="bg-green-500/10 text-green-600 border-0 text-[10px]">
                              <CheckCircle className="w-3 h-3 mr-1" />Convertido
                            </Badge>
                          )}
                          {status === "notified" && (
                            <Badge className="bg-blue-500/10 text-blue-500 border-0 text-[10px]">
                              <PhoneCall className="w-3 h-3 mr-1" />Notificado
                            </Badge>
                          )}
                          {status === "pending" && (
                            <Badge className="bg-yellow-500/10 text-yellow-600 border-0 text-[10px]">
                              <Clock className="w-3 h-3 mr-1" />Aguardando
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          {new Date(lead.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {status !== "converted" && (
                              <>
                                <Button
                                  variant="ghost" size="sm"
                                  className="h-7 w-7 p-0 text-green-600 hover:bg-green-50"
                                  title="Contatar via WhatsApp"
                                  onClick={() => openWhatsApp(lead.phone, lead.first_name || "", Number(lead.cart_total || 0))}
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </Button>
                                {status !== "notified" && (
                                  <Button
                                    variant="ghost" size="sm"
                                    className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                                    title="Marcar como notificado"
                                    onClick={() => markAsNotified(lead.id)}
                                  >
                                    <PhoneCall className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckoutLeadsTab;
