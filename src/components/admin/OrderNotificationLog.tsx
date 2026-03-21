import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Bell, CheckCircle, XCircle, Clock, ShieldCheck } from "lucide-react";

interface Props {
  orderId: string;
}

const OrderNotificationLog = ({ orderId }: Props) => {
  const { data: notifications, isLoading } = useQuery({
    queryKey: ["order-notifications", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, event_type, phone, status, created_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Detect duplicates: group by event_type, mark 2nd+ as deduplicated
  const enriched = (notifications || []).map((n, i, arr) => {
    const priorSent = arr
      .slice(i + 1) // earlier entries (desc order)
      .find((p) => p.event_type === n.event_type && p.status === "sent");
    return { ...n, isDuplicate: !!priorSent && n.status === "sent" };
  });

  if (isLoading) return null;
  if (!enriched.length) return null;

  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
        <Bell className="w-3 h-3" /> Notificações Enviadas
      </Label>
      <div className="space-y-1">
        {enriched.map((n) => (
          <div key={n.id} className="bg-muted rounded-lg px-3 py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {n.status === "sent" ? (
                <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
              ) : n.status === "failed" ? (
                <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">{n.event_type}</Badge>
                  {n.isDuplicate && (
                    <Badge className="text-[8px] px-1 py-0 bg-amber-500/20 text-amber-700 border-amber-500/30 gap-0.5">
                      <ShieldCheck className="w-2.5 h-2.5" /> dedup
                    </Badge>
                  )}
                </div>
                <p className="text-[9px] text-muted-foreground font-mono mt-0.5">
                  {n.phone?.slice(-4).padStart(n.phone.length, "•")}
                </p>
              </div>
            </div>
            <span className="text-[9px] text-muted-foreground whitespace-nowrap">
              {new Date(n.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OrderNotificationLog;
