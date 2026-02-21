import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Lock, CheckCircle } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    // Check URL hash for recovery token
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast.success("Senha redefinida com sucesso!");
      setTimeout(() => navigate("/perfil"), 2000);
    } catch (err: any) {
      toast.error(err.message || "Erro ao redefinir senha");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <SEOHead title="Redefinir Senha" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
          <Lock className="w-12 h-12 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-display font-bold">Link inválido</h1>
          <p className="text-sm text-muted-foreground">Este link de redefinição de senha expirou ou é inválido.</p>
          <Button onClick={() => navigate("/perfil")} className="bg-primary text-primary-foreground">
            Voltar ao login
          </Button>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-primary mx-auto" />
          <h1 className="text-xl font-display font-bold">Senha redefinida!</h1>
          <p className="text-sm text-muted-foreground">Redirecionando...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <SEOHead title="Redefinir Senha" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Lock className="w-10 h-10 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-display font-bold">Nova senha</h1>
          <p className="text-sm text-muted-foreground">Digite sua nova senha abaixo</p>
        </div>
        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="bg-muted border-none min-h-[44px]" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar senha</Label>
            <Input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a senha" className="bg-muted border-none min-h-[44px]" required />
          </div>
          <Button type="submit" disabled={submitting} className="w-full bg-primary text-primary-foreground min-h-[44px]">
            {submitting ? "Salvando..." : "Redefinir Senha"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
