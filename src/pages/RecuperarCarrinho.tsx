import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ShoppingCart, Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

const RecuperarCarrinho = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recovered, setRecovered] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Link de recuperação inválido.");
      setLoading(false);
      return;
    }

    const resolve = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("cart-recovery", {
          body: { action: "resolve-recovery", token },
        });

        if (fnError || data?.error) {
          setError("Este link de recuperação expirou ou já foi utilizado.");
          return;
        }

        setRecovered(true);
        toast.success("Carrinho recuperado! 🛍️");

        // Redirect to cart after a short delay
        setTimeout(() => navigate("/carrinho"), 2000);
      } catch {
        setError("Erro ao recuperar o carrinho.");
      } finally {
        setLoading(false);
      }
    };

    resolve();
  }, [token, navigate]);

  return (
    <>
      <SEOHead title="Recuperar Carrinho | Elle Make" description="Recupere seu carrinho de compras" />
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-8 max-w-md w-full text-center space-y-4"
        >
          {loading ? (
            <>
              <Loader2 className="w-10 h-10 text-primary mx-auto animate-spin" />
              <p className="text-sm text-muted-foreground">Recuperando seu carrinho...</p>
            </>
          ) : error ? (
            <>
              <AlertTriangle className="w-10 h-10 text-yellow-500 mx-auto" />
              <h2 className="text-lg font-bold">Ops!</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => navigate("/explorar")} className="gap-2">
                Continuar comprando <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          ) : recovered ? (
            <>
              <ShoppingCart className="w-10 h-10 text-accent mx-auto" />
              <h2 className="text-lg font-bold">Carrinho recuperado! 🎉</h2>
              <p className="text-sm text-muted-foreground">
                Seus produtos estão esperando por você. Redirecionando...
              </p>
              <Button onClick={() => navigate("/carrinho")} className="gap-2">
                Ir ao carrinho <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          ) : null}
        </motion.div>
      </div>
    </>
  );
};

export default RecuperarCarrinho;
