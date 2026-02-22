import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, Plus, ArrowLeft, TrendingUp, Box, Tag, Star, Users, ImageIcon, Eye, EyeOff, Percent, Trash2, Search, AlertTriangle, CheckCircle, Info, FolderOpen, Pencil, Wand2, Sparkles, Loader2, RefreshCw, UserPlus, Cake, MessageCircle, Calendar, Gift, DollarSign, Target, Settings2, Megaphone, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { useProducts, useCategories } from "@/hooks/useProducts";
import { useAllOrders } from "@/hooks/useOrders";
import { useInfluencers, useCreateInfluencer } from "@/hooks/useInfluencers";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";

import AdminProductsPanel from "@/components/admin/AdminProductsPanel";
import OrdersManagementTab from "@/components/admin/OrdersManagementTab";
import FinanceiroTab from "@/components/admin/FinanceiroTab";
import ComercialTab from "@/components/admin/ComercialTab";
import OperacionalTab from "@/components/admin/OperacionalTab";
import MarketingTab from "@/components/admin/MarketingTab";
import TrackingPixelsTab from "@/components/admin/TrackingPixelsTab";
import WhatsAppTemplatesTab from "@/components/admin/WhatsAppTemplatesTab";

type Tab = "dashboard" | "products" | "orders" | "add-product" | "coupons" | "reviews" | "influencers" | "seo" | "categories" | "ai-content" | "leads" | "birthdays" | "financeiro" | "comercial" | "operacional" | "marketing" | "pixels" | "whatsapp";

const statusLabels: Record<string, string> = {
  pending: "Pendente", confirmed: "Confirmado", preparing: "Preparando",
  shipped: "Enviado", delivered: "Entregue", cancelled: "Cancelado",
};

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [tab, setTab] = useState<Tab>("dashboard");

  if (!user || adminLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center gap-4">
        <LayoutDashboard className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-display font-bold">Acesso Restrito</h1>
        <p className="text-sm text-muted-foreground">Você não tem permissão de administrador</p>
        <Button variant="outline" onClick={() => navigate("/")} className="min-h-[44px]">Voltar à Loja</Button>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard" as Tab, label: "Dashboard", icon: TrendingUp },
    { id: "financeiro" as Tab, label: "Financeiro", icon: DollarSign },
    { id: "comercial" as Tab, label: "Comercial", icon: Target },
    { id: "operacional" as Tab, label: "Operacional", icon: Settings2 },
    { id: "marketing" as Tab, label: "Marketing", icon: Megaphone },
    { id: "products" as Tab, label: "Produtos", icon: Box },
    { id: "categories" as Tab, label: "Categorias", icon: FolderOpen },
    { id: "orders" as Tab, label: "Pedidos", icon: ShoppingCart },
    { id: "coupons" as Tab, label: "Cupons", icon: Tag },
    { id: "reviews" as Tab, label: "Reviews", icon: Star },
    { id: "influencers" as Tab, label: "Influencers", icon: Users },
    { id: "leads" as Tab, label: "Leads", icon: UserPlus },
    { id: "birthdays" as Tab, label: "Aniversários", icon: Cake },
    { id: "pixels" as Tab, label: "Pixels", icon: Code },
    { id: "whatsapp" as Tab, label: "WhatsApp", icon: MessageCircle },
    { id: "seo" as Tab, label: "SEO", icon: Search },
    { id: "ai-content" as Tab, label: "IA Conteúdo", icon: Wand2 },
  ];

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-display font-bold">Painel Admin</h1>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto mb-6 pb-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors min-h-[36px] flex-shrink-0 ${tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <DashboardTab />}
      {tab === "financeiro" && <FinanceiroTab />}
      {tab === "comercial" && <ComercialTab />}
      {tab === "operacional" && <OperacionalTab />}
      {tab === "marketing" && <MarketingTab />}
      {tab === "products" && <AdminProductsPanel />}
      {tab === "orders" && <OrdersManagementTab />}
      {tab === "coupons" && <CouponsTab />}
      {tab === "reviews" && <ReviewsTab />}
      {tab === "influencers" && <InfluencersTab />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "leads" && <LeadsTab />}
      {tab === "birthdays" && <BirthdaysTab />}
      {tab === "seo" && <SEOTab />}
      {tab === "pixels" && <TrackingPixelsTab />}
      {tab === "whatsapp" && <WhatsAppTemplatesTab />}
      {tab === "ai-content" && <AIContentTab />}
    </div>
  );
};

