import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Cake } from "lucide-react";

export const LeadsTab = () => {
  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["admin-orders-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("user_id").not("status", "eq", "cancelled");
      if (error) throw error;
      return data;
    },
  });

  const buyerIds = new Set(orders?.map(o => o.user_id) || []);
  const leads = profiles?.filter(p => !buyerIds.has(p.user_id)) || [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold">Leads (Cadastros sem Compra)</h2>
        <Badge variant="secondary" className="text-[10px]">{leads.length}</Badge>
      </div>
      {isLoading ? (
        <div className="text-center py-4 text-xs text-muted-foreground">Carregando...</div>
      ) : leads.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-4">Nenhum lead encontrado</p>
      ) : (
        <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
          {leads.map(p => (
            <div key={p.id} className="bg-card rounded-lg p-3 border border-border flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                {(p.full_name || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{p.full_name || "Sem nome"}</p>
                <p className="text-[10px] text-muted-foreground">{p.phone || "Sem telefone"} • {new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const BirthdaysTab = () => {
  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-birthdays"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").not("birthday", "is", null).order("birthday");
      if (error) throw error;
      return data;
    },
  });

  const today = new Date();
  const thisMonth = profiles?.filter(p => {
    if (!p.birthday) return false;
    const bd = new Date(p.birthday);
    return bd.getMonth() === today.getMonth();
  }) || [];

  const nextMonth = profiles?.filter(p => {
    if (!p.birthday) return false;
    const bd = new Date(p.birthday);
    return bd.getMonth() === (today.getMonth() + 1) % 12;
  }) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Cake className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold">Aniversariantes</h2>
      </div>

      {isLoading ? (
        <div className="text-center py-4 text-xs text-muted-foreground">Carregando...</div>
      ) : (
        <>
          <div className="space-y-2">
            <p className="text-xs font-bold text-primary">🎂 Este mês ({thisMonth.length})</p>
            {thisMonth.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum aniversariante este mês</p>
            ) : thisMonth.map(p => (
              <div key={p.id} className="bg-card rounded-lg p-3 border border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs">🎂</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{p.full_name || "Sem nome"}</p>
                  <p className="text-[10px] text-muted-foreground">{p.phone || "Sem telefone"} • {new Date(p.birthday!).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground">📅 Próximo mês ({nextMonth.length})</p>
            {nextMonth.map(p => (
              <div key={p.id} className="bg-card rounded-lg p-3 border border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs">📅</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{p.full_name || "Sem nome"}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(p.birthday!).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
