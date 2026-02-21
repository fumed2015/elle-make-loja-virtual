import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, Plus, ArrowLeft, TrendingUp, Box, Tag, Star, Users, ImageIcon, Eye, EyeOff, Percent, Trash2, Search, AlertTriangle, CheckCircle, Info, FolderOpen, Pencil } from "lucide-react";
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

type Tab = "dashboard" | "products" | "orders" | "add-product" | "coupons" | "reviews" | "influencers" | "seo" | "categories";

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
    { id: "products" as Tab, label: "Produtos", icon: Box },
    { id: "categories" as Tab, label: "Categorias", icon: FolderOpen },
    { id: "orders" as Tab, label: "Pedidos", icon: ShoppingCart },
    { id: "coupons" as Tab, label: "Cupons", icon: Tag },
    { id: "reviews" as Tab, label: "Reviews", icon: Star },
    { id: "influencers" as Tab, label: "Influencers", icon: Users },
    { id: "seo" as Tab, label: "SEO", icon: Search },
    { id: "add-product" as Tab, label: "+Produto", icon: Plus },
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
      {tab === "products" && <ProductsTab />}
      {tab === "orders" && <OrdersTab />}
      {tab === "coupons" && <CouponsTab />}
      {tab === "reviews" && <ReviewsTab />}
      {tab === "influencers" && <InfluencersTab />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "seo" && <SEOTab />}
      {tab === "add-product" && <AddProductTab onDone={() => setTab("products")} />}
    </div>
  );
};

