import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, TrendingUp, ShoppingCart, Box, Package, Users, AlertTriangle, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { useProducts } from "@/hooks/useProducts";
import { useAllOrders } from "@/hooks/useOrders";
import { useInfluencers } from "@/hooks/useInfluencers";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar, type AdminTab } from "@/components/admin/AdminSidebar";

// Tab components
import AdminProductsPanel from "@/components/admin/AdminProductsPanel";
import OrdersManagementTab from "@/components/admin/OrdersManagementTab";
import FinanceiroTab from "@/components/admin/FinanceiroTab";
import ComercialTab from "@/components/admin/ComercialTab";
import OperacionalTab from "@/components/admin/OperacionalTab";
import MarketingTab from "@/components/admin/MarketingTab";
import TrackingPixelsTab from "@/components/admin/TrackingPixelsTab";
import WhatsAppTemplatesTab from "@/components/admin/WhatsAppTemplatesTab";
import WhatsAppCampaignsTab from "@/components/admin/WhatsAppCampaignsTab";
import StockManagementTab from "@/components/admin/StockManagementTab";
import SalesIntelligenceTab from "@/components/admin/SalesIntelligenceTab";
import CRMTab from "@/components/admin/CRMTab";
import LogisticsTab from "@/components/admin/LogisticsTab";
import MarketingConversionTab from "@/components/admin/MarketingConversionTab";
import SEOContentTab from "@/components/admin/SEOContentTab";
import CatalogDriveTab from "@/components/admin/CatalogDriveTab";
import HomepageSectionsTab from "@/components/admin/HomepageSectionsTab";
import MarketplacesTab from "@/components/admin/MarketplacesTab";
import CouponsTab from "@/components/admin/CouponsTab";
import ReviewsTab from "@/components/admin/ReviewsTab";
import CategoriesTab from "@/components/admin/CategoriesTab";
import InfluencersTab from "@/components/admin/InfluencersTab";
import SEOReportTab from "@/components/admin/SEOReportTab";
import AIContentTab from "@/components/admin/AIContentTab";
import { LeadsTab, BirthdaysTab } from "@/components/admin/LeadsBirthdaysTab";
import NewsletterTab from "@/components/admin/NewsletterTab";
import MonthlyRevenueReportTab from "@/components/admin/MonthlyRevenueReportTab";
import CollectionsTab from "@/components/admin/CollectionsTab";

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [tab, setTab] = useState<AdminTab>("dashboard");

  // Data for badges
  const { data: orders } = useAllOrders();
  const { data: products } = useProducts({});
  const pendingOrders = orders?.filter((o) => o.status === "pending").length || 0;

  // Low stock badge (stock <= 5)
  const lowStockCount = products?.filter((p) => p.stock <= 5 && p.is_active).length || 0;

  // Pending reviews badge
  const { data: pendingReviewsCount } = useQuery({
    queryKey: ["admin-pending-reviews-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("reviews")
        .select("*", { count: "exact", head: true })
        .eq("is_approved", false);
      if (error) throw error;
      return count || 0;
    },
  });

  // New leads (last 7 days)
  const { data: newLeadsCount } = useQuery({
    queryKey: ["admin-new-leads-count"],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo);
      if (error) throw error;
      return count || 0;
    },
  });

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

  const badges: Partial<Record<AdminTab, number>> = {};
  if (pendingOrders > 0) badges.orders = pendingOrders;
  if (lowStockCount > 0) badges.stock = lowStockCount;
  if (pendingReviewsCount && pendingReviewsCount > 0) badges.reviews = pendingReviewsCount;
  if (newLeadsCount && newLeadsCount > 0) badges.leads = newLeadsCount;

  const renderTab = () => {
    switch (tab) {
      case "dashboard": return <DashboardTab />;
      case "financeiro": return <FinanceiroTab />;
      case "comercial": return <ComercialTab />;
      case "operacional": return <OperacionalTab />;
      case "marketing": return <MarketingTab />;
      case "products": return <AdminProductsPanel />;
      case "stock": return <StockManagementTab />;
      case "sales-intelligence": return <SalesIntelligenceTab />;
      case "crm": return <CRMTab />;
      case "logistics": return <LogisticsTab />;
      case "marketing-conversion": return <MarketingConversionTab />;
      case "seo-content": return <SEOContentTab />;
      case "orders": return <OrdersManagementTab />;
      case "coupons": return <CouponsTab />;
      case "reviews": return <ReviewsTab />;
      case "influencers": return <InfluencersTab />;
      case "categories": return <CategoriesTab />;
      case "leads": return <LeadsTab />;
      case "newsletter": return <NewsletterTab />;
      case "birthdays": return <BirthdaysTab />;
      case "seo": return <SEOReportTab />;
      case "pixels": return <TrackingPixelsTab />;
      case "whatsapp": return <WhatsAppTemplatesTab />;
      case "whatsapp-campaigns": return <WhatsAppCampaignsTab />;
      case "ai-content": return <AIContentTab />;
      case "homepage-sections": return <HomepageSectionsTab />;
      case "catalog-drive": return <CatalogDriveTab />;
      case "marketplaces": return <MarketplacesTab />;
      case "revenue-report": return <MonthlyRevenueReportTab />;
      default: return <DashboardTab />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar activeTab={tab} onTabChange={setTab} badges={badges} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <header className="h-14 flex items-center gap-3 border-b border-border px-4 bg-background sticky top-0 z-10">
            <SidebarTrigger />
            <button onClick={() => navigate("/")} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-sm font-display font-bold">Painel Admin</h1>
          </header>

          {/* Content */}
          <main className="flex-1 p-4 md:p-6 overflow-y-auto">
            <div className="max-w-7xl">
              {renderTab()}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

// ========== Dashboard ==========
const DashboardTab = () => {
  const { data: products } = useProducts({});
  const { data: orders } = useAllOrders();
  const { data: influencers } = useInfluencers();

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

  const activeOrders = orders?.filter(o => o.status !== "cancelled" && o.status !== "refunded") || [];
  const totalRevenue = activeOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const totalOrders = orders?.length || 0;
  const totalProducts = products?.length || 0;
  const pendingOrders = orders?.filter((o) => o.status === "pending").length || 0;
  const activeInfluencers = influencers?.filter((i) => i.is_active).length || 0;
  const productsNoDesc = products?.filter(p => !p.description || p.description.length < 30).length || 0;

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

  const buyerIds = new Set(orders?.map(o => o.user_id) || []);
  const activeBuyers = buyerIds.size;
  const conversionRate = totalUsers > 0 ? ((activeBuyers / totalUsers) * 100).toFixed(1) : "0";

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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-4 border bg-accent/5 border-accent/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-accent/15">
            <CheckCircle className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Mercado Pago</p>
              <Badge variant="secondary" className="text-[9px] bg-accent/15 text-accent">✓ Ativo</Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">Checkout transparente • PIX, Cartão e Boleto</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-card rounded-xl p-4 border border-border">
            <stat.icon className={`w-5 h-5 mb-2 ${(stat as any).bad ? "text-destructive" : "text-primary"}`} />
            <p className={`text-lg font-bold ${(stat as any).bad ? "text-destructive" : ""}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-card rounded-xl p-4 border border-border space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold">Usuários & Atividade</h3>
          <Badge variant="secondary" className="text-[10px]">{totalUsers} cadastrados</Badge>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Total Usuários", value: totalUsers },
            { label: "Compradores", value: activeBuyers, cls: "text-accent" },
            { label: "Conversão", value: `${conversionRate}%`, cls: "text-primary" },
          ].map(s => (
            <div key={s.label} className="bg-muted rounded-lg p-3 text-center">
              <p className={`text-lg font-bold ${s.cls || ""}`}>{s.value}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-[9px] text-muted-foreground uppercase font-bold">Últimos 7 dias</p>
            <p className="text-sm font-bold">{recentSignups7d} <span className="text-[10px] text-muted-foreground font-normal">novos</span></p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-[9px] text-muted-foreground uppercase font-bold">Últimos 30 dias</p>
            <p className="text-sm font-bold">{recentSignups30d} <span className="text-[10px] text-muted-foreground font-normal">novos</span></p>
          </div>
        </div>

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

export default Admin;
