import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, Users, Plus, ArrowLeft, TrendingUp, Box } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

type Tab = "dashboard" | "products" | "orders" | "add-product";

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdmin();
  const [tab, setTab] = useState<Tab>("dashboard");

  if (!user || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center gap-4">
        <LayoutDashboard className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-display font-bold">Acesso Restrito</h1>
        <p className="text-sm text-muted-foreground">Você não tem permissão de administrador</p>
        <Button variant="outline" onClick={() => navigate("/")} className="min-h-[44px]">
          Voltar à Loja
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-4 pt-6 pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-display font-bold">Painel Admin</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto mb-6 pb-2">
        {[
          { id: "dashboard" as Tab, label: "Dashboard", icon: TrendingUp },
          { id: "products" as Tab, label: "Produtos", icon: Box },
          { id: "orders" as Tab, label: "Pedidos", icon: ShoppingCart },
          { id: "add-product" as Tab, label: "Novo Produto", icon: Plus },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors min-h-[36px] flex-shrink-0 ${
              tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <DashboardTab />}
      {tab === "products" && <ProductsTab />}
      {tab === "orders" && <OrdersTab />}
      {tab === "add-product" && <AddProductTab onDone={() => setTab("products")} />}
    </div>
  );
};

const DashboardTab = () => {
  const { data: products } = useProducts({});
  const { data: orders } = useAllOrders();

  const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total), 0) || 0;
  const totalOrders = orders?.length || 0;
  const totalProducts = products?.length || 0;
  const pendingOrders = orders?.filter((o) => o.status === "pending").length || 0;

  const stats = [
    { label: "Receita Total", value: `R$ ${totalRevenue.toFixed(2).replace(".", ",")}`, icon: TrendingUp },
    { label: "Pedidos", value: totalOrders, icon: ShoppingCart },
    { label: "Produtos", value: totalProducts, icon: Box },
    { label: "Pendentes", value: pendingOrders, icon: Package },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-card rounded-xl p-4 border border-border"
        >
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
    else {
      toast.success(currentActive ? "Produto desativado" : "Produto ativado");
      refetch();
    }
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>;

  return (
    <div className="space-y-3">
      {products?.map((product) => (
        <div key={product.id} className="bg-card rounded-xl p-4 border border-border flex items-center gap-3">
          <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
            {product.images?.[0] && <img src={product.images[0]} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium line-clamp-1">{product.name}</p>
            <p className="text-xs text-muted-foreground">Estoque: {product.stock}</p>
            <p className="text-xs font-bold text-primary">R$ {Number(product.price).toFixed(2).replace(".", ",")}</p>
          </div>
          <Button
            variant={product.is_active ? "outline" : "default"}
            size="sm"
            onClick={() => handleToggleActive(product.id, product.is_active!)}
            className="text-xs"
          >
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
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (error) toast.error("Erro ao atualizar status");
    else {
      toast.success("Status atualizado");
      refetch();
    }
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
              <p className="text-[10px] text-muted-foreground">
                {new Date(order.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <p className="text-sm font-bold text-primary">R$ {Number(order.total).toFixed(2).replace(".", ",")}</p>
          </div>
          <Select defaultValue={order.status} onValueChange={(val) => handleUpdateStatus(order.id, val)}>
            <SelectTrigger className="bg-muted border-none min-h-[36px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        name: form.name,
        slug,
        description: form.description,
        sensorial_description: form.sensorial_description || null,
        price: parseFloat(form.price),
        compare_at_price: form.compare_at_price ? parseFloat(form.compare_at_price) : null,
        brand: form.brand || null,
        ingredients: form.ingredients || null,
        stock: parseInt(form.stock),
        category_id: form.category_id || null,
        images: form.image_url ? [form.image_url] : [],
        is_active: true,
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
        <div className="col-span-2 space-y-2">
          <Label>Nome do Produto *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-muted border-none min-h-[44px]" required />
        </div>
        <div className="space-y-2">
          <Label>Preço (R$) *</Label>
          <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="bg-muted border-none min-h-[44px]" required />
        </div>
        <div className="space-y-2">
          <Label>Preço Anterior</Label>
          <Input type="number" step="0.01" value={form.compare_at_price} onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })} className="bg-muted border-none min-h-[44px]" />
        </div>
        <div className="space-y-2">
          <Label>Marca</Label>
          <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="bg-muted border-none min-h-[44px]" />
        </div>
        <div className="space-y-2">
          <Label>Estoque</Label>
          <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="bg-muted border-none min-h-[44px]" />
        </div>
        <div className="col-span-2 space-y-2">
          <Label>Categoria</Label>
          <Select value={form.category_id} onValueChange={(val) => setForm({ ...form, category_id: val })}>
            <SelectTrigger className="bg-muted border-none min-h-[44px]">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-2">
          <Label>URL da Imagem</Label>
          <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="bg-muted border-none min-h-[44px]" />
        </div>
        <div className="col-span-2 space-y-2">
          <Label>Descrição</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-muted border-none min-h-[80px]" />
        </div>
        <div className="col-span-2 space-y-2">
          <Label>Descrição Sensorial</Label>
          <Textarea value={form.sensorial_description} onChange={(e) => setForm({ ...form, sensorial_description: e.target.value })} className="bg-muted border-none min-h-[80px]" />
        </div>
        <div className="col-span-2 space-y-2">
          <Label>Ingredientes-chave</Label>
          <Input value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} className="bg-muted border-none min-h-[44px]" />
        </div>
      </div>
      <Button type="submit" disabled={submitting} className="w-full bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90 min-h-[44px]">
        {submitting ? "Criando..." : "Criar Produto"}
      </Button>
    </form>
  );
};

export default Admin;
