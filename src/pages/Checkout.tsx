import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, ShoppingBag, CreditCard, Loader2 } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useCoupon } from "@/hooks/useCoupon";
import { useShipping } from "@/hooks/useShipping";
import { useAddresses } from "@/hooks/useAddresses";
import { usePayment, usePaymentStatusPolling, type PaymentMethod } from "@/hooks/usePayment";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { trackInitiateCheckout, trackPurchase } from "@/hooks/useTikTokPixel";
import { fbTrackInitiateCheckout, fbTrackPurchase, fbTrackAddPaymentInfo, fbSetUserData } from "@/hooks/useMetaPixel";

import AddressStep from "@/components/checkout/AddressStep";
import ReviewStep from "@/components/checkout/ReviewStep";
import PaymentStep from "@/components/checkout/PaymentStep";
import SuccessStep from "@/components/checkout/SuccessStep";
import OrderSummaryDesktop from "@/components/checkout/OrderSummaryDesktop";

type Step = "address" | "review" | "payment" | "processing" | "success";

const STEP_LABELS = [
  { key: "address", label: "Endereço", icon: MapPin },
  { key: "review", label: "Revisão", icon: ShoppingBag },
  { key: "payment", label: "Pagamento", icon: CreditCard },
];

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

const isValidCpf = (cpf: string): boolean => {
  const digits = cpf.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
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
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number; influencer_id?: string | null } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [cepLoading, setCepLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({ phone: "", cpf: "" });
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [addressLoaded, setAddressLoaded] = useState(false);
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  const [guestInfo, setGuestInfo] = useState({ name: "", email: "", phone: "" });

  const [pixData, setPixData] = useState<{ qr_code: string; qr_code_base64: string } | null>(null);
  const [boletoData, setBoletoData] = useState<{ barcode: string; boleto_url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  // Pixels: InitiateCheckout
  useEffect(() => {
    if (cartTotal > 0) {
      trackInitiateCheckout({ value: cartTotal, itemCount: cartCount });
      const contentIds = items.map((item: any) => (item.products as any)?.id).filter(Boolean);
      const contents = items.map((item: any) => ({ id: (item.products as any)?.id, quantity: item.quantity })).filter((c: any) => c.id);
      fbTrackInitiateCheckout({ value: cartTotal, itemCount: cartCount, contentIds, contents });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cart abandonment tracking
  useEffect(() => {
    if (!user || !cartTotal || step === "success" || step === "processing") return;
    const timer = setTimeout(() => {
      supabase.from("cart_abandonment_events").insert({
        user_id: user.id, step, cart_total: cartTotal, items_count: items.length,
      } as any).then(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, [step, user]);

  // Ghost lead capture: save phone to checkout_leads as user types
  const ghostLeadTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!user || step === "success" || step === "processing") return;
    const phoneDigits = customerInfo.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) return; // need at least 10 digits

    if (ghostLeadTimer.current) clearTimeout(ghostLeadTimer.current);
    ghostLeadTimer.current = setTimeout(() => {
      const firstName = user.user_metadata?.full_name?.split(" ")[0] || "Cliente";
      supabase.from("checkout_leads").upsert({
        user_id: user.id,
        phone: phoneDigits,
        first_name: firstName,
        step,
        cart_total: cartTotal,
        items_count: items.length,
        updated_at: new Date().toISOString(),
      } as any, { onConflict: "user_id", ignoreDuplicates: false }).then(() => {});
    }, 2000); // debounce 2s

    return () => { if (ghostLeadTimer.current) clearTimeout(ghostLeadTimer.current); };
  }, [customerInfo.phone, step, user, cartTotal, items.length]);

  const clearCart = useCallback(async () => {
    if (user) {
      const cartIds = items.map((i: any) => i.id).filter(Boolean);
      if (cartIds.length > 0) await supabase.from("cart_items").delete().in("id", cartIds);
    } else {
      // Clear guest cart from localStorage
      try { localStorage.removeItem("ellemake_guest_cart"); } catch {}
    }
  }, [items, user]);

  const { status: paymentStatus, statusDetail: paymentStatusDetail, polling: isPolling } = usePaymentStatusPolling(
    step === "payment" && paymentId ? paymentId : null, 5000, orderId || null
  );

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
  const [pendingShippingCalc, setPendingShippingCalc] = useState(false);
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
      setShippingAutoCalculated(true);
      setPendingShippingCalc(true);
    }
    return () => { cancelled = true; };
  }, [address.zip]);

  useEffect(() => {
    if (pendingShippingCalc) {
      setPendingShippingCalc(false);
      shipping.calculateShipping();
    }
  }, [pendingShippingCalc]);

  // No longer redirect unauthenticated — guest checkout is allowed

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

  if (authLoading) return (
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
      setAppliedCoupon({ code: result.coupon.code, discount: result.discount, influencer_id: result.coupon.influencer_id });
      toast.success(`Cupom aplicado! -R$ ${result.discount.toFixed(2).replace(".", ",")} 🎉`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCouponLoading(false);
    }
  };

  const saveDataAfterOrder = async () => {
    if (!user) return;
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

    const orderPayload: any = {
      total: finalTotal, shipping_address: address,
      payment_method: paymentMethod, items: orderItems,
      coupon_code: appliedCoupon?.code || null, discount: appliedCoupon?.discount || 0,
    };

    if (user) {
      orderPayload.user_id = user.id;
    } else {
      orderPayload.guest_name = guestInfo.name;
      orderPayload.guest_email = guestInfo.email;
      orderPayload.guest_phone = guestInfo.phone || customerInfo.phone;
    }

    const { data: orderData, error: orderError } = await supabase.from("orders").insert(orderPayload).select("id").single();

    if (orderError) throw orderError;

    if (appliedCoupon?.influencer_id && user) {
      try {
        await supabase.rpc("record_influencer_commission", {
          p_order_id: orderData.id,
          p_influencer_id: appliedCoupon.influencer_id,
        });
      } catch (commErr) {
        console.error("Commission tracking error:", commErr);
      }
    }

    try {
      await supabase.functions.invoke("whatsapp-notifications", {
        body: { action: "notify-order", order_id: orderData.id, event_type: "order.created" },
      });
    } catch (notifErr) {
      console.error("WhatsApp order.created notification error:", notifErr);
    }

    await saveDataAfterOrder();

    trackPurchase({ orderId: orderData.id, value: finalTotal, itemCount: cartCount });
    const contentIds = items.map((item: any) => (item.products as any)?.id).filter(Boolean);
    const contents = items.map((item: any) => ({ id: (item.products as any)?.id, quantity: item.quantity })).filter((c: any) => c.id);

    // Enrich Meta Advanced Matching with checkout data (address + CPF)
    const addr = (address || {}) as any;
    const emailForPixel = user?.email || guestInfo.email || "";
    const nameForPixel = user?.user_metadata?.full_name || guestInfo.name || "";
    fbSetUserData({
      email: emailForPixel,
      phone: user?.user_metadata?.phone || guestInfo.phone || customerInfo.phone || "",
      firstName: nameForPixel.split(" ")[0] || "",
      lastName: nameForPixel.split(" ").slice(1).join(" ") || "",
      city: addr.city || "",
      state: addr.state || "",
      zip: addr.zip || addr.cep || "",
      country: "br",
      externalId: user?.id || "",
    });

    fbTrackPurchase({ orderId: orderData.id, value: finalTotal, itemCount: cartCount, contentIds, contents });

    // Mark ghost lead as converted
    if (user) {
      supabase.from("checkout_leads").update({ converted_at: new Date().toISOString() } as any)
        .eq("user_id", user.id).is("converted_at" as any, null).then(() => {});
    }

    return orderData.id;
  };

  const getPayer = () => {
    const fullName = user?.user_metadata?.full_name || guestInfo.name || "";
    const parts = fullName.split(" ");
    return {
      email: user?.email || guestInfo.email || "",
      cpf: customerInfo.cpf.replace(/\D/g, ""),
      firstName: parts[0] || "Cliente",
      lastName: parts.slice(1).join(" ") || "",
    };
  };

  const handlePlaceOrder = async () => {
    const cpfDigits = customerInfo.cpf.replace(/\D/g, "");
    if (!cpfDigits || cpfDigits.length !== 11) { toast.error("CPF é obrigatório para pagamento (11 dígitos)"); return; }
    if (!isValidCpf(cpfDigits)) { toast.error("CPF inválido. Verifique os dígitos."); return; }
    if (!address.street || !address.number || !address.neighborhood || !address.zip) {
      toast.error("Preencha o endereço completo antes de continuar.");
      setStep("address"); return;
    }
    setSubmitting(true);
    // Fire AddPaymentInfo event
    const contentIds = items.map((item: any) => (item.products as any)?.id).filter(Boolean);
    const contents = items.map((item: any) => ({ id: (item.products as any)?.id, quantity: item.quantity })).filter((c: any) => c.id);
    fbTrackAddPaymentInfo({ value: finalTotal, contentIds, paymentMethod, contents });
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
        window.open(`https://wa.me/5591936180774?text=${msg}`, '_blank');
        setStep("success");
        toast.success("Pedido enviado pelo WhatsApp! 🎉");
        return;
      }

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
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao finalizar pedido");
      setStep("review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCardTokenized = async ({ token, paymentMethodId: pmId, installments: inst, issuerId: issId }: { token: string; paymentMethodId: string; installments: number; issuerId: string }) => {
    setSubmitting(true);
    try {
      const newOrderId = await createOrder();
      setOrderId(newOrderId);
      setStep("processing");
      const payer = getPayer();
      const result = await payment.createCardPayment(finalTotal, token, inst, pmId, payer, newOrderId, issId);
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
          setStep("review");
        }
      } else {
        throw new Error(payment.error || "Erro ao processar cartão");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar pagamento");
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
    <div className="min-h-screen max-w-5xl mx-auto px-4 pt-6 pb-4">
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
        <div className="flex items-center gap-2 mb-6 lg:max-w-xl">
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

      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-8">
        {/* Main content column */}
        <div className="max-w-lg lg:max-w-none">
          <AnimatePresence mode="wait">
            {step === "address" && (
              <AddressStep
                address={address} setAddress={setAddress}
                customerInfo={customerInfo} setCustomerInfo={setCustomerInfo}
                savedAddresses={savedAddresses} showAddressPicker={showAddressPicker}
                setShowAddressPicker={setShowAddressPicker} selectSavedAddress={selectSavedAddress}
                cepLoading={cepLoading} items={items} cartTotal={cartTotal} cartCount={cartCount}
                onContinue={() => setStep("review")} formatCpf={formatCpf} formatPhone={formatPhone}
                isGuest={!user} guestInfo={guestInfo} setGuestInfo={setGuestInfo}
              />
            )}

            {step === "review" && (
              <ReviewStep
                items={items} cartTotal={cartTotal} cartCount={cartCount}
                appliedCoupon={appliedCoupon} setAppliedCoupon={setAppliedCoupon}
                couponCode={couponCode} setCouponCode={setCouponCode}
                couponLoading={couponLoading} handleApplyCoupon={handleApplyCoupon}
                address={address} shipping={shipping}
                paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod}
                pixDiscount={pixDiscount} subtotalAfterCoupon={subtotalAfterCoupon}
                freeShipping={freeShipping} shippingCost={shippingCost}
                finalTotal={finalTotal} submitting={submitting}
                paymentLoading={payment.loading} handlePlaceOrder={handlePlaceOrder}
                onCardTokenized={handleCardTokenized}
                customerCpf={customerInfo.cpf.replace(/\D/g, "")}
              />
            )}

            {step === "processing" && (
              <div className="text-center py-16 space-y-4">
                <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
                <h2 className="text-lg font-display font-bold">Processando pagamento...</h2>
                <p className="text-sm text-muted-foreground">Aguarde enquanto geramos seu pagamento</p>
              </div>
            )}

            {step === "payment" && (
              <PaymentStep
                pixData={pixData} boletoData={boletoData}
                paymentId={paymentId} paymentStatus={paymentStatus}
                paymentStatusDetail={paymentStatusDetail} isPolling={isPolling}
                copied={copied} copyToClipboard={copyToClipboard}
                onDone={() => setStep("success")}
              />
            )}

            {step === "success" && (
              <SuccessStep
                orderId={orderId} paymentMethod={paymentMethod}
                onViewOrders={() => navigate("/pedidos")}
                onBackToStore={() => navigate("/")}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Desktop sidebar */}
        {step !== "success" && step !== "processing" && (
          <OrderSummaryDesktop
            items={items}
            cartTotal={cartTotal}
            cartCount={cartCount}
            appliedCoupon={appliedCoupon}
            paymentMethod={paymentMethod}
            pixDiscount={pixDiscount}
            subtotalAfterCoupon={subtotalAfterCoupon}
            freeShipping={freeShipping}
            shippingCost={shippingCost}
            finalTotal={finalTotal}
            shipping={shipping}
            address={address}
          />
        )}
      </div>
    </div>
  );
};

export default Checkout;
