import { useState, useEffect } from "react";
import { X, Sparkles, Loader2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const STORAGE_KEY = "ellemake_newsletter_dismissed";
const POPUP_DELAY_MS = 8000;
const COUPON_CODE = "BELEM10";

const NewsletterPopup = () => {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {}
    const timer = setTimeout(() => setVisible(true), POPUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    try { localStorage.setItem(STORAGE_KEY, Date.now().toString()); } catch {}
  };

  const handleCopyCoupon = async () => {
    try {
      await navigator.clipboard.writeText(COUPON_CODE);
      setCopied(true);
      toast.success("Cupom copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.info(`Use o cupom: ${COUPON_CODE}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Digite um e-mail válido");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("newsletter_subscribers" as any).insert({ email: trimmed } as any);
      if (error) {
        if (error.code === "23505") toast.info("Você já está cadastrado! 💕");
        else throw error;
      } else {
        toast.success("Cadastro realizado com sucesso! 🎉");
      }
      setSuccess(true);
      try { localStorage.setItem(STORAGE_KEY, Date.now().toString()); } catch {}
    } catch {
      toast.error("Erro ao cadastrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Popup — true center */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-[400px]"
          >
            <div
              className="relative rounded-3xl overflow-hidden shadow-2xl"
              style={{
                background: 'linear-gradient(160deg, hsl(var(--primary) / 0.06) 0%, hsl(var(--card)) 40%, hsl(var(--card)) 100%)',
                border: '1px solid hsl(var(--border))',
              }}
            >
              {/* Decorative marsala accent strip */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.4), hsl(var(--primary)))' }}
              />

              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/60 backdrop-blur-sm flex items-center justify-center hover:bg-muted transition-colors z-10"
                aria-label="Fechar"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              {/* Content area */}
              <div className="px-7 pt-10 pb-7 text-center">
                {success ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-4"
                  >
                    <div className="text-4xl mb-3">🎉</div>
                    <p
                      className="text-xl font-bold text-foreground mb-1"
                      style={{ fontFamily: '"Playfair Display", serif' }}
                    >
                      Você ganhou 10% OFF!
                    </p>
                    <p className="text-sm text-muted-foreground mb-5">
                      Use o cupom abaixo na sua próxima compra:
                    </p>

                    {/* Coupon code display */}
                    <button
                      onClick={handleCopyCoupon}
                      className="mx-auto flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors group"
                    >
                      <span
                        className="text-2xl font-black tracking-[0.15em] text-primary"
                        style={{ fontFamily: 'Montserrat, sans-serif' }}
                      >
                        {COUPON_CODE}
                      </span>
                      {copied ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors" />
                      )}
                    </button>

                    <p className="text-[11px] text-muted-foreground/60 mt-4">
                      Válido para sua primeira compra • Toque para copiar
                    </p>

                    <Button
                      onClick={handleDismiss}
                      className="mt-5 w-full bg-primary text-primary-foreground hover:bg-primary/90 min-h-[48px] rounded-xl font-semibold text-sm"
                    >
                      Começar a Comprar ✨
                    </Button>
                  </motion.div>
                ) : (
                  <>
                    {/* Icon */}
                    <motion.div
                      initial={{ rotate: -10, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ type: "spring", delay: 0.15, stiffness: 200 }}
                      className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))',
                        border: '1px solid hsl(var(--primary) / 0.12)',
                      }}
                    >
                      <Sparkles className="w-7 h-7 text-primary" />
                    </motion.div>

                    {/* Headline */}
                    <h2
                      className="text-3xl font-bold text-foreground mb-1"
                      style={{ fontFamily: '"Playfair Display", Didot, Georgia, serif' }}
                    >
                      10% OFF
                    </h2>
                    <p className="text-base font-medium text-foreground/80 mb-1">
                      na sua primeira compra!
                    </p>
                    <p className="text-xs text-muted-foreground mb-6 max-w-[280px] mx-auto leading-relaxed">
                      Cadastre seu e-mail e ganhe um cupom exclusivo de desconto. Além disso, receba novidades, ofertas e dicas de beleza em primeira mão! 💄
                    </p>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-3">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Seu melhor e-mail"
                        className="bg-muted/50 border border-border/60 rounded-xl min-h-[48px] text-sm text-center placeholder:text-muted-foreground/60 focus:border-primary/40 focus:ring-primary/20"
                        autoFocus
                        required
                      />
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 min-h-[48px] rounded-xl font-semibold text-sm tracking-wide shadow-lg shadow-primary/20"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "QUERO MEU CUPOM DE 10% 🎁"
                        )}
                      </Button>
                    </form>

                    <button
                      onClick={handleDismiss}
                      className="mt-4 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                    >
                      Não, obrigada
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NewsletterPopup;
