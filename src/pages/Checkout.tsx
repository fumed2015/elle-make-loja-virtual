import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, CreditCard, CheckCircle, Tag, X, Loader2, ShoppingBag, ChevronDown, QrCode, Barcode, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useCoupon } from "@/hooks/useCoupon";
import { useShipping } from "@/hooks/useShipping";
import { useAddresses } from "@/hooks/useAddresses";
import { usePayment, usePaymentStatusPolling, type PaymentMethod, type PaymentStatus } from "@/hooks/usePayment";
import ShippingCalculator from "@/components/shipping/ShippingCalculator";
import FreeShippingBar from "@/components/layout/FreeShippingBar";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import CardPaymentForm from "@/components/payment/CardPaymentForm";
import OrderBump from "@/components/checkout/OrderBump";
import TrustBadges from "@/components/checkout/TrustBadges";

type Step = "address" | "review" | "payment" | "processing" | "success";

const STEP_LABELS = [
  { key: "address", label: "Endereço", icon: MapPin },
  { key: "review", label: "Revisão", icon: ShoppingBag },
  { key: "payment", label: "Pagamento", icon: CreditCard },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: "Aguardando pagamento", color: "bg-amber-100 text-amber-800 border-amber-200", icon: "⏳" },
  approved: { label: "Pagamento aprovado", color: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: "✅" },
  in_process: { label: "Em análise", color: "bg-blue-100 text-blue-800 border-blue-200", icon: "🔍" },
  rejected: { label: "Pagamento recusado", color: "bg-red-100 text-red-800 border-red-200", icon: "❌" },
  cancelled: { label: "Cancelado", color: "bg-muted text-muted-foreground border-border", icon: "🚫" },
  refunded: { label: "Reembolsado", color: "bg-muted text-muted-foreground border-border", icon: "💸" },
};

const PaymentStatusBadge = ({ status, polling, detail }: { status: PaymentStatus; polling: boolean; detail: string }) => {
  if (!status) return null;
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-between rounded-xl px-4 py-3 border ${config.color}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{config.icon}</span>
        <div>
          <p className="text-xs font-semibold">{config.label}</p>
          {detail && <p className="text-[10px] opacity-75">{detail}</p>}
        </div>
      </div>
      {polling && (
        <Loader2 className="w-4 h-4 animate-spin opacity-50" />
      )}
    </motion.div>
  );
};
// Input masks
const formatCpf = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};
const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

// CPF algorithmic validation
const isValidCpf = (cpf: string): boolean => {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false; // all same digits
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === parseInt(digits[10]);
};

