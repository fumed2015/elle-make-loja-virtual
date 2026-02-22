import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, CreditCard, CheckCircle, Tag, X, ExternalLink, Loader2, ShoppingBag, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useCoupon } from "@/hooks/useCoupon";
import { useShipping } from "@/hooks/useShipping";
import ShippingCalculator from "@/components/shipping/ShippingCalculator";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

type Step = "address" | "review" | "processing" | "success";

const STEP_LABELS = [
  { key: "address", label: "Endereço", icon: MapPin },
  { key: "review", label: "Revisão", icon: ShoppingBag },
];

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, cartTotal, cartCount, isLoading: cartLoading } = useCart();
  const { validateCoupon } = useCoupon();
  const shipping = useShipping();
  const [step, setStep] = useState<Step>("address");
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"yampi" | "whatsapp">("yampi");
  const [cepLoading, setCepLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ phone: "", cpf: "" });
  const [address, setAddress] = useState({
    street: "", number: "", complement: "", neighborhood: "",
    city: "Belém", state: "PA", zip: "",
  });

  // Auto-fill address from CEP via ViaCEP
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

    return () => { cancelled = true; };
  }, [address.zip]);

  // Redirect unauthenticated users (must be in useEffect, not during render)
  useEffect(() => {
    if (!user) navigate("/perfil?redirect=/checkout", { replace: true });
  }, [user, navigate]);

  // Redirect if cart is empty (only after loading finishes)
  useEffect(() => {
    if (!cartLoading && items.length === 0 && step !== "success" && step !== "processing") {
      navigate("/carrinho", { replace: true });
    }
  }, [items.length, step, navigate, cartLoading]);

  // Pre-fill customer info from profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("phone, full_name").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data?.phone) setCustomerInfo(prev => ({ ...prev, phone: prev.phone || data.phone }));
    });
  }, [user]);

  if (!user) return null;
  if (cartLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (items.length === 0 && step !== "success" && step !== "processing") return null;

  const shippingCost = shipping.selectedShipping?.price ?? 0;
  const freeShipping = cartTotal >= 199 && shipping.isLocal;
  const finalTotal = Math.max(0, cartTotal + (freeShipping ? 0 : shippingCost) - (appliedCoupon?.discount || 0));

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

  const handlePlaceOrder = async () => {
    setSubmitting(true);
    try {
      // Stock validation
      const productIds = items.map((item: any) => (item.products as any)?.id).filter(Boolean);
      const { data: stockData } = await supabase
        .from("products")
        .select("id, name, stock")
        .in("id", productIds);

      if (stockData) {
        for (const item of items) {
          const product = item.products as any;
          const dbProduct = stockData.find((p) => p.id === product?.id);
          if (dbProduct && dbProduct.stock < item.quantity) {
            toast.error(`"${dbProduct.name}" tem apenas ${dbProduct.stock} unid. em estoque`);
            setSubmitting(false);
            return;
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
        user_id: user.id, total: finalTotal,
        shipping_address: address, payment_method: paymentMethod,
        items: orderItems, coupon_code: appliedCoupon?.code || null,
        discount: appliedCoupon?.discount || 0,
      }).select("id").single();

      if (orderError) throw orderError;

      // Track influencer commission if coupon belongs to an influencer
      if (appliedCoupon?.code) {
        try {
          const { data: couponData } = await supabase
            .from("coupons")
            .select("influencer_id")
            .eq("code", appliedCoupon.code)
            .maybeSingle();
          
          if (couponData && (couponData as any).influencer_id) {
            const influencerId = (couponData as any).influencer_id;
            const { data: infData } = await supabase
              .from("influencers")
              .select("commission_percent")
              .eq("id", influencerId)
              .single();
            
            if (infData) {
              const commissionValue = finalTotal * (infData.commission_percent / 100);
              await supabase.from("influencer_commissions").insert({
                influencer_id: influencerId,
                order_id: orderData.id,
                order_total: finalTotal,
                commission_percent: infData.commission_percent,
                commission_value: commissionValue,
              });
            }
          }
        } catch (commErr) {
          console.error("Commission tracking error:", commErr);
        }
      }

      // Clear cart (batch delete)
      const cartIds = items.map((i: any) => i.id).filter(Boolean);
      if (cartIds.length > 0) {
        await supabase.from("cart_items").delete().in("id", cartIds);
      }

      setOrderId(orderData.id);

      if (paymentMethod === "whatsapp") {
        const itemsList = orderItems.map(i => `• ${i.name} (${i.quantity}x) - R$ ${(i.price * i.quantity).toFixed(2).replace(".", ",")}`).join('\n');
        const msg = encodeURIComponent(
          `🛒 *Novo Pedido #${orderData.id.slice(0, 8)}*\n\n${itemsList}\n\n💰 Total: R$ ${finalTotal.toFixed(2).replace(".", ",")}\n📍 ${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}\n\nForma de pagamento: Combinar pelo WhatsApp`
        );
        window.open(`https://wa.me/5591983045531?text=${msg}`, '_blank');
        setStep("success");
        toast.success("Pedido enviado pelo WhatsApp! 🎉");
      } else {
        setStep("processing");
        try {
          const { data: yampiData, error: yampiError } = await supabase.functions.invoke('yampi-checkout', {
            body: {
              action: 'create-order',
              items: orderItems,
              customer: {
                name: user.user_metadata?.full_name || '',
                email: user.email || '',
                phone: customerInfo.phone || '',
                cpf: customerInfo.cpf || '',
              },
              address,
              total: finalTotal,
              discount: appliedCoupon?.discount || 0,
              coupon_code: appliedCoupon?.code,
              supabase_order_id: orderData.id,
            },
          });
          if (yampiError) throw yampiError;
          if (yampiData?.checkout_url) window.open(yampiData.checkout_url, '_blank');
          setStep("success");
          toast.success("Pedido criado! Complete o pagamento no checkout Yampi 🎉");
        } catch (yampiErr: any) {
          console.error('Yampi error:', yampiErr);
          window.open('https://elle-make.checkout.yampi.com.br', '_blank');
          setStep("success");
          toast.success("Pedido registrado! Complete o pagamento no checkout Yampi 🎉");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao finalizar pedido");
      setStep("review");
    } finally {
      setSubmitting(false);
    }
  };

  const stepIndex = step === "address" ? 0 : 1;

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => step === "address" ? navigate("/carrinho") : step === "review" ? setStep("address") : null} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-display font-bold">
          {step === "success" ? "Pedido Confirmado" : step === "processing" ? "Processando..." : "Finalizar Compra"}
        </h1>
      </div>

      {/* Progress indicator */}
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

      {/* Mini order summary — always visible in address step */}
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
        {step === "address" && (
          <motion.div key="address" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-display font-semibold">Endereço de Entrega</h2>
            </div>

            {/* CEP first — triggers auto-fill */}
            <div className="space-y-2">
              <Label>CEP</Label>
              <div className="relative">
                <Input
                  value={address.zip}
                  onChange={(e) => setAddress({ ...address, zip: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                  placeholder="66000-000"
                  className="bg-muted border-none min-h-[44px]"
                  inputMode="numeric"
                  required
                />
                {cepLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">Digite o CEP para preencher o endereço automaticamente</p>
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
                <Label>CPF</Label>
                <Input value={customerInfo.cpf} onChange={(e) => setCustomerInfo({ ...customerInfo, cpf: e.target.value.replace(/\D/g, "").slice(0, 11) })} placeholder="000.000.000-00" className="bg-muted border-none min-h-[44px]" inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={customerInfo.phone} onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })} placeholder="(91) 99999-9999" className="bg-muted border-none min-h-[44px]" inputMode="tel" />
              </div>
            </div>
            <Button onClick={() => setStep("review")} disabled={!address.street || !address.number || !address.neighborhood || !address.zip} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px] mt-4">
              Continuar para Revisão
            </Button>
          </motion.div>
        )}

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
                  <button onClick={() => setAppliedCoupon(null)} className="text-muted-foreground hover:text-destructive">
                    <X className="w-4 h-4" />
                  </button>
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

            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-2"><MapPin className="w-4 h-4 text-primary" /><h3 className="text-sm font-medium">Entrega</h3></div>
              <p className="text-xs text-muted-foreground mb-3">{address.street}, {address.number} {address.complement && `- ${address.complement}`}<br />{address.neighborhood}, {address.city} - {address.state}<br />CEP: {address.zip}</p>
              <ShippingCalculator
                cep={shipping.cep || address.zip}
                onCepChange={shipping.setCep}
                onCalculate={shipping.calculateShipping}
                loading={shipping.loading}
                error={shipping.error}
                options={shipping.options}
                selectedOption={shipping.selectedOption}
                onSelectOption={shipping.selectOption}
                isLocal={shipping.isLocal}
                addressInfo={shipping.addressInfo}
                compact
              />
            </div>

            {/* Payment Method Selection */}
            <div className="bg-card rounded-xl p-4 border border-border space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-medium">Forma de Pagamento</h3>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => setPaymentMethod("yampi")}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${paymentMethod === "yampi" ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <CreditCard className="w-5 h-5 text-primary" />
                  <div className="text-left flex-1">
                    <p className="text-xs font-semibold">Checkout Seguro (Yampi)</p>
                    <p className="text-[10px] text-muted-foreground">Pix, Cartão, Boleto — com proteção ao comprador</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === "yampi" ? "border-primary" : "border-muted-foreground"}`}>
                    {paymentMethod === "yampi" && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                </button>
                <button
                  onClick={() => setPaymentMethod("whatsapp")}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${paymentMethod === "whatsapp" ? "border-accent bg-accent/5" : "border-border"}`}
                >
                  <WhatsAppIcon className="w-5 h-5 text-accent" />
                  <div className="text-left flex-1">
                    <p className="text-xs font-semibold">WhatsApp</p>
                    <p className="text-[10px] text-muted-foreground">Combine o pagamento diretamente com a loja</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${paymentMethod === "whatsapp" ? "border-accent" : "border-muted-foreground"}`}>
                    {paymentMethod === "whatsapp" && <div className="w-2 h-2 rounded-full bg-accent" />}
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>R$ {cartTotal.toFixed(2).replace(".", ",")}</span></div>
              {appliedCoupon && (
                <div className="flex justify-between text-sm"><span className="text-accent">Cupom {appliedCoupon.code}</span><span className="text-accent">-R$ {appliedCoupon.discount.toFixed(2).replace(".", ",")}</span></div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frete</span>
                {shipping.selectedShipping ? (
                  freeShipping ? (
                    <span className="text-accent font-medium">Grátis</span>
                  ) : shipping.selectedShipping.price !== null ? (
                    <span>R$ {shipping.selectedShipping.price.toFixed(2).replace(".", ",")}</span>
                  ) : (
                    <span className="text-accent">A combinar</span>
                  )
                ) : (
                  <span className="text-muted-foreground text-xs">Calcule acima</span>
                )}
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-display font-bold">Total</span>
                <span className="font-bold text-lg text-primary">R$ {finalTotal.toFixed(2).replace(".", ",")}</span>
              </div>
              <p className="text-[10px] text-accent font-semibold text-center">
                💰 No Pix: R$ {(finalTotal * 0.95).toFixed(2).replace(".", ",")} (5% off)
              </p>
            </div>

            <Button onClick={handlePlaceOrder} disabled={submitting} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 min-h-[48px] font-semibold shadow-marsala">
              {submitting ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processando...</>
              ) : paymentMethod === "yampi" ? (
                <><ExternalLink className="w-5 h-5 mr-2" /> Ir para Pagamento Seguro</>
              ) : (
                <><WhatsAppIcon className="w-5 h-5 mr-2" /> Enviar Pedido pelo WhatsApp</>
              )}
            </Button>
          </motion.div>
        )}

        {step === "processing" && (
          <motion.div key="processing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
            <h2 className="text-lg font-display font-bold">Preparando seu checkout...</h2>
            <p className="text-sm text-muted-foreground">Você será redirecionado para o pagamento seguro</p>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 space-y-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
              <CheckCircle className="w-20 h-20 text-accent mx-auto" />
            </motion.div>
            <h2 className="text-2xl font-display font-bold">Pedido Registrado!</h2>
            <p className="text-sm text-muted-foreground">
              Seu pedido #{orderId.slice(0, 8)} foi recebido com sucesso.
              {paymentMethod === "yampi" && <><br />Complete o pagamento na janela do checkout Yampi que abriu.</>}
            </p>
            {paymentMethod === "yampi" && (
              <Button
                variant="outline"
                onClick={() => window.open('https://elle-make.checkout.yampi.com.br', '_blank')}
                className="text-xs gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Abrir Checkout Novamente
              </Button>
            )}
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
