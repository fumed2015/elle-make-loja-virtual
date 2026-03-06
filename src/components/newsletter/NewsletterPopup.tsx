import { useState, useEffect } from "react";
import { X, Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const STORAGE_KEY = "ellemake_newsletter_dismissed";
const POPUP_DELAY_MS = 8000; // Show after 8 seconds

const NewsletterPopup = () => {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (dismissed) return;
    } catch {}

    const timer = setTimeout(() => setVisible(true), POPUP_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {}
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
        if (error.code === "23505") {
          toast.info("Você já está cadastrado! 💕");
        } else {
          throw error;
        }
      } else {
        toast.success("Cadastro realizado! Você receberá nossas novidades 🎉");
      }
      setSuccess(true);
      try { localStorage.setItem(STORAGE_KEY, Date.now().toString()); } catch {}
      setTimeout(() => setVisible(false), 2500);
    } catch (err: any) {
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
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 bottom-4 md:inset-auto md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[420px] z-50"
          >
            <div className="bg-card rounded-2xl border border-border shadow-2xl overflow-hidden">
              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-muted/80 flex items-center justify-center hover:bg-muted transition-colors z-10"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header gradient */}
              <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 px-6 pt-8 pb-6 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-3"
                >
                  <Gift className="w-7 h-7 text-primary" />
                </motion.div>
                <h2 className="text-xl font-display font-bold text-foreground">
                  Ganhe 10% OFF
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  na sua primeira compra!
                </p>
              </div>

              {/* Content */}
              <div className="px-6 pb-6 pt-4">
                {success ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-4"
                  >
                    <p className="text-2xl mb-2">💕</p>
                    <p className="text-sm font-semibold text-foreground">Obrigada por se cadastrar!</p>
                    <p className="text-xs text-muted-foreground mt-1">Fique de olho no seu e-mail</p>
                  </motion.div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground text-center mb-4">
                      Cadastre seu e-mail e receba ofertas exclusivas, lançamentos e dicas de beleza.
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-3">
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Seu melhor e-mail"
                        className="bg-muted border-none min-h-[44px] text-sm"
                        autoFocus
                        required
                      />
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px] font-semibold"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Quero meu desconto 🎉"
                        )}
                      </Button>
                    </form>
                    <button
                      onClick={handleDismiss}
                      className="w-full text-center text-[10px] text-muted-foreground mt-3 hover:text-foreground transition-colors"
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
