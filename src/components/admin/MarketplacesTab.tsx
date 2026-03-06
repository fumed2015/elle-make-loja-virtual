import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Store, Settings2, Package, Truck, BarChart3, AlertTriangle, CheckCircle, Info,
  ExternalLink, RefreshCw, Search, Eye, EyeOff, Copy, Loader2, ShoppingCart,
  DollarSign, TrendingUp, Globe2, ImageIcon, Tag, Box, ArrowUpRight, Plug
} from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { toast } from "sonner";

// ── Marketplace definitions ──
const MARKETPLACES = [
  {
    id: "mercadolivre",
    name: "Mercado Livre",
    color: "hsl(48, 96%, 53%)",
    bgClass: "bg-[hsl(48,96%,93%)]",
    textClass: "text-[hsl(48,96%,30%)]",
    borderClass: "border-[hsl(48,96%,75%)]",
    icon: "🟡",
    description: "Maior marketplace da América Latina",
    apiUrl: "https://developers.mercadolivre.com.br",
    features: ["Mercado Envios", "Mercado Pago integrado", "Fulfillment (Full)", "Anúncios patrocinados"],
    requiredFields: ["Título (até 60 chars)", "Categoria MLB", "Preço", "Estoque", "Imagens (até 10)", "Descrição", "Condição (novo/usado)", "Tipo de anúncio"],
  },
  {
    id: "amazon",
    name: "Amazon Brasil",
    color: "hsl(30, 100%, 50%)",
    bgClass: "bg-[hsl(30,100%,95%)]",
    textClass: "text-[hsl(30,100%,25%)]",
    borderClass: "border-[hsl(30,100%,75%)]",
    icon: "🟠",
    description: "Marketplace global com presença no Brasil",
    apiUrl: "https://developer-docs.amazon.com/sp-api",
    features: ["FBA (Fulfillment by Amazon)", "Prime elegível", "Buy Box", "A+ Content"],
    requiredFields: ["Título", "EAN/GTIN", "Marca", "Preço", "Estoque", "Imagens (principal + variações)", "Bullet points (5)", "Descrição HTML"],
  },
  {
    id: "olx",
    name: "OLX",
    color: "hsl(270, 60%, 55%)",
    bgClass: "bg-[hsl(270,60%,95%)]",
    textClass: "text-[hsl(270,60%,30%)]",
    borderClass: "border-[hsl(270,60%,75%)]",
    icon: "🟣",
    description: "Classificados e marketplace C2C/B2C",
    apiUrl: "https://developers.olx.com.br",
    features: ["Destaque de anúncios", "Chat integrado", "Localização geográfica", "Categorias regionais"],
    requiredFields: ["Título", "Categoria", "Preço", "Imagens (até 20)", "Descrição", "CEP/Localização", "Condição"],
  },
  {
    id: "shopee",
    name: "Shopee",
    color: "hsl(15, 100%, 50%)",
    bgClass: "bg-[hsl(15,100%,95%)]",
    textClass: "text-[hsl(15,100%,25%)]",
    borderClass: "border-[hsl(15,100%,75%)]",
    icon: "🔴",
    description: "Marketplace asiático em forte expansão no BR",
    apiUrl: "https://open.shopee.com",
    features: ["Frete grátis Shopee", "Shopee Ads", "Live commerce", "Shopee Coins"],
    requiredFields: ["Título", "Categoria", "Preço", "Estoque", "Imagens (até 9)", "Descrição", "Variações", "Peso e dimensões"],
  },
  {
    id: "tiktokshop",
    name: "TikTok Shop",
    color: "hsl(340, 80%, 50%)",
    bgClass: "bg-[hsl(340,80%,95%)]",
    textClass: "text-[hsl(340,80%,25%)]",
    borderClass: "border-[hsl(340,80%,75%)]",
    icon: "🎵",
    description: "Social commerce integrado ao TikTok",
    apiUrl: "https://partner.tiktokshop.com",
    features: ["Live Shopping", "Vitrine no perfil", "Affiliate Program", "TikTok Ads integrado"],
    requiredFields: ["Título", "Categoria", "Preço", "Estoque", "Imagens (até 9)", "Descrição", "Variações", "Peso e dimensões"],
  },
] as const;