// ========== Dashboard ==========
const DashboardTab = () => {
  const { data: products } = useProducts({});
  const { data: orders } = useAllOrders();
  const { data: influencers } = useInfluencers();
  const [yampiStatus, setYampiStatus] = useState<"checking" | "connected" | "error">("checking");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  // User analytics queries
  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: userRoles } = useQuery({
    queryKey: ["admin-user-roles-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  useState(() => {
    supabase.functions.invoke('yampi-checkout', {
      body: { action: 'get-checkout-url' },
    }).then(({ data, error }) => {
      setYampiStatus(error || !data?.success ? "error" : "connected");
    }).catch(() => setYampiStatus("error"));
  });

  const handleSyncProducts = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('yampi-sync');
      if (error) throw error;
      setSyncResult(data);
      toast.success(`Sincronizado! ${data?.created || 0} criados, ${data?.updated || 0} atualizados`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao sincronizar');
    } finally {
      setSyncing(false);
    }
  };

  const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
  const totalOrders = orders?.length || 0;
  const totalProducts = products?.length || 0;
  const pendingOrders = orders?.filter((o) => o.status === "pending").length || 0;
  const activeInfluencers = influencers?.filter((i) => i.is_active).length || 0;
  const productsNoDesc = products?.filter(p => !p.description || p.description.length < 30).length || 0;

  // User analytics
  const totalUsers = profiles?.length || 0;
  const roleCounts = userRoles?.reduce((acc, r) => {
    acc[r.role] = (acc[r.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentSignups7d = profiles?.filter(p => new Date(p.created_at) >= last7Days).length || 0;
  const recentSignups30d = profiles?.filter(p => new Date(p.created_at) >= last30Days).length || 0;

  // Users who placed orders (active buyers)
  const buyerIds = new Set(orders?.map(o => o.user_id) || []);
  const activeBuyers = buyerIds.size;
  const conversionRate = totalUsers > 0 ? ((activeBuyers / totalUsers) * 100).toFixed(1) : "0";

  // Birthday stats
  const usersWithBirthday = profiles?.filter(p => (p as any).birthday).length || 0;
  const usersWithPhone = profiles?.filter(p => p.phone).length || 0;

  const stats = [
    { label: "Receita Total", value: `R$ ${totalRevenue.toFixed(2).replace(".", ",")}`, icon: TrendingUp },
    { label: "Pedidos", value: totalOrders, icon: ShoppingCart },
    { label: "Produtos", value: totalProducts, icon: Box },
    { label: "Pendentes", value: pendingOrders, icon: Package },
    { label: "Influencers", value: activeInfluencers, icon: Users },
    { label: "Sem Descrição", value: productsNoDesc, icon: AlertTriangle, bad: productsNoDesc > 0 },
  ];

  return (
    <div className="space-y-4">
      {/* Yampi Integration Status */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl p-4 border ${
          yampiStatus === "connected" ? "bg-accent/5 border-accent/30" :
          yampiStatus === "error" ? "bg-destructive/5 border-destructive/30" :
          "bg-muted border-border"
        }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            yampiStatus === "connected" ? "bg-accent/15" :
            yampiStatus === "error" ? "bg-destructive/15" :
            "bg-muted"
          }`}>
            {yampiStatus === "checking" ? <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" /> :
             yampiStatus === "connected" ? <CheckCircle className="w-5 h-5 text-accent" /> :
             <AlertTriangle className="w-5 h-5 text-destructive" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Yampi Checkout</p>
              <Badge variant="secondary" className={`text-[9px] ${
                yampiStatus === "connected" ? "bg-accent/15 text-accent" :
                yampiStatus === "error" ? "bg-destructive/15 text-destructive" :
                ""
              }`}>
                {yampiStatus === "checking" ? "Verificando..." :
                 yampiStatus === "connected" ? "✓ Conectado" : "✗ Erro"}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {yampiStatus === "connected" ? "Credenciais configuradas • Checkout seguro ativo" :
               yampiStatus === "error" ? "Verifique as credenciais no painel de secrets" :
               "Verificando conexão com a API Yampi..."}
            </p>
          </div>
        </div>

        {/* Sync button */}
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold">Sincronizar Produtos</p>
              <p className="text-[10px] text-muted-foreground">Exportar catálogo para a Yampi</p>
            </div>
            <Button
              size="sm"
              onClick={handleSyncProducts}
              disabled={syncing || yampiStatus !== "connected"}
              className="text-xs gap-1.5 h-8"
            >
              {syncing ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Sincronizando...</> :
               <><RefreshCw className="w-3.5 h-3.5" />Sincronizar</>}
            </Button>
          </div>
          {syncResult && (
            <div className="mt-2 bg-muted rounded-lg p-2.5 space-y-1">
              <div className="flex gap-3 text-[10px]">
                <span className="text-accent font-bold">✓ {syncResult.created} criados</span>
                <span className="text-primary font-bold">↻ {syncResult.updated} atualizados</span>
                {syncResult.errors > 0 && <span className="text-destructive font-bold">✗ {syncResult.errors} erros</span>}
              </div>
              {syncResult.results?.filter((r: any) => r.status === 'error').slice(0, 3).map((r: any, i: number) => (
                <p key={i} className="text-[9px] text-destructive truncate">• {r.name}: {r.error}</p>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-card rounded-xl p-4 border border-border">
            <stat.icon className={`w-5 h-5 mb-2 ${(stat as any).bad ? "text-destructive" : "text-primary"}`} />
            <p className={`text-lg font-bold ${(stat as any).bad ? "text-destructive" : ""}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* User Analytics Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-card rounded-xl p-4 border border-border space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold">Usuários & Atividade</h3>
          <Badge variant="secondary" className="text-[10px]">{totalUsers} cadastrados</Badge>
        </div>

        {/* User stats grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-lg font-bold">{totalUsers}</p>
            <p className="text-[9px] text-muted-foreground">Total Usuários</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-accent">{activeBuyers}</p>
            <p className="text-[9px] text-muted-foreground">Compradores</p>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-primary">{conversionRate}%</p>
            <p className="text-[9px] text-muted-foreground">Conversão</p>
          </div>
        </div>

        {/* Signups */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-[9px] text-muted-foreground uppercase font-bold">Últimos 7 dias</p>
            <p className="text-sm font-bold">{recentSignups7d} <span className="text-[10px] text-muted-foreground font-normal">novos cadastros</span></p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-[9px] text-muted-foreground uppercase font-bold">Últimos 30 dias</p>
            <p className="text-sm font-bold">{recentSignups30d} <span className="text-[10px] text-muted-foreground font-normal">novos cadastros</span></p>
          </div>
        </div>

        {/* Roles breakdown */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Papéis</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(roleCounts).map(([role, count]) => (
              <Badge key={role} variant="outline" className="text-[10px] gap-1">
                {role === "admin" ? "👑" : role === "moderator" ? "🛡️" : role === "staff" ? "🏷️" : "👤"} {role}: {count}
              </Badge>
            ))}
          </div>
        </div>

        {/* Data completeness */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Completude dos Dados</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
              <span className="text-[10px] text-muted-foreground">Com telefone</span>
              <span className="text-xs font-bold">{usersWithPhone}/{totalUsers}</span>
            </div>
            <div className="flex items-center justify-between bg-muted rounded-lg px-3 py-2">
              <span className="text-[10px] text-muted-foreground">Com aniversário</span>
              <span className="text-xs font-bold">{usersWithBirthday}/{totalUsers}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ProductsTab and AddProductTab moved to AdminProductsPanel component

// ========== AI Content Tab ==========
const AIContentTab = () => {
  const { data: products, refetch } = useProducts({});
  const [bulkRunning, setBulkRunning] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);

  const productsNoDesc = products?.filter(p => !p.description || p.description.length < 30) || [];
  const productsNoSensorial = products?.filter(p => !p.sensorial_description) || [];
  const productsNoTags = products?.filter(p => !p.tags || p.tags.length === 0) || [];

  const handleBulkSEO = async () => {
    setBulkRunning(true);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-content-generator", {
        body: { action: "bulk-seo" },
      });
      if (error) throw error;
      setResults(data?.results || []);
      toast.success(`${data?.updated || 0} produtos otimizados!`);
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Erro no SEO em lote");
    } finally {
      setBulkRunning(false);
    }
  };

  const handleGeneratePreview = async (productId: string) => {
    setGeneratingId(productId);
    setPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-content-generator", {
        body: { action: "generate", product_id: productId },
      });
      if (error) throw error;
      setPreview({ ...data?.content, product_id: productId });
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar preview");
    } finally {
      setGeneratingId(null);
    }
  };

  const handleApplyPreview = async () => {
    if (!preview) return;
    const updateData: any = {};
    if (preview.description) updateData.description = preview.description;
    if (preview.sensorial_description) updateData.sensorial_description = preview.sensorial_description;
    if (preview.how_to_use) updateData.how_to_use = preview.how_to_use;
    if (preview.tags) updateData.tags = preview.tags;

    const { error } = await supabase.from("products").update(updateData).eq("id", preview.product_id);
    if (error) toast.error("Erro ao salvar");
    else {
      toast.success("Conteúdo aplicado com sucesso!");
      setPreview(null);
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-5 border border-primary/20">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Gerador de Conteúdo com IA</h2>
            <p className="text-xs text-muted-foreground">Crie descrições, títulos SEO e tags automaticamente</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-lg p-3 border border-border text-center">
          <p className={`text-lg font-bold ${productsNoDesc.length > 0 ? "text-destructive" : "text-accent"}`}>{productsNoDesc.length}</p>
          <p className="text-[10px] text-muted-foreground">Sem descrição</p>
        </div>
        <div className="bg-card rounded-lg p-3 border border-border text-center">
          <p className={`text-lg font-bold ${productsNoSensorial.length > 0 ? "text-yellow-500" : "text-accent"}`}>{productsNoSensorial.length}</p>
          <p className="text-[10px] text-muted-foreground">Sem copy sensorial</p>
        </div>
        <div className="bg-card rounded-lg p-3 border border-border text-center">
          <p className={`text-lg font-bold ${productsNoTags.length > 0 ? "text-yellow-500" : "text-accent"}`}>{productsNoTags.length}</p>
          <p className="text-[10px] text-muted-foreground">Sem tags</p>
        </div>
      </div>

      {/* Bulk Action */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Otimização em Lote
        </h3>
        <p className="text-xs text-muted-foreground">
          A IA irá gerar automaticamente descrições sensoriais, copy de venda e tags SEO para até 10 produtos que estejam sem conteúdo.
        </p>
        <Button onClick={handleBulkSEO} disabled={bulkRunning} className="bg-primary text-primary-foreground text-xs gap-2">
          {bulkRunning ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Processando...</> : <><Wand2 className="w-3.5 h-3.5" />Otimizar Produtos sem Conteúdo</>}
        </Button>

        {results && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs p-2 bg-muted rounded-lg">
                {r.status === "updated" ? <CheckCircle className="w-3.5 h-3.5 text-accent flex-shrink-0" /> :
                 r.status === "skipped" ? <Info className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> :
                 <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />}
                <span className="truncate">{r.name}</span>
                <Badge variant="secondary" className="text-[8px] ml-auto flex-shrink-0">
                  {r.status === "updated" ? `✓ ${r.fields?.join(", ")}` : r.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Individual Product Generator */}
      <div className="bg-card rounded-xl p-4 border border-border space-y-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-primary" />
          Gerar para Produto Específico
        </h3>
        <p className="text-xs text-muted-foreground">Selecione um produto para gerar e visualizar o conteúdo antes de aplicar.</p>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {products?.map((p) => (
            <div key={p.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
              <div className="w-8 h-8 rounded bg-background overflow-hidden flex-shrink-0">
                {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
              </div>
              <span className="text-xs truncate flex-1">{p.name}</span>
              <Button
                size="sm" variant="ghost"
                onClick={() => handleGeneratePreview(p.id)}
                disabled={generatingId === p.id}
                className="text-xs h-7 gap-1"
              >
                {generatingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                Gerar
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      {preview && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-5 border-2 border-primary/30 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
            <Eye className="w-4 h-4" />
            Preview do Conteúdo Gerado
          </h3>
          
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold text-muted-foreground">Descrição</Label>
              <p className="text-xs text-foreground leading-relaxed mt-1 bg-muted p-3 rounded-lg">{preview.description}</p>
            </div>
            <div>
              <Label className="text-xs font-bold text-muted-foreground">Descrição Sensorial</Label>
              <p className="text-xs text-foreground leading-relaxed mt-1 bg-muted p-3 rounded-lg">{preview.sensorial_description}</p>
            </div>
            {preview.how_to_use && (
              <div>
                <Label className="text-xs font-bold text-muted-foreground">Como Usar</Label>
                <p className="text-xs text-foreground leading-relaxed mt-1 bg-muted p-3 rounded-lg whitespace-pre-line">{preview.how_to_use}</p>
              </div>
            )}
            {preview.seo_title && (
              <div>
                <Label className="text-xs font-bold text-muted-foreground">Título SEO</Label>
                <p className="text-xs text-foreground mt-1 bg-muted p-3 rounded-lg">{preview.seo_title}</p>
              </div>
            )}
            {preview.meta_description && (
              <div>
                <Label className="text-xs font-bold text-muted-foreground">Meta Description</Label>
                <p className="text-xs text-foreground mt-1 bg-muted p-3 rounded-lg">{preview.meta_description}</p>
              </div>
            )}
            {preview.tags && (
              <div>
                <Label className="text-xs font-bold text-muted-foreground">Tags SEO</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {preview.tags.map((tag: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleApplyPreview} className="bg-primary text-primary-foreground text-xs gap-1 flex-1">
              <CheckCircle className="w-3.5 h-3.5" />Aplicar ao Produto
            </Button>
            <Button onClick={() => setPreview(null)} variant="outline" className="text-xs">Descartar</Button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// OrdersTab moved to OrdersManagementTab component
// ========== Coupons ==========
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

// ========== Reviews ==========
const ReviewsTab = () => {
  const queryClient = useQueryClient();
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reviews").select("*, products(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleApprove = async (id: string, approved: boolean) => {
    await supabase.from("reviews").update({ is_approved: !approved }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    toast.success(approved ? "Review ocultada" : "Review aprovada");
  };

  const handleDelete = async (id: string) => {
    await supabase.from("reviews").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    toast.success("Review removida");
  };

  return (
    <div className="space-y-3">
      {isLoading ? <div className="text-center py-4 text-xs text-muted-foreground">Carregando...</div> : reviews?.length === 0 ? <p className="text-center text-xs text-muted-foreground py-4">Nenhuma review</p> : reviews?.map((r) => (
        <div key={r.id} className="bg-card rounded-xl p-4 border border-border space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">{(r.products as any)?.name}</p>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < r.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />)}
            </div>
          </div>
          {r.comment && <p className="text-xs text-muted-foreground">{r.comment}</p>}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => handleApprove(r.id, !!r.is_approved)} className="text-xs gap-1">
              {r.is_approved ? <><EyeOff className="w-3 h-3" />Ocultar</> : <><Eye className="w-3 h-3" />Aprovar</>}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)} className="text-xs text-destructive gap-1"><Trash2 className="w-3 h-3" />Remover</Button>
          </div>
        </div>
      ))}
    </div>
  );
};

// ========== Influencers ==========
const InfluencersTab = () => {
  const { data: influencers, isLoading } = useInfluencers();
  const createInfluencer = useCreateInfluencer();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ user_id: "", name: "", instagram: "", commission_percent: "10" });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch coupons linked to influencers
  const { data: allCoupons } = useQuery({
    queryKey: ["admin-coupons-influencers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").not("influencer_id", "is", null);
      if (error) throw error;
      return data;
    },
  });

  // Fetch orders with coupon codes for commission tracking
  const { data: ordersWithCoupons } = useQuery({
    queryKey: ["admin-orders-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id, total, discount, coupon_code, created_at, status").not("coupon_code", "is", null);
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => { setForm({ user_id: "", name: "", instagram: "", commission_percent: "10" }); setEditingId(null); setShowForm(false); };

  const openEdit = (inf: any) => {
    setForm({ user_id: inf.user_id, name: inf.name, instagram: inf.instagram || "", commission_percent: String(inf.commission_percent) });
    setEditingId(inf.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error("Nome é obrigatório"); return; }
    if (editingId) {
      const { error } = await supabase.from("influencers").update({
        name: form.name, instagram: form.instagram || null,
        commission_percent: parseFloat(form.commission_percent),
      }).eq("id", editingId);
      if (error) toast.error(error.message);
      else { toast.success("Influenciadora atualizada!"); queryClient.invalidateQueries({ queryKey: ["influencers"] }); resetForm(); }
    } else {
      if (!form.user_id) { toast.error("User ID é obrigatório"); return; }
      createInfluencer.mutate({
        user_id: form.user_id, name: form.name,
        instagram: form.instagram || undefined,
        commission_percent: parseFloat(form.commission_percent),
      }, { onSuccess: resetForm });
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("influencers").update({ is_active: !active }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["influencers"] });
    toast.success(active ? "Desativada" : "Ativada");
  };

  const handleCreateCoupon = async (influencer: any) => {
    const baseName = influencer.name.split(" ")[0].toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "").slice(0, 8);
    const code = baseName + Math.floor(Math.random() * 100);
    const { error } = await supabase.from("coupons").insert({
      code, description: `Cupom exclusivo da influenciadora ${influencer.name}`,
      discount_type: "percentage", discount_value: 10,
      min_order_value: 0, influencer_id: influencer.id,
    } as any);
    if (error) toast.error(error.message);
    else {
      toast.success(`Cupom ${code} criado e vinculado!`);
      queryClient.invalidateQueries({ queryKey: ["admin-coupons-influencers"] });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir "${name}"? Cupons vinculados serão desvinculados.`)) return;
    const { error } = await supabase.from("influencers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Excluída"); queryClient.invalidateQueries({ queryKey: ["influencers"] }); }
  };

  // Calculate influencer stats
  const getInfluencerStats = (infId: string) => {
    const infCoupons = allCoupons?.filter(c => (c as any).influencer_id === infId) || [];
    const couponCodes = infCoupons.map(c => c.code);
    const infOrders = ordersWithCoupons?.filter(o => o.coupon_code && couponCodes.includes(o.coupon_code)) || [];
    const totalRevenue = infOrders.reduce((s, o) => s + Number(o.total), 0);
    const totalDiscount = infOrders.reduce((s, o) => s + Number(o.discount || 0), 0);
    const orderCount = infOrders.length;
    return { infCoupons, infOrders, totalRevenue, totalDiscount, orderCount, couponCodes };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }} size="sm" className="bg-primary text-primary-foreground text-xs gap-1"><Plus className="w-3 h-3" />{showForm && !editingId ? "Fechar" : "Nova Influenciadora"}</Button>
        <Badge variant="secondary" className="text-[10px]">{influencers?.length || 0} cadastradas</Badge>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl p-4 border border-border space-y-3">
          <p className="text-xs font-bold">{editingId ? "Editar" : "Nova"} Influenciadora</p>
          <div className="grid grid-cols-2 gap-2">
            {!editingId && <div className="col-span-2 space-y-1"><Label className="text-xs">User ID (UUID)</Label><Input value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" placeholder="ID do usuário cadastrado" /></div>}
            <div className="space-y-1"><Label className="text-xs">Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" /></div>
            <div className="space-y-1"><Label className="text-xs">Instagram</Label><Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" placeholder="@usuario" /></div>
            <div className="space-y-1"><Label className="text-xs">Comissão (%)</Label><Input type="number" value={form.commission_percent} onChange={(e) => setForm({ ...form, commission_percent: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" /></div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={createInfluencer.isPending} size="sm" className="text-xs bg-primary text-primary-foreground">{editingId ? "Salvar" : "Cadastrar"}</Button>
            {editingId && <Button onClick={resetForm} variant="outline" size="sm" className="text-xs">Cancelar</Button>}
          </div>
        </div>
      )}

      {isLoading ? <div className="text-center py-4 text-xs text-muted-foreground">Carregando...</div> : influencers?.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-4">Nenhuma influenciadora cadastrada</p>
      ) : influencers?.map((inf) => {
        const stats = getInfluencerStats(inf.id);
        const commissionValue = stats.totalRevenue * (inf.commission_percent / 100);
        const profit = stats.totalRevenue - stats.totalDiscount - commissionValue;
        const isExpanded = expandedId === inf.id;

        return (
          <div key={inf.id} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : inf.id)}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-bold">{inf.name}</p>
                  <p className="text-[10px] text-muted-foreground">{inf.instagram || "Sem Instagram"} • {inf.commission_percent}% comissão</p>
                </div>
                <Badge variant={inf.is_active ? "default" : "secondary"} className="text-[10px]">{inf.is_active ? "Ativa" : "Inativa"}</Badge>
              </div>

              {/* Stats summary */}
              <div className="grid grid-cols-4 gap-2 mt-3">
                <div className="bg-muted rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground">Pedidos</p>
                  <p className="text-xs font-bold">{stats.orderCount}</p>
                </div>
                <div className="bg-muted rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground">Receita</p>
                  <p className="text-xs font-bold text-accent">R$ {stats.totalRevenue.toFixed(0)}</p>
                </div>
                <div className="bg-muted rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground">Comissão</p>
                  <p className="text-xs font-bold text-primary">R$ {commissionValue.toFixed(2).replace(".", ",")}</p>
                </div>
                <div className="bg-muted rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground">Lucro</p>
                  <p className={`text-xs font-bold ${profit >= 0 ? "text-accent" : "text-destructive"}`}>R$ {profit.toFixed(0)}</p>
                </div>
              </div>

              {/* Cupons */}
              {stats.infCoupons.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {stats.infCoupons.map(c => (
                    <Badge key={c.id} variant="secondary" className="text-[9px] gap-1">
                      <Tag className="w-2.5 h-2.5" />{c.code} ({c.current_uses || 0} usos)
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Expanded details */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-1 border-t border-border space-y-3">
                {/* Expense breakdown */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Detalhamento</p>
                  <div className="text-xs space-y-0.5">
                    <div className="flex justify-between"><span className="text-muted-foreground">Receita total</span><span>R$ {stats.totalRevenue.toFixed(2).replace(".", ",")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Descontos dados</span><span className="text-destructive">-R$ {stats.totalDiscount.toFixed(2).replace(".", ",")}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Comissão ({inf.commission_percent}%)</span><span className="text-destructive">-R$ {commissionValue.toFixed(2).replace(".", ",")}</span></div>
                    <div className="flex justify-between border-t border-border pt-1 font-bold"><span>Lucro líquido</span><span className={profit >= 0 ? "text-accent" : "text-destructive"}>R$ {profit.toFixed(2).replace(".", ",")}</span></div>
                  </div>
                </div>

                {/* Recent orders */}
                {stats.infOrders.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Últimos pedidos</p>
                    {stats.infOrders.slice(0, 5).map(o => (
                      <div key={o.id} className="flex items-center justify-between text-[10px] bg-muted rounded-lg px-2 py-1.5">
                        <span className="text-muted-foreground">#{o.id.slice(0, 8)} • {new Date(o.created_at).toLocaleDateString("pt-BR")}</span>
                        <span className="font-medium">R$ {Number(o.total).toFixed(2).replace(".", ",")}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => openEdit(inf)} className="text-xs h-7 gap-1"><Pencil className="w-3 h-3" />Editar</Button>
                  <Button variant="outline" size="sm" onClick={() => handleToggle(inf.id, !!inf.is_active)} className="text-xs h-7 gap-1">
                    {inf.is_active ? <><EyeOff className="w-3 h-3" />Desativar</> : <><Eye className="w-3 h-3" />Ativar</>}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCreateCoupon(inf)} className="text-xs h-7 gap-1"><Tag className="w-3 h-3" />Novo Cupom</Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(inf.id, inf.name)} className="text-xs h-7 gap-1 text-destructive hover:text-destructive"><Trash2 className="w-3 h-3" />Excluir</Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// AddProductTab removed — now part of AdminProductsPanel

// ========== Categories ==========
const CategoriesTab = () => {
  const queryClient = useQueryClient();
  const { data: categories, isLoading } = useCategories();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", image_url: "", sort_order: "0", parent_id: "" });

  const resetForm = () => {
    setForm({ name: "", slug: "", description: "", image_url: "", sort_order: "0", parent_id: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (cat: any) => {
    setForm({
      name: cat.name, slug: cat.slug, description: cat.description || "",
      image_url: cat.image_url || "", sort_order: String(cat.sort_order || 0),
      parent_id: cat.parent_id || "",
    });
    setEditingId(cat.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) { toast.error("Nome e slug são obrigatórios"); return; }
    const payload = {
      name: form.name,
      slug: form.slug.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      description: form.description || null,
      image_url: form.image_url || null,
      sort_order: parseInt(form.sort_order) || 0,
      parent_id: form.parent_id || null,
    };

    const { error } = editingId
      ? await supabase.from("categories").update(payload).eq("id", editingId)
      : await supabase.from("categories").insert(payload);

    if (error) toast.error(error.message);
    else {
      toast.success(editingId ? "Categoria atualizada!" : "Categoria criada!");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      resetForm();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir a categoria "${name}"?`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Categoria excluída!");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    }
  };

  const generateSlug = (name: string) => name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  return (
    <div className="space-y-3">
      <Button onClick={() => { resetForm(); setShowForm(!showForm); }} size="sm" className="bg-primary text-primary-foreground text-xs gap-1">
        <Plus className="w-3 h-3" />{showForm ? "Cancelar" : "Nova Categoria"}
      </Button>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl p-4 border border-border space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Nome *</Label>
              <Input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value, slug: editingId ? form.slug : generateSlug(e.target.value) }); }} className="bg-muted border-none min-h-[36px] text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Slug *</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ordem</Label>
              <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria pai</Label>
              <Select value={form.parent_id} onValueChange={(v) => setForm({ ...form, parent_id: v === "none" ? "" : v })}>
                <SelectTrigger className="bg-muted border-none min-h-[36px] text-xs"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {categories?.filter((c) => c.id !== editingId).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">URL da Imagem</Label>
              <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="bg-muted border-none min-h-[36px] text-xs" />
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" />
            </div>
          </div>
          <Button onClick={handleSave} size="sm" className="text-xs bg-primary text-primary-foreground">
            {editingId ? "Atualizar" : "Criar"} Categoria
          </Button>
        </motion.div>
      )}

      {isLoading ? (
        <div className="text-center py-4 text-xs text-muted-foreground">Carregando...</div>
      ) : !categories?.length ? (
        <p className="text-center text-xs text-muted-foreground py-4">Nenhuma categoria</p>
      ) : (
        categories.map((cat) => (
          <motion.div key={cat.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
            {cat.image_url ? (
              <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{cat.name}</p>
              <p className="text-[10px] text-muted-foreground">/{cat.slug} • Ordem: {cat.sort_order}</p>
              {cat.description && <p className="text-[10px] text-muted-foreground truncate">{cat.description}</p>}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => handleEdit(cat)} className="h-8 w-8 p-0">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(cat.id, cat.name)} className="h-8 w-8 p-0 text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
};

// ========== SEO ==========
const SEOTab = () => {
  const [generating, setGenerating] = useState(false);
  const { data: reports, isLoading, refetch } = useQuery({
    queryKey: ["seo-reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("seo_reports").select("*").order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data;
    },
  });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-report");
      if (error) throw error;
      toast.success("Relatório SEO gerado!");
      refetch();
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar relatório");
    } finally {
      setGenerating(false);
    }
  };

  const latest = reports?.[0];
  const report = latest?.report as any;

  const severityIcon = (sev: string) => {
    if (sev === "error") return <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />;
    if (sev === "warn") return <Info className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />;
    return <CheckCircle className="w-3.5 h-3.5 text-accent flex-shrink-0" />;
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-accent";
    if (score >= 50) return "text-yellow-500";
    return "text-destructive";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Relatório SEO</h2>
        <Button onClick={handleGenerate} disabled={generating} size="sm" className="bg-primary text-primary-foreground text-xs gap-1 press-scale">
          <Search className="w-3 h-3" />
          {generating ? "Gerando..." : "Gerar Agora"}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
      ) : !latest ? (
        <div className="bg-card rounded-xl p-6 border border-border text-center">
          <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum relatório encontrado. Clique em "Gerar Agora" para criar o primeiro.</p>
        </div>
      ) : (
        <>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-xl p-5 border border-border text-center">
            <p className="text-xs text-muted-foreground mb-1">Score SEO</p>
            <p className={`text-4xl font-bold ${scoreColor(latest.score || 0)}`}>{latest.score}/100</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Gerado em {new Date(latest.created_at).toLocaleString("pt-BR")}
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Produtos ativos", value: latest.total_products },
              { label: "Sem descrição", value: latest.products_without_description, bad: true },
              { label: "Sem imagens", value: latest.products_without_images, bad: true },
              { label: "URLs no sitemap", value: latest.sitemap_urls },
              { label: "Categorias", value: latest.total_categories },
            ].map((s, i) => (
              <div key={i} className="bg-card rounded-lg p-3 border border-border">
                <p className={`text-lg font-bold ${s.bad && s.value > 0 ? "text-destructive" : "text-foreground"}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {report?.issues?.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-foreground">Problemas encontrados ({report.issues.length})</h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {report.issues.map((issue: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 bg-card rounded-lg p-3 border border-border">
                    {severityIcon(issue.severity)}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">{issue.message}</p>
                      {issue.product && <p className="text-[10px] text-muted-foreground truncate">{issue.product}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report?.issues?.length === 0 && (
            <div className="bg-card rounded-xl p-4 border border-accent/30 text-center">
              <CheckCircle className="w-6 h-6 text-accent mx-auto mb-1" />
              <p className="text-sm font-medium text-accent">Nenhum problema de SEO encontrado!</p>
            </div>
          )}

          {reports && reports.length > 1 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-foreground">Histórico</h3>
              {reports.slice(1).map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-card rounded-lg p-3 border border-border">
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</p>
                  <p className={`text-sm font-bold ${scoreColor(r.score || 0)}`}>{r.score}/100</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ========== Leads ==========
const LeadsTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "name">("recent");

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["admin-orders-leads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("user_id, total, status");
      if (error) throw error;
      return data;
    },
  });

  const getUserOrderStats = (userId: string) => {
    const userOrders = orders?.filter(o => o.user_id === userId) || [];
    const totalSpent = userOrders.reduce((s, o) => s + Number(o.total), 0);
    return { count: userOrders.length, totalSpent };
  };

  const filtered = profiles?.filter(p => {
    const q = searchQuery.toLowerCase();
    return !q || (p.full_name || "").toLowerCase().includes(q) || (p.phone || "").includes(q);
  }).sort((a, b) => {
    if (sortBy === "name") return (a.full_name || "").localeCompare(b.full_name || "");
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }) || [];

  const getWhatsAppLink = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const msg = encodeURIComponent(`Olá ${name}! 😊 Tudo bem? Aqui é da Michelle Make Store. Vimos que você se cadastrou conosco e gostaríamos de te ajudar a encontrar os melhores produtos de beleza! 💄✨`);
    return `https://wa.me/${fullPhone}?text=${msg}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="text-[10px]">{filtered.length} leads</Badge>
        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger className="h-7 text-[10px] w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recentes</SelectItem>
            <SelectItem value="name">Nome</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar por nome ou telefone..." className="pl-9 bg-muted border-none min-h-[36px] text-xs" />
      </div>

      {isLoading ? <div className="text-center py-4 text-xs text-muted-foreground">Carregando...</div> :
        filtered.length === 0 ? <p className="text-center text-xs text-muted-foreground py-4">Nenhum lead encontrado</p> :
        filtered.map(p => {
          const stats = getUserOrderStats(p.user_id);
          const hasPhone = !!p.phone;
          const hasBirthday = !!(p as any).birthday;
          return (
            <div key={p.id} className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-bold">{p.full_name || "Sem nome"}</p>
                  <p className="text-[10px] text-muted-foreground">{p.phone || "Sem telefone"} • Cadastro: {new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex gap-1">
                  {hasPhone && (
                    <a href={getWhatsAppLink(p.phone!, p.full_name || "Cliente")} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="text-[10px] h-7 gap-1 text-accent hover:text-accent"><MessageCircle className="w-3 h-3" />WhatsApp</Button>
                    </a>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div className="bg-muted rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground">Pedidos</p>
                  <p className="text-xs font-bold">{stats.count}</p>
                </div>
                <div className="bg-muted rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground">Total gasto</p>
                  <p className="text-xs font-bold">R$ {stats.totalSpent.toFixed(0)}</p>
                </div>
                <div className="bg-muted rounded-lg p-2 text-center">
                  <p className="text-[9px] text-muted-foreground">Aniversário</p>
                  <p className="text-xs font-bold">{hasBirthday ? new Date((p as any).birthday + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {stats.count === 0 && <Badge variant="outline" className="text-[9px]">Nunca comprou</Badge>}
                {stats.count > 0 && <Badge className="text-[9px] bg-accent text-accent-foreground">Cliente ativo</Badge>}
                {hasBirthday && <Badge variant="secondary" className="text-[9px] gap-0.5"><Cake className="w-2.5 h-2.5" />Aniversário cadastrado</Badge>}
                {!hasPhone && <Badge variant="destructive" className="text-[9px]">Sem telefone</Badge>}
              </div>
            </div>
          );
        })
      }
    </div>
  );
};

// ========== Birthdays ==========
const BirthdaysTab = () => {
  const [filter, setFilter] = useState<"this-month" | "this-week" | "today" | "all">("this-month");

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-birthdays"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").not("birthday" as any, "is", null);
      if (error) throw error;
      return data;
    },
  });

  const now = new Date();
  const today = now.getDate();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const getNextBirthday = (bday: string) => {
    const d = new Date(bday + "T12:00:00");
    const next = new Date(thisYear, d.getMonth(), d.getDate());
    if (next < now) next.setFullYear(thisYear + 1);
    return next;
  };

  const daysUntil = (bday: string) => {
    const next = getNextBirthday(bday);
    return Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const filtered = profiles?.filter(p => {
    const bday = (p as any).birthday;
    if (!bday) return false;
    const d = new Date(bday + "T12:00:00");
    const bMonth = d.getMonth();
    const bDay = d.getDate();
    if (filter === "today") return bMonth === thisMonth && bDay === today;
    if (filter === "this-week") return daysUntil(bday) <= 7;
    if (filter === "this-month") return bMonth === thisMonth;
    return true;
  }).sort((a, b) => daysUntil((a as any).birthday) - daysUntil((b as any).birthday)) || [];

  const getWhatsAppBirthdayLink = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const msg = encodeURIComponent(`🎂 Feliz Aniversário, ${name}! 🎉\n\nA Michelle Make Store preparou um presente especial pra você: 10% de desconto em qualquer compra + um BRINDE exclusivo! 🎁💄\n\nUse o cupom: ANIVER10\n\nVálido por 7 dias. Aproveite! ✨\n\nhttps://michellemakestore.com.br`);
    return `https://wa.me/${fullPhone}?text=${msg}`;
  };

  const isToday = (bday: string) => {
    const d = new Date(bday + "T12:00:00");
    return d.getMonth() === thisMonth && d.getDate() === today;
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 flex-wrap">
        {[
          { id: "today" as const, label: "Hoje" },
          { id: "this-week" as const, label: "Esta semana" },
          { id: "this-month" as const, label: "Este mês" },
          { id: "all" as const, label: "Todos" },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === f.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {f.label}
          </button>
        ))}
        <Badge variant="secondary" className="text-[10px]">{filtered.length} aniversariantes</Badge>
      </div>

      {/* Info card about the birthday coupon */}
      <div className="bg-primary/5 rounded-xl p-3 border border-primary/20">
        <div className="flex items-start gap-2">
          <Gift className="w-4 h-4 text-primary mt-0.5" />
          <div>
            <p className="text-xs font-bold">Cupom de Aniversário</p>
            <p className="text-[10px] text-muted-foreground">Ao clicar em "Enviar Parabéns", uma mensagem automática com cupom ANIVER10 (10% de desconto) + brinde será enviada pelo WhatsApp.</p>
          </div>
        </div>
      </div>

      {isLoading ? <div className="text-center py-4 text-xs text-muted-foreground">Carregando...</div> :
        filtered.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-4">Nenhum aniversariante no período selecionado</p>
        ) :
        filtered.map(p => {
          const bday = (p as any).birthday;
          const d = new Date(bday + "T12:00:00");
          const days = daysUntil(bday);
          const isBdayToday = isToday(bday);
          const hasPhone = !!p.phone;

          return (
            <div key={p.id} className={`bg-card rounded-xl p-4 border ${isBdayToday ? "border-primary/50 bg-primary/5" : "border-border"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold">{p.full_name || "Sem nome"}</p>
                    {isBdayToday && <Badge className="text-[9px] bg-primary text-primary-foreground gap-0.5"><Cake className="w-2.5 h-2.5" />Hoje!</Badge>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    📅 {d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                    {!isBdayToday && ` • em ${days} dia${days !== 1 ? "s" : ""}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{p.phone || "Sem telefone"}</p>
                </div>
                {hasPhone && (
                  <a href={getWhatsAppBirthdayLink(p.phone!, p.full_name || "Cliente")} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" className={`text-[10px] h-7 gap-1 ${isBdayToday ? "bg-primary text-primary-foreground" : ""}`}>
                      <MessageCircle className="w-3 h-3" />{isBdayToday ? "🎂 Enviar Parabéns" : "Enviar Mensagem"}
                    </Button>
                  </a>
                )}
              </div>
            </div>
          );
        })
      }
    </div>
  );
};

export default Admin;
