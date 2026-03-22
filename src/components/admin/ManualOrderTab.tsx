import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, User, MapPin, MessageCircle,
  Copy, Send
} from "lucide-react";

interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
}

interface AddressInfo {
  zip: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "credit_card", label: "Cartão de Crédito" },
  { value: "debit_card", label: "Cartão de Débito" },
  { value: "boleto", label: "Boleto" },
  { value: "whatsapp", label: "Combinar pelo WhatsApp" },
  { value: "dinheiro", label: "Dinheiro" },
];

const INITIAL_ADDRESS: AddressInfo = { zip: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" };
const INITIAL_CUSTOMER: CustomerInfo = { name: "", phone: "", email: "" };

const SITE_URL = "https://www.ellemake.com.br";
const MERCHANT_NAME = "Elle Make";

const ManualOrderTab = () => {
  const { data: products } = useProducts({});
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [customer, setCustomer] = useState<CustomerInfo>(INITIAL_CUSTOMER);
  const [address, setAddress] = useState<AddressInfo>(INITIAL_ADDRESS);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("pending");
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!products || !search.trim()) return [];
    const q = search.toLowerCase();
    return products
      .filter(p => p.is_active && (p.name.toLowerCase().includes(q) || (p.brand || "").toLowerCase().includes(q)))
      .slice(0, 10);
  }, [products, search]);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = Math.max(0, subtotal - discount);

  const addItem = (product: any) => {
    const existing = items.find(i => i.product_id === product.id);
    if (existing) {
      setItems(items.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, {
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        image: product.images?.[0],
      }]);
    }
    setSearch("");
    toast.success(`${product.name} adicionado`);
  };

  const updateQty = (productId: string, delta: number) => {
    setItems(items.map(i => {
      if (i.product_id !== productId) return i;
      return { ...i, quantity: Math.max(1, i.quantity + delta) };
    }));
  };

  const removeItem = (productId: string) => {
    setItems(items.filter(i => i.product_id !== productId));
  };

  const lookupCep = async () => {
    if (address.zip.replace(/\D/g, "").length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${address.zip.replace(/\D/g, "")}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress(a => ({
          ...a,
          street: data.logradouro || a.street,
          neighborhood: data.bairro || a.neighborhood,
          city: data.localidade || a.city,
          state: data.uf || a.state,
        }));
      }
    } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    if (items.length === 0) return toast.error("Adicione pelo menos um produto");
    if (!customer.name.trim()) return toast.error("Nome do cliente é obrigatório");
    if (!customer.phone.trim()) return toast.error("Telefone do cliente é obrigatório");

    setIsCreating(true);
    try {
      const orderItems = items.map(i => ({
        product_id: i.product_id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        image: i.image,
      }));

      const shippingAddress = address.street ? {
        zip: address.zip, street: address.street, number: address.number,
        complement: address.complement, neighborhood: address.neighborhood,
        city: address.city, state: address.state,
      } : null;

      const orderData: any = {
        items: orderItems,
        total,
        discount: discount > 0 ? discount : 0,
        status,
        payment_method: paymentMethod,
        shipping_address: shippingAddress,
        coupon_code: couponCode || null,
        notes: notes || null,
        guest_name: customer.name,
        guest_phone: customer.phone,
        guest_email: customer.email || null,
      };

      const { data, error } = await supabase.from("orders").insert(orderData).select().single();
      if (error) throw error;

      setCreatedOrder(data);
      setShowTemplates(true);
      toast.success("Pedido criado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao criar pedido: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setItems([]);
    setCustomer(INITIAL_CUSTOMER);
    setAddress(INITIAL_ADDRESS);
    setPaymentMethod("pix");
    setDiscount(0);
    setCouponCode("");
    setNotes("");
    setStatus("pending");
    setCreatedOrder(null);
    setShowTemplates(false);
  };

  const generateTemplates = () => {
    if (!createdOrder) return [];
    const firstName = customer.name.split(" ")[0];
    const orderId = createdOrder.id.slice(0, 8);
    const totalStr = total.toFixed(2).replace(".", ",");
    const itemsList = items.map(i => `  • ${i.name} (${i.quantity}x) — R$ ${(i.price * i.quantity).toFixed(2).replace(".", ",")}`).join("\n");
    const payLabel = PAYMENT_METHODS.find(p => p.value === paymentMethod)?.label || paymentMethod;
    const addr = address.street ? `${address.street}, ${address.number} — ${address.neighborhood}, ${address.city}` : "";

    return [
      {
        name: "✅ Confirmação do Pedido",
        message:
          `✨ *Pedido Confirmado!* ✨\n\n` +
          `Oi, *${firstName}*! Que alegria ter você com a gente 💖\n\n` +
          `Seu pedido *#${orderId}* foi registrado!\n\n` +
          `🛍️ *O que você pediu:*\n${itemsList}\n\n` +
          `💰 *Total:* R$ ${totalStr}\n` +
          `💳 *Pagamento:* ${payLabel}\n` +
          (addr ? `📍 *Enviar para:* ${addr}\n\n` : "\n") +
          `Já estamos preparando tudo com carinho pra você! 🎁\n` +
          `Acompanhe aqui: ${SITE_URL}/pedidos`,
      },
      {
        name: "💳 Lembrete de Pagamento (PIX)",
        message:
          `Oi, *${firstName}*! ⏳\n\n` +
          `Seu pedido *#${orderId}* na *${MERCHANT_NAME}* está aguardando pagamento.\n\n` +
          `🛍️ *Itens:*\n${itemsList}\n\n` +
          `💰 *Total: R$ ${totalStr}*\n\n` +
          `📋 *Chave PIX:* [INSERIR CHAVE PIX]\n\n` +
          `Após o pagamento, envie o comprovante aqui nesta conversa! 💕`,
      },
      {
        name: "📦 Pedido Pago",
        message:
          `✅ *Pagamento Confirmado!*\n\n` +
          `*${firstName}*, recebemos seu pagamento 🎉\n\n` +
          `Pedido *#${orderId}*\n` +
          `🛍️ ${itemsList}\n\n` +
          `💰 *Total:* R$ ${totalStr}\n\n` +
          `Vamos embalar tudo com muito cuidado e enviar o mais rápido possível 📦💕`,
      },
      {
        name: "🚀 Pedido Enviado",
        message:
          `📦 *Pedido Enviado!*\n\n` +
          `*${firstName}*, seu pedido *#${orderId}* foi postado! 🚀\n\n` +
          `📋 *Rastreio:* [INSERIR CÓDIGO]\n` +
          `🔗 *Acompanhe:* [INSERIR LINK]\n\n` +
          (addr ? `📍 *Destino:* ${addr}\n\n` : "\n") +
          `Seus produtinhos já estão a caminho! ✈️💕`,
      },
      {
        name: "🛵 Saiu para Entrega (Local)",
        message:
          `🛵 *Saiu pra Entrega!*\n\n` +
          `*${firstName}*, seu pedido *#${orderId}* acabou de sair! 🏍️💨\n\n` +
          `🛍️ ${itemsList}\n\n` +
          (addr ? `📍 *Destino:* ${addr}\n\n` : "\n") +
          `Nosso entregador já está a caminho.\nFique de olho que chega rapidinho! 😍\n\n` +
          `Precisa de algo? Responda aqui mesmo 💬`,
      },
      {
        name: "🎉 Entrega Realizada",
        message:
          `🎉 *Entrega Realizada!*\n\n` +
          `*${firstName}*, seu pedido *#${orderId}* chegou! 💖\n\n` +
          `Esperamos que você ame cada produto! 😍\n\n` +
          `📸 Mostra pra gente o resultado! Marca *@ellemakebelem* no Insta ✨\n\n` +
          `Obrigada por escolher a ${MERCHANT_NAME} 💕`,
      },
    ];
  };

  const copyTemplate = (message: string) => {
    navigator.clipboard.writeText(message);
    toast.success("Mensagem copiada!");
  };

  const openWhatsApp = (message: string) => {
    let phone = customer.phone.replace(/\D/g, "");
    if (!phone.startsWith("55")) phone = "55" + phone;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  if (showTemplates && createdOrder) {
    const templates = generateTemplates();
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold font-display">Pedido Criado! 🎉</h2>
            <p className="text-xs text-muted-foreground">#{createdOrder.id.slice(0, 8)} · R$ {total.toFixed(2).replace(".", ",")} · {customer.name}</p>
          </div>
          <Button onClick={resetForm} variant="outline" size="sm" className="gap-1 text-xs">
            <Plus className="w-3 h-3" /> Novo Pedido
          </Button>
        </div>

        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-4 h-4 text-accent" />
            <p className="text-sm font-bold">Templates WhatsApp</p>
          </div>
          <p className="text-[11px] text-muted-foreground">Escolha um template, copie ou envie direto pelo WhatsApp</p>
        </div>

        <div className="space-y-3">
          {templates.map((tmpl, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
                <p className="text-xs font-bold">{tmpl.name}</p>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => copyTemplate(tmpl.message)} className="h-7 text-[10px] gap-1">
                    <Copy className="w-3 h-3" /> Copiar
                  </Button>
                  <Button size="sm" onClick={() => openWhatsApp(tmpl.message)} className="h-7 text-[10px] gap-1 bg-green-600 hover:bg-green-700 text-white">
                    <Send className="w-3 h-3" /> Enviar
                  </Button>
                </div>
              </div>
              <pre className="px-4 py-3 text-[11px] whitespace-pre-wrap text-muted-foreground font-sans leading-relaxed max-h-48 overflow-y-auto">
                {tmpl.message}
              </pre>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold font-display">Criar Pedido Manual</h2>
        <p className="text-xs text-muted-foreground">Crie pedidos para vendas presenciais, WhatsApp ou telefone</p>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] font-bold text-muted-foreground uppercase">Adicionar Produtos</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto por nome ou marca..." className="pl-9 bg-muted border-none text-xs min-h-[40px]" />
        </div>
        {filteredProducts.length > 0 && (
          <div className="bg-card border border-border rounded-xl max-h-60 overflow-y-auto">
            {filteredProducts.map(p => (
              <button key={p.id} onClick={() => addItem(p)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left border-b border-border/30 last:border-none">
                <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-contain" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.brand} · Estoque: {p.stock}</p>
                </div>
                <p className="text-xs font-bold text-primary">R$ {p.price.toFixed(2).replace(".", ",")}</p>
                <Plus className="w-4 h-4 text-primary" />
              </button>
            ))}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Itens do Pedido ({items.length})</Label>
          <div className="space-y-1.5">
            {items.map(item => (
              <div key={item.product_id} className="flex items-center gap-2 bg-card rounded-xl p-2.5 border border-border">
                <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {item.image && <img src={item.image} alt="" className="w-full h-full object-contain" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">R$ {item.price.toFixed(2).replace(".", ",")}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => updateQty(item.product_id, -1)} className="w-6 h-6 rounded-full bg-muted flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                  <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(item.product_id, 1)} className="w-6 h-6 rounded-full bg-muted flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                </div>
                <p className="text-xs font-bold text-primary min-w-[60px] text-right">R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}</p>
                <button onClick={() => removeItem(item.product_id)} className="text-destructive/60 hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1"><User className="w-3 h-3" /> Dados do Cliente</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input value={customer.name} onChange={e => setCustomer(c => ({ ...c, name: e.target.value }))} placeholder="Nome *" className="bg-muted border-none text-xs min-h-[40px]" />
          <Input value={customer.phone} onChange={e => setCustomer(c => ({ ...c, phone: e.target.value }))} placeholder="Telefone * (ex: 91999999999)" className="bg-muted border-none text-xs min-h-[40px]" />
          <Input value={customer.email} onChange={e => setCustomer(c => ({ ...c, email: e.target.value }))} placeholder="Email (opcional)" className="bg-muted border-none text-xs min-h-[40px]" />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> Endereço (opcional)</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Input value={address.zip} onChange={e => setAddress(a => ({ ...a, zip: e.target.value }))} onBlur={lookupCep} placeholder="CEP" className="bg-muted border-none text-xs min-h-[40px]" />
          <Input value={address.street} onChange={e => setAddress(a => ({ ...a, street: e.target.value }))} placeholder="Rua" className="bg-muted border-none text-xs min-h-[40px] col-span-2" />
          <Input value={address.number} onChange={e => setAddress(a => ({ ...a, number: e.target.value }))} placeholder="Nº" className="bg-muted border-none text-xs min-h-[40px]" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Input value={address.complement} onChange={e => setAddress(a => ({ ...a, complement: e.target.value }))} placeholder="Complemento" className="bg-muted border-none text-xs min-h-[40px]" />
          <Input value={address.neighborhood} onChange={e => setAddress(a => ({ ...a, neighborhood: e.target.value }))} placeholder="Bairro" className="bg-muted border-none text-xs min-h-[40px]" />
          <Input value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} placeholder="Cidade" className="bg-muted border-none text-xs min-h-[40px]" />
          <Input value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))} placeholder="UF" className="bg-muted border-none text-xs min-h-[40px]" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Pagamento</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className="bg-muted border-none text-xs min-h-[40px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Status Inicial</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-muted border-none text-xs min-h-[40px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="approved">Pago</SelectItem>
              <SelectItem value="processing">Preparando</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Desconto (R$)</Label>
          <Input type="number" value={discount || ""} onChange={e => setDiscount(Number(e.target.value) || 0)} placeholder="0,00" className="bg-muted border-none text-xs min-h-[40px]" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Cupom (opcional)</Label>
          <Input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="CUPOM10" className="bg-muted border-none text-xs min-h-[40px]" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Observações</Label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas internas..." className="bg-muted border-none text-xs min-h-[40px]" />
        </div>
      </div>

      {items.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} itens)</span>
            <span>R$ {subtotal.toFixed(2).replace(".", ",")}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Desconto</span>
              <span className="text-accent">-R$ {discount.toFixed(2).replace(".", ",")}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold border-t border-border/50 pt-2">
            <span>Total</span>
            <span className="text-primary">R$ {total.toFixed(2).replace(".", ",")}</span>
          </div>
          <Button onClick={handleCreate} disabled={isCreating} className="w-full mt-3 gap-2 min-h-[44px]">
            {isCreating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><ShoppingCart className="w-4 h-4" /> Criar Pedido & Gerar Templates</>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ManualOrderTab;