import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, MessageCircle, Mail, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";

type TimeRange = "7d" | "14d" | "30d";

const NotificationsMonitorTab = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [eventFilter, setEventFilter] = useState<string>("all");

  const daysMap: Record<TimeRange, number> = { "7d": 7, "14d": 14, "30d": 30 };
  const since = new Date(Date.now() - daysMap[timeRange] * 24 * 60 * 60 * 1000).toISOString();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["admin-notifications-monitor", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, event_type, phone, status, created_at, user_id, order_id")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
  });

  const eventTypes = useMemo(() => {
    if (!notifications) return [];
    return [...new Set(notifications.map((n) => n.event_type))].sort();
  }, [notifications]);

  const filtered = useMemo(() => {
    if (!notifications) return [];
    if (eventFilter === "all") return notifications;
    return notifications.filter((n) => n.event_type === eventFilter);
  }, [notifications, eventFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = filtered.length;
    const sent = filtered.filter((n) => n.status === "sent").length;
    const failed = filtered.filter((n) => n.status === "failed").length;
    const pending = filtered.filter((n) => n.status === "pending").length;
    return { total, sent, failed, pending };
  }, [filtered]);

  // Daily breakdown
  const dailyData = useMemo(() => {
    const map = new Map<string, { sent: number; failed: number; total: number }>();
    for (const n of filtered) {
      const day = n.created_at.slice(0, 10);
      const entry = map.get(day) || { sent: 0, failed: 0, total: 0 };
      entry.total++;
      if (n.status === "sent") entry.sent++;
      else if (n.status === "failed") entry.failed++;
      map.set(day, entry);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  // Per-user volume (top offenders)
  const userVolume = useMemo(() => {
    const map = new Map<string, number>();
    for (const n of filtered) {
      if (n.user_id) map.set(n.user_id, (map.get(n.user_id) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filtered]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "sent": return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Enviado</Badge>;
      case "failed": return <Badge variant="destructive">Falhou</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Monitor de Notificações
          </h2>
          <p className="text-xs text-muted-foreground">Volume de disparos WhatsApp e e-mail por dia</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-[120px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="14d">14 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
            </SelectContent>
          </Select>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {eventTypes.map((et) => (
                <SelectItem key={et} value={et}>{et}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <MessageCircle className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-5 h-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
            <p className="text-xs text-muted-foreground">Enviados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <XCircle className="w-5 h-5 mx-auto text-destructive mb-1" />
            <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
            <p className="text-xs text-muted-foreground">Falhas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Chart (table-based) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Volume Diário</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>
          ) : dailyData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma notificação no período</p>
          ) : (
            <div className="space-y-1.5">
              {dailyData.map(([day, d]) => {
                const maxBar = Math.max(...dailyData.map(([, v]) => v.total), 1);
                const pct = (d.total / maxBar) * 100;
                return (
                  <div key={day} className="flex items-center gap-3 text-xs">
                    <span className="w-12 text-muted-foreground font-mono shrink-0">{formatDate(day)}</span>
                    <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-primary/70 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                      {d.failed > 0 && (
                        <div
                          className="absolute top-0 h-full bg-destructive/60 rounded-full"
                          style={{ width: `${(d.failed / maxBar) * 100}%`, left: `${((d.total - d.failed) / maxBar) * 100}%` }}
                        />
                      )}
                    </div>
                    <span className="w-16 text-right font-medium shrink-0">
                      {d.total} <span className="text-muted-foreground">msgs</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top users by volume */}
      {userVolume.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Usuários com Mais Disparos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">User ID</TableHead>
                  <TableHead className="text-xs text-right">Mensagens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userVolume.map(([uid, count]) => (
                  <TableRow key={uid}>
                    <TableCell className="text-xs font-mono">{uid.slice(0, 8)}…</TableCell>
                    <TableCell className="text-xs text-right font-bold">
                      {count}
                      {count > 10 && <AlertTriangle className="w-3 h-3 inline ml-1 text-yellow-500" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent notifications log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Últimos Disparos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Tipo</TableHead>
                  <TableHead className="text-xs">Telefone</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 50).map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="text-xs">{formatDateTime(n.created_at)}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[10px]">{n.event_type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{n.phone?.slice(-4).padStart(n.phone.length, "•")}</TableCell>
                    <TableCell>{statusBadge(n.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationsMonitorTab;