const DashboardTab = () => {
  const { data: products } = useProducts({});
  const { data: orders } = useAllOrders();
  const { data: influencers } = useInfluencers();

  const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
  const totalOrders = orders?.length || 0;
  const totalProducts = products?.length || 0;
  const pendingOrders = orders?.filter((o) => o.status === "pending").length || 0;
  const activeInfluencers = influencers?.filter((i) => i.is_active).length || 0;

  const stats = [
    { label: "Receita Total", value: `R$ ${totalRevenue.toFixed(2).replace(".", ",")}`, icon: TrendingUp },
    { label: "Pedidos", value: totalOrders, icon: ShoppingCart },
    { label: "Produtos", value: totalProducts, icon: Box },
    { label: "Pendentes", value: pendingOrders, icon: Package },
    { label: "Influencers", value: activeInfluencers, icon: Users },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, i) => (
        <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
          className="bg-card rounded-xl p-4 border border-border">
          <stat.icon className="w-5 h-5 text-primary mb-2" />
          <p className="text-lg font-bold">{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
};

const ProductsTab = () => {
  const { data: products, isLoading, refetch } = useProducts({});
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.from("products").update({ is_active: !currentActive }).eq("id", id);
    if (error) toast.error("Erro ao atualizar");
    else { toast.success(currentActive ? "Produto desativado" : "Produto ativado"); refetch(); }
  };
  if (isLoading) return <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>;
  return (
    <div className="space-y-3">
      {products?.map((product) => (
        <div key={product.id} className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
          <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">{product.images?.[0] && <img src={product.images[0]} alt="" className="w-full h-full object-cover" />}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium line-clamp-1">{product.name}</p>
            <p className="text-xs text-muted-foreground">Estoque: {product.stock}</p>
            <p className="text-xs font-bold text-primary">R$ {Number(product.price).toFixed(2).replace(".", ",")}</p>
          </div>
          <Button variant={product.is_active ? "outline" : "default"} size="sm" onClick={() => handleToggleActive(product.id, product.is_active!)} className="text-xs">
            {product.is_active ? "Desativar" : "Ativar"}
          </Button>
        </div>
      ))}
    </div>
  );
};

const OrdersTab = () => {
  const { data: orders, isLoading, refetch } = useAllOrders();
  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const updateData: any = { status: newStatus };
    const { error } = await supabase.from("orders").update(updateData).eq("id", orderId);
    if (error) toast.error("Erro ao atualizar status");
    else { toast.success("Status atualizado"); refetch(); }
  };
  if (isLoading) return <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>;
  if (!orders?.length) return <div className="text-center py-8 text-muted-foreground text-sm">Nenhum pedido</div>;
  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div key={order.id} className="bg-card rounded-xl p-4 border border-border space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium">#{order.id.slice(0, 8)}</p>
              <p className="text-[10px] text-muted-foreground">{new Date(order.created_at).toLocaleDateString("pt-BR")}</p>
            </div>
            <p className="text-sm font-bold text-primary">R$ {Number(order.total).toFixed(2).replace(".", ",")}</p>
          </div>
          <div className="flex gap-2">
            <Select defaultValue={order.status} onValueChange={(val) => handleUpdateStatus(order.id, val)}>
              <SelectTrigger className="bg-muted border-none min-h-[36px] text-xs flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([value, label]) => (<SelectItem key={value} value={value}>{label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {order.coupon_code && <Badge variant="secondary" className="text-[10px]"><Tag className="w-3 h-3 mr-1" />{order.coupon_code} (-R$ {Number(order.discount || 0).toFixed(2).replace(".", ",")})</Badge>}
        </div>
      ))}
    </div>
  );
};

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
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", description: "", discount_type: "percentage", discount_value: "", min_order_value: "0", max_uses: "" });

  const handleCreate = async () => {
    const { error } = await supabase.from("coupons").insert({
      code: form.code.toUpperCase(), description: form.description,
      discount_type: form.discount_type, discount_value: parseFloat(form.discount_value),
      min_order_value: parseFloat(form.min_order_value || "0"),
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Cupom criado!"); queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }); setShowForm(false); setForm({ code: "", description: "", discount_type: "percentage", discount_value: "", min_order_value: "0", max_uses: "" }); }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("coupons").update({ is_active: !active }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    toast.success(active ? "Cupom desativado" : "Cupom ativado");
  };

  return (
    <div className="space-y-3">
      <Button onClick={() => setShowForm(!showForm)} size="sm" className="bg-gradient-gold text-primary-foreground text-xs gap-1"><Plus className="w-3 h-3" />Novo Cupom</Button>
      {showForm && (
        <div className="bg-card rounded-xl p-4 border border-border space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-xs">Código</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="bg-muted border-none min-h-[36px] text-xs uppercase" /></div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                <SelectTrigger className="bg-muted border-none min-h-[36px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="percentage">Percentual (%)</SelectItem><SelectItem value="fixed">Fixo (R$)</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Valor</Label><Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" /></div>
            <div className="space-y-1"><Label className="text-xs">Pedido mínimo</Label><Input type="number" value={form.min_order_value} onChange={(e) => setForm({ ...form, min_order_value: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" /></div>
            <div className="space-y-1"><Label className="text-xs">Máx. usos</Label><Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="Ilimitado" className="bg-muted border-none min-h-[36px] text-xs" /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" /></div>
          <Button onClick={handleCreate} size="sm" className="text-xs bg-gradient-gold text-primary-foreground">Criar Cupom</Button>
        </div>
      )}
      {isLoading ? <div className="text-center py-4 text-xs text-muted-foreground">Carregando...</div> : coupons?.map((c) => (
        <div key={c.id} className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold">{c.code}</p>
              <Badge variant={c.is_active ? "default" : "secondary"} className="text-[10px]">{c.is_active ? "Ativo" : "Inativo"}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{c.discount_type === "percentage" ? `${c.discount_value}%` : `R$ ${Number(c.discount_value).toFixed(2).replace(".", ",")}`} • Usos: {c.current_uses}/{c.max_uses || "∞"}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => handleToggle(c.id, !!c.is_active)} className="text-xs">
            {c.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      ))}
    </div>
  );
};

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

const InfluencersTab = () => {
  const { data: influencers, isLoading } = useInfluencers();
  const createInfluencer = useCreateInfluencer();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ user_id: "", name: "", instagram: "", commission_percent: "10" });

  const handleCreate = () => {
    if (!form.name || !form.user_id) { toast.error("Nome e User ID são obrigatórios"); return; }
    createInfluencer.mutate({
      user_id: form.user_id, name: form.name,
      instagram: form.instagram || undefined,
      commission_percent: parseFloat(form.commission_percent),
    }, { onSuccess: () => { setShowForm(false); setForm({ user_id: "", name: "", instagram: "", commission_percent: "10" }); } });
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("influencers").update({ is_active: !active }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["influencers"] });
    toast.success(active ? "Influenciadora desativada" : "Influenciadora ativada");
  };

  const handleCreateCoupon = async (influencer: any) => {
    const code = influencer.name.split(" ")[0].toUpperCase().slice(0, 8);
    const { error } = await supabase.from("coupons").insert({
      code, description: `Cupom da ${influencer.name}`, discount_type: "percentage",
      discount_value: influencer.commission_percent, min_order_value: 0,
    });
    if (error) toast.error(error.message);
    else toast.success(`Cupom ${code} criado!`);
  };

  return (
    <div className="space-y-3">
      <Button onClick={() => setShowForm(!showForm)} size="sm" className="bg-gradient-gold text-primary-foreground text-xs gap-1"><Plus className="w-3 h-3" />Nova Influenciadora</Button>
      {showForm && (
        <div className="bg-card rounded-xl p-4 border border-border space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 space-y-1"><Label className="text-xs">User ID (UUID)</Label><Input value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" placeholder="ID do usuário" /></div>
            <div className="space-y-1"><Label className="text-xs">Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" /></div>
            <div className="space-y-1"><Label className="text-xs">Instagram</Label><Input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" placeholder="@usuario" /></div>
            <div className="space-y-1"><Label className="text-xs">Comissão (%)</Label><Input type="number" value={form.commission_percent} onChange={(e) => setForm({ ...form, commission_percent: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" /></div>
          </div>
          <Button onClick={handleCreate} disabled={createInfluencer.isPending} size="sm" className="text-xs bg-gradient-gold text-primary-foreground">Cadastrar</Button>
        </div>
      )}
      {isLoading ? <div className="text-center py-4 text-xs text-muted-foreground">Carregando...</div> : influencers?.map((inf) => (
        <div key={inf.id} className="bg-card rounded-xl p-4 border border-border">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-bold">{inf.name}</p>
              <p className="text-xs text-muted-foreground">{inf.instagram || "Sem Instagram"} • {inf.commission_percent}% comissão</p>
            </div>
            <Badge variant={inf.is_active ? "default" : "secondary"} className="text-[10px]">{inf.is_active ? "Ativa" : "Inativa"}</Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <span>Vendas: R$ {Number(inf.total_sales).toFixed(2).replace(".", ",")}</span>
            <span>•</span>
            <span>Comissão: R$ {Number(inf.total_commission).toFixed(2).replace(".", ",")}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => handleToggle(inf.id, !!inf.is_active)} className="text-xs">{inf.is_active ? "Desativar" : "Ativar"}</Button>
            <Button variant="ghost" size="sm" onClick={() => handleCreateCoupon(inf)} className="text-xs gap-1"><Tag className="w-3 h-3" />Criar Cupom</Button>
          </div>
        </div>
      ))}
    </div>
  );
};

const AddProductTab = ({ onDone }: { onDone: () => void }) => {
  const { data: categories } = useCategories();
  const [form, setForm] = useState({
    name: "", slug: "", description: "", sensorial_description: "",
    price: "", compare_at_price: "", brand: "", ingredients: "",
    stock: "0", category_id: "", image_url: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const { error } = await supabase.from("products").insert({
        name: form.name, slug, description: form.description,
        sensorial_description: form.sensorial_description || null,
        price: parseFloat(form.price),
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
        brand: form.brand || null, ingredients: form.ingredients || null,
        stock: parseInt(form.stock), category_id: form.category_id || null,
        images: form.image_url ? [form.image_url] : [], is_active: true,
      });
      if (error) throw error;
      toast.success("Produto criado com sucesso!");
      onDone();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar produto");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-2"><Label>Nome do Produto *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-muted border-none min-h-[44px]" required /></div>
        <div className="space-y-2"><Label>Preço (R$) *</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="bg-muted border-none min-h-[44px]" required /></div>
        <div className="space-y-2"><Label>Preço Anterior</Label><Input type="number" step="0.01" value={form.compare_at_price} onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })} className="bg-muted border-none min-h-[44px]" /></div>
        <div className="space-y-2"><Label>Marca</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="bg-muted border-none min-h-[44px]" /></div>
        <div className="space-y-2"><Label>Estoque</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="bg-muted border-none min-h-[44px]" /></div>
        <div className="col-span-2 space-y-2">
          <Label>Categoria</Label>
          <Select value={form.category_id} onValueChange={(val) => setForm({ ...form, category_id: val })}>
            <SelectTrigger className="bg-muted border-none min-h-[44px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{categories?.map((cat) => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-2"><Label>URL da Imagem</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="bg-muted border-none min-h-[44px]" /></div>
        <div className="col-span-2 space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-muted border-none min-h-[80px]" /></div>
        <div className="col-span-2 space-y-2"><Label>Descrição Sensorial</Label><Textarea value={form.sensorial_description} onChange={(e) => setForm({ ...form, sensorial_description: e.target.value })} className="bg-muted border-none min-h-[80px]" /></div>
        <div className="col-span-2 space-y-2"><Label>Ingredientes-chave</Label><Input value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} className="bg-muted border-none min-h-[44px]" /></div>
      </div>
      <Button type="submit" disabled={submitting} className="w-full bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90 min-h-[44px]">{submitting ? "Criando..." : "Criar Produto"}</Button>
    </form>
  );
};

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
          {/* Score */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-xl p-5 border border-border text-center">
            <p className="text-xs text-muted-foreground mb-1">Score SEO</p>
            <p className={`text-4xl font-bold ${scoreColor(latest.score || 0)}`}>{latest.score}/100</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Gerado em {new Date(latest.created_at).toLocaleString("pt-BR")}
            </p>
          </motion.div>

          {/* Summary cards */}
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

          {/* Issues */}
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

          {/* History */}
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

export default Admin;
