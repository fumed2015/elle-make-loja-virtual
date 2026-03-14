import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ghost, PhoneCall, CheckCircle, Clock, TrendingUp, Users, Percent, ShoppingCart } from "lucide-react";

const CheckoutLeadsTab = () => {
  const { data: leads, isLoading } = useQuery({
    queryKey: ["admin-checkout-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checkout_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
  });

  const total = leads?.length || 0;
  const converted = leads?.filter((l) => l.converted_at).length || 0;
  const notified = leads?.filter((l) => l.notified_at).length || 0;
  const pending = leads?.filter((l) => !l.converted_at && !l.notified_at).length || 0;
  const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : "0";
  const totalRevenue = leads?.filter((l) => l.converted_at).reduce((acc, l) => acc + Number(l.cart_total || 0), 0) || 0;

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold flex items-center gap-2">
          <Ghost className="w-5 h-5 text-primary" /> Ghost Leads — Checkout Abandonado
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Leads capturados quando o cliente preenche o telefone no checkout mas não finaliza o pedido.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Percent className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{conversionRate}%</p>
              <p className="text-[10px] text-muted-foreground">Taxa Conversão</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue recovered */}
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

      {/* Leads Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Leads Recentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {leads?.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhum lead capturado ainda</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-3 font-semibold">Nome</th>
                    <th className="text-left p-3 font-semibold">Telefone</th>
                    <th className="text-left p-3 font-semibold">Valor Carrinho</th>
                    <th className="text-left p-3 font-semibold">Itens</th>
                    <th className="text-left p-3 font-semibold">Etapa</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-left p-3 font-semibold">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {leads?.map((lead) => {
                    const status = lead.converted_at
                      ? "converted"
                      : lead.notified_at
                        ? "notified"
                        : "pending";
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
                        <td className="p-3 text-muted-foreground">
                          {new Date(lead.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
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