type MarketplaceId = typeof MARKETPLACES[number]["id"];

interface MarketplaceConfig {
  enabled: boolean;
  apiKey: string;
  sellerId: string;
  autoSync: boolean;
  syncFrequency: "manual" | "hourly" | "daily";
  priceRule: "same" | "markup" | "custom";
  markupPercent: number;
  shippingMode: "own" | "marketplace" | "both";
  status: "disconnected" | "connected" | "error";
}

const defaultConfig: MarketplaceConfig = {
  enabled: false,
  apiKey: "",
  sellerId: "",
  autoSync: false,
  syncFrequency: "daily",
  priceRule: "same",
  markupPercent: 0,
  shippingMode: "marketplace",
  status: "disconnected",
};

// ── Main Component ──
const MarketplacesTab = () => {
  const { data: products } = useProducts({});
  const queryClient = useQueryClient();
  const [configs, setConfigs] = useState<Record<MarketplaceId, MarketplaceConfig>>(
    Object.fromEntries(MARKETPLACES.map((m) => [m.id, { ...defaultConfig }])) as any
  );
  const [initialized, setInitialized] = useState(false);
  const [selectedMp, setSelectedMp] = useState<MarketplaceId | null>(null);
  const [innerTab, setInnerTab] = useState("overview");

  // Load configs from DB
  const { data: dbConfigs, isLoading: loadingConfigs } = useQuery({
    queryKey: ["marketplace-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_configs")
        .select("*");
      if (error) throw error;
      return data || [];
    },
  });

  // Initialize local state from DB
  useEffect(() => {
    if (dbConfigs && !initialized) {
      const map = { ...configs };
      for (const row of dbConfigs) {
        const id = row.marketplace_id as MarketplaceId;
        if (map[id]) {
          map[id] = {
            enabled: row.enabled,
            apiKey: row.api_key || "",
            sellerId: row.seller_id || "",
            autoSync: row.auto_sync,
            syncFrequency: (row.sync_frequency || "daily") as any,
            priceRule: (row.price_rule || "same") as any,
            markupPercent: Number(row.markup_percent) || 0,
            shippingMode: (row.shipping_mode || "marketplace") as any,
            status: (row.status || "disconnected") as any,
          };
        }
      }
      setConfigs(map);
      setInitialized(true);
    }
  }, [dbConfigs, initialized]);

  const updateConfig = (id: MarketplaceId, patch: Partial<MarketplaceConfig>) => {
    setConfigs((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  // Save a single marketplace config to DB
  const saveConfigMutation = useMutation({
    mutationFn: async ({ mpId, config }: { mpId: MarketplaceId; config: MarketplaceConfig }) => {
      const row = {
        marketplace_id: mpId,
        enabled: config.enabled,
        seller_id: config.sellerId,
        api_key: config.apiKey,
        auto_sync: config.autoSync,
        sync_frequency: config.syncFrequency,
        price_rule: config.priceRule,
        markup_percent: config.markupPercent,
        shipping_mode: config.shippingMode,
        status: config.status,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from("marketplace_configs")
        .select("id")
        .eq("marketplace_id", mpId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("marketplace_configs")
          .update(row)
          .eq("marketplace_id", mpId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("marketplace_configs")
          .insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-configs"] });
    },
  });

  const totalProducts = products?.length || 0;
  const activeMarketplaces = Object.values(configs).filter((c) => c.enabled).length;

  // ── Mock metrics for demo ──
  const mockMetrics: Record<MarketplaceId, { listings: number; orders: number; revenue: number; views: number }> = {
    mercadolivre: { listings: 0, orders: 0, revenue: 0, views: 0 },
    amazon: { listings: 0, orders: 0, revenue: 0, views: 0 },
    olx: { listings: 0, orders: 0, revenue: 0, views: 0 },
    shopee: { listings: 0, orders: 0, revenue: 0, views: 0 },
    tiktokshop: { listings: 0, orders: 0, revenue: 0, views: 0 },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-display font-bold">Marketplaces</h2>
          <Badge variant="secondary" className="text-[10px]">{activeMarketplaces} ativos</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Gerencie suas vendas em múltiplos marketplaces brasileiros. Configure preços, estoque e envios de forma centralizada.
        </p>
      </motion.div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-card rounded-xl p-4 border border-border">
          <Globe2 className="w-5 h-5 text-primary mb-2" />
          <p className="text-lg font-bold">{activeMarketplaces}</p>
          <p className="text-[10px] text-muted-foreground">Marketplaces Ativos</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card rounded-xl p-4 border border-border">
          <Box className="w-5 h-5 text-primary mb-2" />
          <p className="text-lg font-bold">{totalProducts}</p>
          <p className="text-[10px] text-muted-foreground">Produtos Disponíveis</p>
        </motion.div>
      </div>

      {/* Marketplace List */}
      <div className="space-y-3">
        {MARKETPLACES.map((mp, i) => {
          const config = configs[mp.id];
          const metrics = mockMetrics[mp.id];
          const isSelected = selectedMp === mp.id;

          return (
            <motion.div
              key={mp.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`bg-card rounded-xl border overflow-hidden transition-all ${isSelected ? "border-primary shadow-md" : "border-border"}`}
            >
              {/* Marketplace Header */}
              <button
                onClick={() => setSelectedMp(isSelected ? null : mp.id)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${mp.bgClass} border ${mp.borderClass}`}>
                    {mp.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold">{mp.name}</p>
                      {config.enabled ? (
                        <Badge className="bg-accent/15 text-accent text-[9px] border-0">✓ Ativo</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px]">Inativo</Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{mp.description}</p>
                  </div>
                </div>
                <ArrowUpRight className={`w-4 h-4 text-muted-foreground transition-transform ${isSelected ? "rotate-90" : ""}`} />
              </button>

              {/* Expanded Panel */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                      <Tabs value={innerTab} onValueChange={setInnerTab}>
                        <TabsList className="w-full grid grid-cols-5 h-8">
                          <TabsTrigger value="overview" className="text-[10px] px-1">Visão Geral</TabsTrigger>
                          <TabsTrigger value="config" className="text-[10px] px-1">Configuração</TabsTrigger>
                          <TabsTrigger value="products" className="text-[10px] px-1">Produtos</TabsTrigger>
                          <TabsTrigger value="shipping" className="text-[10px] px-1">Envio</TabsTrigger>
                          <TabsTrigger value="reports" className="text-[10px] px-1">Relatórios</TabsTrigger>
                        </TabsList>

                        {/* Overview */}
                        <TabsContent value="overview" className="space-y-3 mt-3">
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { label: "Listagens", value: metrics.listings, icon: Package },
                              { label: "Pedidos", value: metrics.orders, icon: ShoppingCart },
                              { label: "Receita", value: `R$ ${metrics.revenue.toFixed(0)}`, icon: DollarSign },
                              { label: "Visualizações", value: metrics.views, icon: Eye },
                            ].map((s) => (
                              <div key={s.label} className="bg-muted rounded-lg p-2 text-center">
                                <s.icon className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                                <p className="text-sm font-bold">{s.value}</p>
                                <p className="text-[8px] text-muted-foreground">{s.label}</p>
                              </div>
                            ))}
                          </div>

                          {/* Features */}
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Recursos disponíveis</p>
                            <div className="flex flex-wrap gap-1">
                              {mp.features.map((f) => (
                                <Badge key={f} variant="outline" className="text-[9px]">{f}</Badge>
                              ))}
                            </div>
                          </div>

                          {/* Required fields info */}
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Campos obrigatórios</p>
                            <div className="bg-muted rounded-lg p-3 space-y-1">
                              {mp.requiredFields.map((f) => (
                                <div key={f} className="flex items-center gap-1.5">
                                  <CheckCircle className="w-3 h-3 text-accent flex-shrink-0" />
                                  <span className="text-[10px]">{f}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" onClick={() => window.open(mp.apiUrl, "_blank")}>
                            <ExternalLink className="w-3.5 h-3.5" /> Documentação da API
                          </Button>
                        </TabsContent>

                        {/* Configuration */}
                        <TabsContent value="config" className="space-y-4 mt-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold">Ativar {mp.name}</p>
                              <p className="text-[10px] text-muted-foreground">Habilitar sincronização com este marketplace</p>
                            </div>
                            <Switch
                              checked={config.enabled}
                              onCheckedChange={(v) => updateConfig(mp.id, { enabled: v, status: v ? "connected" : "disconnected" })}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">ID do Vendedor / Seller ID</Label>
                            <Input
                              placeholder={`Seu ID no ${mp.name}`}
                              value={config.sellerId}
                              onChange={(e) => updateConfig(mp.id, { sellerId: e.target.value })}
                              className="text-xs h-9"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">Chave da API / Access Token</Label>
                            <Input
                              type="password"
                              placeholder="Cole sua chave de acesso aqui"
                              value={config.apiKey}
                              onChange={(e) => updateConfig(mp.id, { apiKey: e.target.value })}
                              className="text-xs h-9"
                            />
                            <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                              <Info className="w-3 h-3" />
                              A chave será armazenada de forma segura no backend
                            </p>
                          </div>

                          {/* Sync settings */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-semibold">Sincronização Automática</p>
                                <p className="text-[10px] text-muted-foreground">Atualizar estoque e preços periodicamente</p>
                              </div>
                              <Switch
                                checked={config.autoSync}
                                onCheckedChange={(v) => updateConfig(mp.id, { autoSync: v })}
                              />
                            </div>
                          </div>

                          {config.autoSync && (
                            <div className="space-y-2">
                              <Label className="text-xs">Frequência de Sincronização</Label>
                              <Select value={config.syncFrequency} onValueChange={(v: any) => updateConfig(mp.id, { syncFrequency: v })}>
                                <SelectTrigger className="text-xs h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="manual">Manual</SelectItem>
                                  <SelectItem value="hourly">A cada hora</SelectItem>
                                  <SelectItem value="daily">Diariamente</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Price rule */}
                          <div className="space-y-2">
                            <Label className="text-xs">Regra de Preço</Label>
                            <Select value={config.priceRule} onValueChange={(v: any) => updateConfig(mp.id, { priceRule: v })}>
                              <SelectTrigger className="text-xs h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="same">Mesmo preço da loja</SelectItem>
                                <SelectItem value="markup">Markup percentual</SelectItem>
                                <SelectItem value="custom">Preço customizado por produto</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {config.priceRule === "markup" && (
                            <div className="space-y-2">
                              <Label className="text-xs">Markup (%)</Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={config.markupPercent}
                                onChange={(e) => updateConfig(mp.id, { markupPercent: Number(e.target.value) })}
                                className="text-xs h-9"
                              />
                              <p className="text-[9px] text-muted-foreground">
                                Preço no marketplace = Preço loja + {config.markupPercent}%
                              </p>
                            </div>
                          )}

                          <Button
                            className="w-full text-xs gap-1.5"
                            disabled={saveConfigMutation.isPending}
                            onClick={() => {
                              saveConfigMutation.mutate(
                                { mpId: mp.id, config },
                                {
                                  onSuccess: () => toast.success(`Configurações do ${mp.name} salvas!`),
                                  onError: (err: any) => toast.error("Erro ao salvar: " + err.message),
                                }
                              );
                            }}
                          >
                            {saveConfigMutation.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Settings2 className="w-3.5 h-3.5" />
                            )}
                            Salvar Configurações
                          </Button>
                        </TabsContent>

                        {/* Products */}
                        <TabsContent value="products" className="space-y-3 mt-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold">{totalProducts} produtos disponíveis</p>
                            <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1">
                              <RefreshCw className="w-3 h-3" /> Sincronizar Todos
                            </Button>
                          </div>

                          {/* Product readiness check */}
                          <div className="bg-muted rounded-lg p-3 space-y-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Verificação de prontidão</p>
                            {[
                              { label: "Com imagens", count: products?.filter((p) => p.images && p.images.length > 0).length || 0 },
                              { label: "Com descrição", count: products?.filter((p) => p.description && p.description.length > 30).length || 0 },
                              { label: "Com preço", count: products?.filter((p) => p.price > 0).length || 0 },
                              { label: "Em estoque", count: products?.filter((p) => p.stock > 0).length || 0 },
                              { label: "Com marca", count: products?.filter((p) => p.brand).length || 0 },
                            ].map((item) => (
                              <div key={item.label} className="space-y-1">
                                <div className="flex justify-between text-[10px]">
                                  <span>{item.label}</span>
                                  <span className="font-semibold">{item.count}/{totalProducts}</span>
                                </div>
                                <Progress value={totalProducts > 0 ? (item.count / totalProducts) * 100 : 0} className="h-1.5" />
                              </div>
                            ))}
                          </div>

                          {/* Product list preview */}
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {products?.slice(0, 10).map((p) => {
                              const hasImage = p.images && p.images.length > 0;
                              const hasDesc = p.description && p.description.length > 30;
                              const ready = hasImage && hasDesc && p.price > 0 && p.stock > 0;
                              return (
                                <div key={p.id} className="flex items-center gap-3 bg-muted/50 rounded-lg p-2">
                                  {hasImage ? (
                                    <img src={p.images![0]} alt={p.name} className="w-10 h-10 rounded object-cover" />
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-medium truncate">{p.name}</p>
                                    <p className="text-[9px] text-muted-foreground">{p.brand} • R$ {Number(p.price).toFixed(2).replace(".", ",")} • {p.stock} un.</p>
                                  </div>
                                  {ready ? (
                                    <CheckCircle className="w-4 h-4 text-accent flex-shrink-0" />
                                  ) : (
                                    <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
                                  )}
                                </div>
                              );
                            })}
                            {totalProducts > 10 && (
                              <p className="text-[10px] text-muted-foreground text-center">+{totalProducts - 10} produtos</p>
                            )}
                          </div>
                        </TabsContent>

                        {/* Shipping */}
                        <TabsContent value="shipping" className="space-y-3 mt-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Modo de Envio</Label>
                            <Select value={config.shippingMode} onValueChange={(v: any) => updateConfig(mp.id, { shippingMode: v })}>
                              <SelectTrigger className="text-xs h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="marketplace">Logística do Marketplace</SelectItem>
                                <SelectItem value="own">Envio próprio</SelectItem>
                                <SelectItem value="both">Ambos</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Shipping info by marketplace */}
                          <div className="bg-muted rounded-lg p-3 space-y-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Opções de frete do {mp.name}</p>
                            {mp.id === "mercadolivre" && (
                              <div className="space-y-1.5 text-[10px]">
                                <div className="flex items-start gap-1.5">
                                  <CheckCircle className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                                  <span><strong>Mercado Envios:</strong> Coleta automática ou envio em agência. Desconto no frete para sellers com reputação.</span>
                                </div>
                                <div className="flex items-start gap-1.5">
                                  <CheckCircle className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                                  <span><strong>Full (Fulfillment):</strong> Envio a partir do centro de distribuição do ML. Entregas em 24-48h.</span>
                                </div>
                                <div className="flex items-start gap-1.5">
                                  <CheckCircle className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                                  <span><strong>Frete Grátis:</strong> Acima de R$ 79 com Mercado Envios. O seller arca com parte do custo.</span>
                                </div>
                              </div>
                            )}
                            {mp.id === "amazon" && (
                              <div className="space-y-1.5 text-[10px]">
                                <div className="flex items-start gap-1.5">
                                  <CheckCircle className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                                  <span><strong>FBA:</strong> Fulfillment by Amazon. Elegível ao Prime com entrega rápida.</span>
                                </div>
                                <div className="flex items-start gap-1.5">
                                  <CheckCircle className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                                  <span><strong>FBM:</strong> Fulfilled by Merchant. Você controla o envio.</span>
                                </div>
                                <div className="flex items-start gap-1.5">
                                  <CheckCircle className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                                  <span><strong>DBA:</strong> Delivery by Amazon. Amazon coleta e entrega.</span>
                                </div>
                              </div>
                            )}
                            {mp.id === "olx" && (
                              <div className="space-y-1.5 text-[10px]">
                                <div className="flex items-start gap-1.5">
                                  <CheckCircle className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                                  <span><strong>Retirada pessoal:</strong> Comprador busca o produto. Sem custo de frete.</span>
                                </div>
                                <div className="flex items-start gap-1.5">
                                  <CheckCircle className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                                  <span><strong>Envio por conta do vendedor:</strong> Você organiza e envia (Correios, transportadora).</span>
                                </div>
                              </div>
                            )}
                            {mp.id === "shopee" && (
                              <div className="space-y-1.5 text-[10px]">
                                <div className="flex items-start gap-1.5">
                                  <CheckCircle className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                                  <span><strong>Shopee Envios:</strong> Logística integrada com múltiplas transportadoras.</span>
                                </div>
                                <div className="flex items-start gap-1.5">
                                  <CheckCircle className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                                  <span><strong>Frete Grátis Extra:</strong> Programa de subsídio de frete para sellers qualificados.</span>
                                </div>
                                <div className="flex items-start gap-1.5">
                                  <CheckCircle className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                                  <span><strong>Dimensões:</strong> Peso e dimensões obrigatórios para cálculo automático.</span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                            <div className="flex items-start gap-2">
                              <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-[10px] font-semibold text-primary">Dica de Logística</p>
                                <p className="text-[10px] text-muted-foreground">
                                  Utilizar a logística do marketplace geralmente aumenta a visibilidade do anúncio e melhora o posicionamento na busca.
                                </p>
                              </div>
                            </div>
                          </div>
                        </TabsContent>

                        {/* Reports */}
                        <TabsContent value="reports" className="space-y-3 mt-3">
                          <div className="bg-muted rounded-lg p-6 text-center space-y-2">
                            <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto" />
                            <p className="text-sm font-semibold">Relatórios em breve</p>
                            <p className="text-[10px] text-muted-foreground">
                              Após conectar sua conta no {mp.name}, os relatórios de vendas, performance e métricas aparecerão aqui automaticamente.
                            </p>
                          </div>

                          {/* Placeholder metrics */}
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Métricas que serão rastreadas</p>
                            {[
                              "Vendas totais e receita por período",
                              "Taxa de conversão por produto",
                              "Ranking de produtos mais vendidos",
                              "Tempo médio de envio",
                              "Avaliações e reputação do seller",
                              "Comparativo de preço vs concorrentes",
                              "ROI de anúncios patrocinados",
                            ].map((m) => (
                              <div key={m} className="flex items-center gap-1.5">
                                <TrendingUp className="w-3 h-3 text-primary flex-shrink-0" />
                                <span className="text-[10px]">{m}</span>
                              </div>
                            ))}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Setup guide */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card rounded-xl border border-border p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <Plug className="w-4 h-4 text-primary" />
          <p className="text-sm font-bold">Guia de Configuração</p>
        </div>
        <div className="space-y-2">
          {[
            { step: 1, title: "Crie sua conta de vendedor", desc: "Acesse o marketplace desejado e registre-se como vendedor profissional." },
            { step: 2, title: "Obtenha as credenciais da API", desc: "No painel do marketplace, gere sua chave de API (App ID + Secret)." },
            { step: 3, title: "Configure aqui", desc: "Cole suas credenciais, defina regras de preço e ative a sincronização." },
            { step: 4, title: "Sincronize o catálogo", desc: "Envie seus produtos para o marketplace com imagens, descrições e preços." },
            { step: 5, title: "Monitore e otimize", desc: "Acompanhe vendas, avaliações e ajuste sua estratégia em cada canal." },
          ].map((s) => (
            <div key={s.step} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                {s.step}
              </div>
              <div>
                <p className="text-xs font-semibold">{s.title}</p>
                <p className="text-[10px] text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default MarketplacesTab;
