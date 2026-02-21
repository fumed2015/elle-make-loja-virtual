import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, CreditCard, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

type Step = "address" | "review" | "success";

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, cartTotal, cartCount } = useCart();
  const [step, setStep] = useState<Step>("address");
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [address, setAddress] = useState({
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "Belém",
    state: "PA",
    zip: "",
  });

  if (!user) {
    navigate("/perfil");
    return null;
  }

  if (items.length === 0 && step !== "success") {
    navigate("/carrinho");
    return null;
  }

  const handlePlaceOrder = async () => {
    setSubmitting(true);
    try {
      const orderItems = items.map((item) => {
        const product = item.products as any;
        return {
          product_id: product?.id,
          name: product?.name,
          price: Number(product?.price || 0),
          quantity: item.quantity,
          swatch: item.selected_swatch,
          image: product?.images?.[0],
        };
      });

      const { data, error } = await supabase.from("orders").insert({
        user_id: user.id,
        total: cartTotal,
        shipping_address: address,
        payment_method: "pix",
        items: orderItems,
      }).select("id").single();

      if (error) throw error;

      // Clear cart
      for (const item of items) {
        await supabase.from("cart_items").delete().eq("id", item.id);
      }

      setOrderId(data.id);
      setStep("success");
      toast.success("Pedido realizado com sucesso! 🎉");
    } catch (err: any) {
      toast.error(err.message || "Erro ao finalizar pedido");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => step === "address" ? navigate("/carrinho") : setStep("address")}
          className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-display font-bold">
          {step === "success" ? "Pedido Confirmado" : "Finalizar Compra"}
        </h1>
      </div>

      {/* Steps indicator */}
      {step !== "success" && (
        <div className="flex gap-2 mb-6">
          {["address", "review"].map((s, i) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full ${step === s || (s === "address" && step === "review") ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === "address" && (
          <motion.div
            key="address"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-display font-semibold">Endereço de Entrega</h2>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label>Rua</Label>
                <Input
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  placeholder="Nome da rua"
                  className="bg-muted border-none min-h-[44px]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Nº</Label>
                <Input
                  value={address.number}
                  onChange={(e) => setAddress({ ...address, number: e.target.value })}
                  placeholder="123"
                  className="bg-muted border-none min-h-[44px]"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Complemento</Label>
              <Input
                value={address.complement}
                onChange={(e) => setAddress({ ...address, complement: e.target.value })}
                placeholder="Apt, bloco, etc."
                className="bg-muted border-none min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input
                  value={address.neighborhood}
                  onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                  placeholder="Bairro"
                  className="bg-muted border-none min-h-[44px]"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input
                  value={address.zip}
                  onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                  placeholder="66000-000"
                  className="bg-muted border-none min-h-[44px]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={address.city} disabled className="bg-muted border-none min-h-[44px]" />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input value={address.state} disabled className="bg-muted border-none min-h-[44px]" />
              </div>
            </div>

            <Button
              onClick={() => setStep("review")}
              disabled={!address.street || !address.number || !address.neighborhood || !address.zip}
              className="w-full bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90 min-h-[44px] mt-4"
            >
              Continuar para Revisão
            </Button>
          </motion.div>
        )}

        {step === "review" && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Order items summary */}
            <div className="bg-card rounded-xl p-4 border border-border space-y-3">
              <h3 className="text-sm font-medium">Itens ({cartCount})</h3>
              {items.map((item) => {
                const product = item.products as any;
                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                      {product?.images?.[0] && (
                        <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-1">{product?.name}</p>
                      <p className="text-[10px] text-muted-foreground">Qtd: {item.quantity}</p>
                    </div>
                    <p className="text-xs font-bold text-primary">
                      R$ {(Number(product?.price || 0) * item.quantity).toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Address summary */}
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-medium">Entrega</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {address.street}, {address.number} {address.complement && `- ${address.complement}`}
                <br />
                {address.neighborhood}, {address.city} - {address.state}
                <br />
                CEP: {address.zip}
              </p>
            </div>

            {/* Payment */}
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-medium">Pagamento</h3>
              </div>
              <p className="text-xs text-muted-foreground">PIX (simulado)</p>
            </div>

            {/* Total */}
            <div className="bg-card rounded-xl p-4 border border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>R$ {cartTotal.toFixed(2).replace(".", ",")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frete</span>
                <span className="text-secondary">Grátis</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-display font-bold">Total</span>
                <span className="font-bold text-lg text-primary">
                  R$ {cartTotal.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            <Button
              onClick={handlePlaceOrder}
              disabled={submitting}
              className="w-full bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90 min-h-[44px]"
            >
              {submitting ? "Processando..." : "Confirmar Pedido"}
            </Button>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-12 space-y-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              <CheckCircle className="w-20 h-20 text-secondary mx-auto" />
            </motion.div>
            <h2 className="text-2xl font-display font-bold">Pedido Confirmado!</h2>
            <p className="text-sm text-muted-foreground">
              Seu pedido #{orderId.slice(0, 8)} foi recebido com sucesso.
            </p>
            <div className="flex flex-col gap-2 pt-4">
              <Button
                onClick={() => navigate("/pedidos")}
                className="bg-gradient-gold text-primary-foreground min-h-[44px]"
              >
                Ver Meus Pedidos
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="min-h-[44px]"
              >
                Voltar à Loja
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Checkout;