const Checkout = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { items, cartTotal, cartCount, isLoading: cartLoading, isFetching: cartFetching } = useCart();
  const { validateCoupon } = useCoupon();
  const shipping = useShipping();
  const { data: savedAddresses } = useAddresses();
  const payment = usePayment();

  const [step, setStep] = useState<Step>("address");
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [cepLoading, setCepLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ phone: "", cpf: "" });
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [addressLoaded, setAddressLoaded] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  // Payment results
  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string } | null>(null);
  const [boletoData, setBoletoData] = useState<{ barcode: string; boleto_url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  // Cart abandonment tracking
  useEffect(() => {
    if (!user || !cartTotal || step === "success" || step === "processing") return;
    const timer = setTimeout(() => {
      supabase.from("cart_abandonment_events").insert({
        user_id: user.id,
        step,
        cart_total: cartTotal,
        items_count: items.length,
      } as any).then(() => {});
    }, 3000); // Track after 3s on each step
    return () => clearTimeout(timer);
  }, [step, user]);

  // Clear cart only after payment is confirmed
  const clearCart = useCallback(async () => {
    const cartIds = items.map((i: any) => i.id).filter(Boolean);
    if (cartIds.length > 0) await supabase.from("cart_items").delete().in("id", cartIds);
  }, [items]);

  // Real-time payment status polling
  const { status: paymentStatus, statusDetail: paymentStatusDetail, polling: isPolling } = usePaymentStatusPolling(
    step === "payment" && paymentId ? paymentId : null,
    5000
  );

  // Auto-transition to success when payment is approved + clear cart
  useEffect(() => {
    if (paymentStatus === "approved") {
      toast.success("Pagamento aprovado! 🎉");
      clearCart();
      setStep("success");
    } else if (paymentStatus === "rejected" || paymentStatus === "cancelled") {
      toast.error("Pagamento recusado. Tente novamente.");
    }
  }, [paymentStatus, clearCart]);

  const [address, setAddress] = useState(() => {
    const savedCep = (() => { try { return localStorage.getItem("ellemake_shipping_cep") || ""; } catch { return ""; } })();
    return { street: "", number: "", complement: "", neighborhood: "", city: "Belém", state: "PA", zip: savedCep };
  });

  // Pre-fill from profile
  useEffect(() => {
    if (!user || profileLoaded) return;
    supabase.from("profiles").select("phone, full_name, cpf").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setCustomerInfo(prev => ({
          phone: prev.phone || data.phone || "",
          cpf: prev.cpf || (data as any).cpf || "",
        }));
      }
      setProfileLoaded(true);
    });
  }, [user, profileLoaded]);

  // Pre-fill from saved address
  useEffect(() => {
    if (addressLoaded || !savedAddresses || savedAddresses.length === 0) return;
    const defaultAddr = savedAddresses.find(a => a.is_default) || savedAddresses[0];
    if (defaultAddr) {
      setAddress({
        street: defaultAddr.street, number: defaultAddr.number,
        complement: defaultAddr.complement || "", neighborhood: defaultAddr.neighborhood,
        city: defaultAddr.city, state: defaultAddr.state, zip: defaultAddr.zip,
      });
    }
    setAddressLoaded(true);
  }, [savedAddresses, addressLoaded]);

  const selectSavedAddress = (addr: any) => {
    setAddress({
      street: addr.street, number: addr.number, complement: addr.complement || "",
      neighborhood: addr.neighborhood, city: addr.city, state: addr.state, zip: addr.zip,
    });
    setShowAddressPicker(false);
  };

  // ViaCEP auto-fill
  const [shippingAutoCalculated, setShippingAutoCalculated] = useState(false);
  useEffect(() => {
    const clean = address.zip.replace(/\D/g, "");
    if (clean.length !== 8) return;
    let cancelled = false;
    setCepLoading(true);
    fetch(`https://viacep.com.br/ws/${clean}/json/`)
      .then(r => r.json())
      .then(data => {
        if (cancelled || data.erro) return;
        setAddress(prev => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCepLoading(false); });
    if (!shippingAutoCalculated && shipping.options.length === 0) {
      shipping.setCep(clean);
      setTimeout(() => shipping.calculateShipping(), 100);
      setShippingAutoCalculated(true);
    }
    return () => { cancelled = true; };
  }, [address.zip]);

  // Redirect unauthenticated
  useEffect(() => {
    if (!authLoading && !user) navigate("/perfil?redirect=/checkout", { replace: true });
  }, [user, authLoading, navigate]);

  // Redirect empty cart
  const [cartChecked, setCartChecked] = useState(false);
  useEffect(() => {
    if (authLoading || cartLoading) { setCartChecked(false); return; }
    const t = setTimeout(() => setCartChecked(true), 1500);
    return () => clearTimeout(t);
  }, [authLoading, cartLoading]);
  useEffect(() => {
    if (cartChecked && !cartFetching && items.length === 0 && step !== "success" && step !== "processing" && step !== "payment") {
      navigate("/carrinho", { replace: true });
    }
  }, [cartChecked, cartFetching, items.length, step, navigate]);

  if (authLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (cartLoading && items.length === 0) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (items.length === 0 && step !== "success" && step !== "processing" && step !== "payment") return null;

  const shippingCost = shipping.selectedShipping?.price ?? 0;
  const freeShipping = cartTotal >= 199 && shipping.isLocal;
  const pixDiscount = paymentMethod === "pix" ? 0.05 : 0;
  const subtotalAfterCoupon = Math.max(0, cartTotal - (appliedCoupon?.discount || 0));
  const subtotalAfterPix = subtotalAfterCoupon * (1 - pixDiscount);
  const finalTotal = Math.round(Math.max(0, subtotalAfterPix + (freeShipping ? 0 : shippingCost)) * 100) / 100;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const result = await validateCoupon(couponCode.trim(), cartTotal);
      setAppliedCoupon({ code: result.coupon.code, discount: result.discount });
      toast.success(`Cupom aplicado! -R$ ${result.discount.toFixed(2).replace(".", ",")} 🎉`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCouponLoading(false);
    }
  };

  const saveDataAfterOrder = async () => {
    try {
      if (customerInfo.cpf) await supabase.from("profiles").update({ cpf: customerInfo.cpf } as any).eq("user_id", user.id);
      if (customerInfo.phone) await supabase.from("profiles").update({ phone: customerInfo.phone }).eq("user_id", user.id);
      if (address.street && address.number && address.zip) {
        const existing = savedAddresses?.find(a => a.street === address.street && a.number === address.number && a.zip === address.zip);
        if (!existing) {
          await supabase.from("saved_addresses").insert({
            user_id: user.id, label: "Casa", street: address.street, number: address.number,
            complement: address.complement || null, neighborhood: address.neighborhood,
            city: address.city, state: address.state, zip: address.zip,
            is_default: !savedAddresses || savedAddresses.length === 0,
          });
        }
      }
    } catch (e) {
      console.error("Auto-save error:", e);
    }
  };

  const createOrder = async () => {
    // Stock validation
    const productIds = items.map((item: any) => (item.products as any)?.id).filter(Boolean);
    const { data: stockData } = await supabase.from("products").select("id, name, stock").in("id", productIds);
    if (stockData) {
      for (const item of items) {
        const product = item.products as any;
        const dbProduct = stockData.find((p) => p.id === product?.id);
        if (dbProduct && dbProduct.stock < item.quantity) {
          throw new Error(`"${dbProduct.name}" tem apenas ${dbProduct.stock} unid. em estoque`);
        }
      }
    }

    const orderItems = items.map((item) => {
      const product = item.products as any;
      return {
        product_id: product?.id, name: product?.name,
        price: Number(product?.price || 0), quantity: item.quantity,
        swatch: item.selected_swatch, image: product?.images?.[0],
      };
    });

    const { data: orderData, error: orderError } = await supabase.from("orders").insert({
      user_id: user.id, total: finalTotal, shipping_address: address,
      payment_method: paymentMethod, items: orderItems,
      coupon_code: appliedCoupon?.code || null, discount: appliedCoupon?.discount || 0,
    }).select("id").single();

    if (orderError) throw orderError;

    // Track influencer commission
    if (appliedCoupon?.code) {
      try {
        const { data: couponData } = await supabase.from("coupons").select("influencer_id").eq("code", appliedCoupon.code).maybeSingle();
        if (couponData && (couponData as any).influencer_id) {
          const influencerId = (couponData as any).influencer_id;
          const { data: infData } = await supabase.from("influencers").select("commission_percent").eq("id", influencerId).single();
          if (infData) {
            const commissionValue = finalTotal * (infData.commission_percent / 100);
            await supabase.from("influencer_commissions").insert({
              influencer_id: influencerId, order_id: orderData.id,
              order_total: finalTotal, commission_percent: infData.commission_percent,
              commission_value: commissionValue,
            });
          }
        }
      } catch (commErr) {
        console.error("Commission tracking error:", commErr);
      }
    }

    await saveDataAfterOrder();
    return orderData.id;
  };


  const getPayer = () => {
    const fullName = user.user_metadata?.full_name || "";
    const parts = fullName.split(" ");
    return {
      email: user.email || "",
      cpf: customerInfo.cpf.replace(/\D/g, ""), // Send digits only to MP
      firstName: parts[0] || "Cliente",
      lastName: parts.slice(1).join(" ") || "",
    };
  };

  const handlePlaceOrder = async () => {
    const cpfDigits = customerInfo.cpf.replace(/\D/g, "");
    if (!cpfDigits || cpfDigits.length !== 11) {
      toast.error("CPF é obrigatório para pagamento (11 dígitos)");
      return;
    }
    if (!isValidCpf(cpfDigits)) {
      toast.error("CPF inválido. Verifique os dígitos.");
      return;
    }
    if (!address.street || !address.number || !address.neighborhood || !address.zip) {
      toast.error("Preencha o endereço completo antes de continuar.");
      setStep("address");
      return;
    }
    setSubmitting(true);
    try {
      const newOrderId = await createOrder();
      setOrderId(newOrderId);

      if (paymentMethod === "whatsapp") {
        const orderItems = items.map((item) => {
          const product = item.products as any;
          return { name: product?.name, price: Number(product?.price || 0), quantity: item.quantity };
        });
        const itemsList = orderItems.map(i => `• ${i.name} (${i.quantity}x) - R$ ${(i.price * i.quantity).toFixed(2).replace(".", ",")}`).join('\n');
        const msg = encodeURIComponent(
          `🛒 *Novo Pedido #${newOrderId.slice(0, 8)}*\n\n${itemsList}\n\n💰 Total: R$ ${finalTotal.toFixed(2).replace(".", ",")}\n📍 ${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}\n\nForma de pagamento: Combinar pelo WhatsApp`
        );
        await clearCart();
        window.open(`https://wa.me/5591983045531?text=${msg}`, '_blank');
        setStep("success");
        toast.success("Pedido enviado pelo WhatsApp! 🎉");
        return;
      }

      // Process payment via Mercado Pago
      setStep("processing");
      const payer = getPayer();

      if (paymentMethod === "pix") {
        const result = await payment.createPixPayment(finalTotal, payer, newOrderId);
        if (result) {
          setPaymentId(String(result.id));
          setPixData({ qr_code: result.qr_code, qr_code_base64: result.qr_code_base64 });
          setStep("payment");
        } else {
          throw new Error(payment.error || "Erro ao gerar PIX");
        }
      } else if (paymentMethod === "boleto") {
        const result = await payment.createBoletoPayment(finalTotal, payer, newOrderId);
        if (result) {
          setPaymentId(String(result.id));
          setBoletoData({ barcode: result.barcode, boleto_url: result.boleto_url });
          setStep("payment");
        } else {
          throw new Error(payment.error || "Erro ao gerar boleto");
        }
      } else if (paymentMethod === "card") {
        // For card, we need to show the card form first for tokenization
        setStep("payment");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao finalizar pedido");
      setStep("review");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Código copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const stepIndex = step === "address" ? 0 : step === "review" ? 1 : 2;

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => step === "address" ? navigate("/carrinho") : step === "review" ? setStep("address") : step === "payment" ? setStep("review") : null} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-display font-bold">
          {step === "success" ? "Pedido Confirmado" : step === "processing" ? "Processando..." : step === "payment" ? "Pagamento" : "Finalizar Compra"}
        </h1>
      </div>

      {/* Progress */}
      {step !== "success" && step !== "processing" && (
        <div className="flex items-center gap-2 mb-6">
          {STEP_LABELS.map((s, i) => (
            <div key={s.key} className="flex items-center flex-1">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                i <= stepIndex ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
              </div>
              {i < STEP_LABELS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 rounded-full ${i < stepIndex ? "bg-primary" : "bg-muted"}`} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Free shipping bar */}
      {step === "address" && <div className="mb-4"><FreeShippingBar /></div>}

      {/* Mini summary */}
      {step === "address" && (
        <div className="bg-card rounded-xl p-3 border border-border mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium">{cartCount} {cartCount === 1 ? "item" : "itens"}</span>
            </div>
            <span className="text-sm font-bold text-primary">R$ {cartTotal.toFixed(2).replace(".", ",")}</span>
          </div>
          <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide">
            {items.slice(0, 4).map((item) => {
              const product = item.products as any;
              return (
                <div key={item.id} className="w-10 h-10 rounded-md bg-muted overflow-hidden flex-shrink-0">
                  {product?.images?.[0] && <img src={product.images[0]} alt="" className="w-full h-full object-cover" />}
                </div>
              );
            })}
            {items.length > 4 && (
              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] text-muted-foreground font-bold">+{items.length - 4}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── ADDRESS STEP ── */}
        {step === "address" && (
          <motion.div key="address" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-display font-semibold">Endereço de Entrega</h2>
              </div>
              {savedAddresses && savedAddresses.length > 0 && (
                <button onClick={() => setShowAddressPicker(!showAddressPicker)} className="text-xs text-primary font-medium flex items-center gap-1">
                  Endereços salvos
                  <ChevronDown className={`w-3 h-3 transition-transform ${showAddressPicker ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>

            <AnimatePresence>
              {showAddressPicker && savedAddresses && savedAddresses.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="space-y-2 mb-4">
                    {savedAddresses.map((addr) => (
                      <button key={addr.id} onClick={() => selectSavedAddress(addr)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                          address.street === addr.street && address.number === addr.number && address.zip === addr.zip
                            ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                        }`}>
                        <p className="text-xs font-semibold">{addr.label} {addr.is_default && <span className="text-primary">(padrão)</span>}</p>
                        <p className="text-[10px] text-muted-foreground">{addr.street}, {addr.number} - {addr.neighborhood}, {addr.city}/{addr.state}</p>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label>CEP</Label>
              <div className="relative">
                <Input value={address.zip} onChange={(e) => setAddress({ ...address, zip: e.target.value.replace(/\D/g, "").slice(0, 8) })} placeholder="66000-000" className="bg-muted border-none min-h-[44px]" inputMode="numeric" required />
                {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
              </div>
              <p className="text-[10px] text-muted-foreground">Digite o CEP para preencher automaticamente</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label>Rua</Label>
                <Input value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} placeholder="Nome da rua" className="bg-muted border-none min-h-[44px]" required />
              </div>
              <div className="space-y-2">
                <Label>Nº</Label>
                <Input value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} placeholder="123" className="bg-muted border-none min-h-[44px]" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Complemento</Label>
              <Input value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} placeholder="Apt, bloco..." className="bg-muted border-none min-h-[44px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Bairro</Label><Input value={address.neighborhood} onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })} placeholder="Bairro" className="bg-muted border-none min-h-[44px]" required /></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2"><Label>Cidade</Label><Input value={address.city} disabled className="bg-muted border-none min-h-[44px]" /></div>
                <div className="space-y-2"><Label>UF</Label><Input value={address.state} disabled className="bg-muted border-none min-h-[44px]" /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>CPF *</Label>
                <Input value={formatCpf(customerInfo.cpf)} onChange={(e) => setCustomerInfo({ ...customerInfo, cpf: e.target.value.replace(/\D/g, "").slice(0, 11) })} placeholder="000.000.000-00" className="bg-muted border-none min-h-[44px]" inputMode="numeric" required />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={formatPhone(customerInfo.phone)} onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })} placeholder="(91) 99999-9999" className="bg-muted border-none min-h-[44px]" inputMode="tel" />
              </div>
            </div>
            <Button onClick={() => setStep("review")} disabled={!address.street || !address.number || !address.neighborhood || !address.zip || !customerInfo.cpf || customerInfo.cpf.length < 11} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px] mt-4">
              Continuar para Revisão
            </Button>
          </motion.div>
        )}

        {/* ── REVIEW STEP ── */}
        {step === "review" && (
          <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="bg-card rounded-xl p-4 border border-border space-y-3">
              <h3 className="text-sm font-medium">Itens ({cartCount})</h3>
              {items.map((item) => {
                const product = item.products as any;
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      {product?.images?.[0] && <img src={product.images[0]} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-1">{product?.name}</p>
                      <p className="text-[10px] text-muted-foreground">Qtd: {item.quantity}</p>
                    </div>
                    <p className="text-xs font-bold text-primary">R$ {(Number(product?.price || 0) * item.quantity).toFixed(2).replace(".", ",")}</p>
                  </div>
                );
              })}
            </div>

            {/* Coupon */}
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-medium">Cupom de Desconto</h3>
              </div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-accent/10 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-xs font-bold text-accent">{appliedCoupon.code}</p>
                    <p className="text-[10px] text-muted-foreground">-R$ {appliedCoupon.discount.toFixed(2).replace(".", ",")}</p>
                  </div>
                  <button onClick={() => setAppliedCoupon(null)} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="CODIGO" className="bg-muted border-none min-h-[36px] text-xs uppercase" />
                  <Button size="sm" variant="outline" onClick={handleApplyCoupon} disabled={couponLoading} className="text-xs">
                    {couponLoading ? "..." : "Aplicar"}
                  </Button>
                </div>
              )}
            </div>

            {/* Shipping */}
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-2"><MapPin className="w-4 h-4 text-primary" /><h3 className="text-sm font-medium">Entrega</h3></div>
              <p className="text-xs text-muted-foreground mb-3">{address.street}, {address.number} {address.complement && `- ${address.complement}`}<br />{address.neighborhood}, {address.city} - {address.state}<br />CEP: {address.zip}</p>
              <ShippingCalculator
                cep={shipping.cep || address.zip} onCepChange={shipping.setCep}
                onCalculate={shipping.calculateShipping} loading={shipping.loading}
                error={shipping.error} options={shipping.options}
                selectedOption={shipping.selectedOption} onSelectOption={shipping.selectOption}
                isLocal={shipping.isLocal} addressInfo={shipping.addressInfo} compact
              />
            </div>

            {/* Payment method */}
            <div className="bg-card rounded-xl p-4 border border-border space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-medium">Forma de Pagamento</h3>
              </div>
              <div className="space-y-2">
                {([
                  { method: "pix" as PaymentMethod, icon: QrCode, label: "PIX", desc: "Aprovação instantânea • 5% de desconto" },
                  { method: "card" as PaymentMethod, icon: CreditCard, label: "Cartão de Crédito", desc: "Até 12x • Visa, Master, Elo, Amex" },
                  { method: "boleto" as PaymentMethod, icon: Barcode, label: "Boleto Bancário", desc: "Prazo de 1-3 dias úteis para compensar" },
                  { method: "whatsapp" as PaymentMethod, icon: WhatsAppIcon, label: "WhatsApp", desc: "Combine o pagamento com a loja" },
                ] as { method: PaymentMethod; icon: any; label: string; desc: string }[]).map(({ method, icon: Icon, label, desc }) => {
                  const isWhatsApp = method === "whatsapp";
                  const colorClass = isWhatsApp ? "accent" : "primary";
                  return (
                    <button key={method} onClick={() => setPaymentMethod(method)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                        paymentMethod === method
                          ? isWhatsApp ? "border-accent bg-accent/5" : "border-primary bg-primary/5"
                          : "border-border"
                      }`}>
                      <Icon className={isWhatsApp ? "w-5 h-5 text-accent" : "w-5 h-5 text-primary"} />
                      <div className="text-left flex-1">
                        <p className="text-xs font-semibold">{label}</p>
                        <p className="text-[10px] text-muted-foreground">{desc}</p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        paymentMethod === method
                          ? isWhatsApp ? "border-accent" : "border-primary"
                          : "border-muted-foreground"
                      }`}>
                        {paymentMethod === method && <div className={`w-2 h-2 rounded-full ${isWhatsApp ? "bg-accent" : "bg-primary"}`} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-card rounded-xl p-4 border border-border space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>R$ {cartTotal.toFixed(2).replace(".", ",")}</span></div>
               {appliedCoupon && (
                <div className="flex justify-between text-sm"><span className="text-accent">Cupom {appliedCoupon.code}</span><span className="text-accent">-R$ {appliedCoupon.discount.toFixed(2).replace(".", ",")}</span></div>
              )}
              {paymentMethod === "pix" && pixDiscount > 0 && (
                <div className="flex justify-between text-sm"><span className="text-accent">Desconto PIX (5%)</span><span className="text-accent">-R$ {(subtotalAfterCoupon * pixDiscount).toFixed(2).replace(".", ",")}</span></div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frete</span>
                {shipping.selectedShipping ? (
                  freeShipping ? <span className="text-accent font-medium">Grátis</span> :
                  shipping.selectedShipping.price !== null ? <span>R$ {shipping.selectedShipping.price.toFixed(2).replace(".", ",")}</span> :
                  <span className="text-accent">A combinar</span>
                ) : <span className="text-muted-foreground text-xs">Calcule acima</span>}
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-display font-bold">Total</span>
                <span className="font-bold text-lg text-primary">R$ {finalTotal.toFixed(2).replace(".", ",")}</span>
              </div>
              {paymentMethod === "pix" && pixDiscount > 0 && (
                <p className="text-[10px] text-accent font-semibold text-center">💰 Desconto PIX de 5% já aplicado!</p>
              )}
            </div>

            {/* Order Bump */}
            <OrderBump cartProductIds={items.map((item: any) => (item.products as any)?.id).filter(Boolean)} />

            {/* Trust Badges */}
            <TrustBadges />

            <Button onClick={handlePlaceOrder} disabled={submitting} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 min-h-[48px] font-semibold shadow-marsala">
              {submitting ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando...</>
              ) : paymentMethod === "whatsapp" ? (
                <><WhatsAppIcon className="w-5 h-5 mr-2" /> Enviar Pedido pelo WhatsApp</>
              ) : paymentMethod === "pix" ? (
                <>💰 Pagar com PIX (5% OFF)</>
              ) : (
                <><CreditCard className="w-5 h-5 mr-2" /> Finalizar Compra Segura 🔒</>
              )}
            </Button>
          </motion.div>
        )}

        {/* ── PAYMENT STEP (PIX / Boleto result) ── */}
        {step === "payment" && (
          <motion.div key="payment" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            {/* Payment status indicator */}
            {paymentId && (
              <PaymentStatusBadge status={paymentStatus} polling={isPolling} detail={paymentStatusDetail} />
            )}

            {pixData && (
              <div className="bg-card rounded-xl p-6 border border-border text-center space-y-4">
                <QrCode className="w-10 h-10 text-primary mx-auto" />
                <h2 className="text-lg font-display font-bold">Pague com PIX</h2>
                <p className="text-xs text-muted-foreground">Escaneie o QR Code ou copie o código abaixo</p>
                {pixData.qr_code_base64 && (
                  <div className="flex justify-center">
                    <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code PIX" className="w-48 h-48 rounded-lg" />
                  </div>
                )}
                {pixData.qr_code && (
                  <div className="space-y-2">
                    <div className="bg-muted rounded-lg p-3 text-xs break-all font-mono max-h-24 overflow-y-auto">
                      {pixData.qr_code}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(pixData.qr_code)} className="gap-2 text-xs">
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copiado!" : "Copiar código PIX"}
                    </Button>
                  </div>
                )}
                <div className="pt-2">
                  <p className="text-[10px] text-muted-foreground">
                    {isPolling ? "Aguardando confirmação do pagamento..." : "Após o pagamento, o pedido será confirmado automaticamente."}
                  </p>
                  {isPolling && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-[10px] text-amber-600 font-medium">Verificando pagamento a cada 5s</span>
                    </div>
                  )}
                  <Button onClick={() => setStep("success")} variant="ghost" className="mt-3 text-xs">
                    Já realizei o pagamento →
                  </Button>
                </div>
              </div>
            )}

            {boletoData && (
              <div className="bg-card rounded-xl p-6 border border-border text-center space-y-4">
                <Barcode className="w-10 h-10 text-primary mx-auto" />
                <h2 className="text-lg font-display font-bold">Boleto Gerado</h2>
                <p className="text-xs text-muted-foreground">Copie o código de barras ou abra o boleto</p>
                {boletoData.barcode && (
                  <div className="space-y-2">
                    <div className="bg-muted rounded-lg p-3 text-xs break-all font-mono">
                      {boletoData.barcode}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(boletoData.barcode)} className="gap-2 text-xs">
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copiado!" : "Copiar código de barras"}
                    </Button>
                  </div>
                )}
                {boletoData.boleto_url && (
                  <Button onClick={() => window.open(boletoData.boleto_url, "_blank")} className="gap-2 w-full min-h-[44px]">
                    <Barcode className="w-4 h-4" />
                    Abrir Boleto
                  </Button>
                )}
                <Button onClick={() => setStep("success")} variant="ghost" className="text-xs">
                  Já realizei o pagamento →
                </Button>
              </div>
            )}

            {/* Card form */}
            {paymentMethod === "card" && !pixData && !boletoData && (
              <CardPaymentForm
                amount={finalTotal}
                cpf={customerInfo.cpf.replace(/\D/g, "")}
                onCancel={() => setStep("review")}
                loading={payment.loading}
                onTokenized={async ({ token, paymentMethodId: pmId, installments: inst, issuerId: issId }) => {
                  setStep("processing");
                  try {
                    const payer = getPayer();
                    const result = await payment.createCardPayment(
                      finalTotal, token, inst, pmId, payer, orderId, issId
                    );
                    if (result) {
                      setPaymentId(String(result.id));
                      if (result.status === "approved") {
                        toast.success("Pagamento aprovado! 🎉");
                        await clearCart();
                        setStep("success");
                      } else if (result.status === "in_process" || result.status === "pending") {
                        toast.info("Pagamento em análise. Você será notificado.");
                        setStep("success");
                      } else {
                        toast.error(`Pagamento recusado: ${result.status_detail || result.status}`);
                        setStep("payment");
                      }
                    } else {
                      throw new Error(payment.error || "Erro ao processar cartão");
                    }
                  } catch (err: any) {
                    toast.error(err.message || "Erro ao processar pagamento");
                    setStep("payment");
                  }
                }}
              />
            )}
          </motion.div>
        )}

        {/* ── PROCESSING ── */}
        {step === "processing" && (
          <motion.div key="processing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
            <h2 className="text-lg font-display font-bold">Processando pagamento...</h2>
            <p className="text-sm text-muted-foreground">Aguarde enquanto geramos seu pagamento</p>
          </motion.div>
        )}

        {/* ── SUCCESS ── */}
        {step === "success" && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 space-y-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
              <CheckCircle className="w-20 h-20 text-accent mx-auto" />
            </motion.div>
            <h2 className="text-2xl font-display font-bold">Pedido Registrado!</h2>
            <p className="text-sm text-muted-foreground">
              Seu pedido #{orderId.slice(0, 8)} foi recebido com sucesso.
              {paymentMethod === "pix" && <><br />O pagamento será confirmado automaticamente.</>}
              {paymentMethod === "boleto" && <><br />Aguarde a compensação do boleto (1-3 dias úteis).</>}
            </p>
            <div className="flex flex-col gap-2 pt-4">
              <Button onClick={() => navigate("/pedidos")} className="bg-primary text-primary-foreground min-h-[44px]">Ver Meus Pedidos</Button>
              <Button variant="outline" onClick={() => navigate("/")} className="min-h-[44px]">Voltar à Loja</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Checkout;
