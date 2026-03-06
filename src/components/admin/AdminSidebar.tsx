import { useLocation } from "react-router-dom";
import {
  TrendingUp, DollarSign, Target, Settings2, Megaphone, BarChart3, Heart, Truck, Gift, Globe2,
  Box, Package, FolderOpen, ShoppingCart, Tag, Star, Users, UserPlus, Cake, Code, MessageCircle,
  Search, Wand2, LayoutDashboard, Store,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

export type AdminTab =
  | "dashboard" | "financeiro" | "comercial" | "operacional" | "marketing"
  | "sales-intelligence" | "crm" | "logistics" | "marketing-conversion" | "seo-content"
  | "products" | "stock" | "categories" | "homepage-sections" | "catalog-drive"
  | "orders" | "coupons" | "reviews"
  | "influencers" | "leads" | "birthdays"
  | "pixels" | "whatsapp" | "seo" | "ai-content"
  | "marketplaces";

interface SidebarItem {
  id: AdminTab;
  label: string;
  icon: any;
  badge?: number;
}

interface SidebarSection {
  label: string;
  emoji: string;
  items: SidebarItem[];
}

const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    label: "Painel",
    emoji: "📊",
    items: [
      { id: "dashboard", label: "Dashboard", icon: TrendingUp },
      { id: "sales-intelligence", label: "Inteligência", icon: BarChart3 },
    ],
  },
  {
    label: "Financeiro",
    emoji: "💰",
    items: [
      { id: "financeiro", label: "Financeiro", icon: DollarSign },
      { id: "comercial", label: "Comercial", icon: Target },
    ],
  },
  {
    label: "Catálogo",
    emoji: "📦",
    items: [
      { id: "products", label: "Produtos", icon: Box },
      { id: "categories", label: "Categorias", icon: FolderOpen },
      { id: "stock", label: "Estoque", icon: Package },
      { id: "homepage-sections", label: "Página Inicial", icon: LayoutDashboard },
      { id: "catalog-drive", label: "Catálogo Drive", icon: FolderOpen },
    ],
  },
  {
    label: "Vendas",
    emoji: "🛒",
    items: [
      { id: "orders", label: "Pedidos", icon: ShoppingCart },
      { id: "coupons", label: "Cupons", icon: Tag },
      { id: "marketing-conversion", label: "Promoções", icon: Gift },
    ],
  },
  {
    label: "Clientes",
    emoji: "👥",
    items: [
      { id: "crm", label: "CRM", icon: Heart },
      { id: "leads", label: "Leads", icon: UserPlus },
      { id: "birthdays", label: "Aniversários", icon: Cake },
      { id: "influencers", label: "Influencers", icon: Users },
      { id: "reviews", label: "Reviews", icon: Star },
    ],
  },
  {
    label: "Marketing",
    emoji: "📢",
    items: [
      { id: "marketing", label: "Marketing", icon: Megaphone },
      { id: "seo-content", label: "SEO & Blog", icon: Globe2 },
      { id: "seo", label: "Relatório SEO", icon: Search },
      { id: "pixels", label: "Pixels", icon: Code },
      { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
      { id: "ai-content", label: "IA Conteúdo", icon: Wand2 },
    ],
  },
  {
    label: "Canais",
    emoji: "🏪",
    items: [
      { id: "marketplaces", label: "Marketplaces", icon: Store },
    ],
  },
  {
    label: "Operações",
    emoji: "⚙️",
    items: [
      { id: "operacional", label: "Operacional", icon: Settings2 },
      { id: "logistics", label: "Logística", icon: Truck },
    ],
  },
];

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  badges?: Partial<Record<AdminTab, number>>;
}

export function AdminSidebar({ activeTab, onTabChange, badges = {} }: AdminSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold font-display">Admin</p>
              <p className="text-[10px] text-muted-foreground">Elle Make</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <LayoutDashboard className="w-4 h-4 text-primary" />
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="py-2">
        {SIDEBAR_SECTIONS.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-4 py-1">
              {collapsed ? section.emoji : `${section.emoji} ${section.label}`}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => {
                  const isActive = activeTab === item.id;
                  const badgeCount = badges[item.id];
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => onTabChange(item.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                          isActive
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                        tooltip={collapsed ? item.label : undefined}
                      >
                        <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{item.label}</span>
                            {badgeCount !== undefined && badgeCount > 0 && (
                              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4 min-w-[18px] flex items-center justify-center">
                                {badgeCount}
                              </Badge>
                            )}
                          </>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
