import { useState } from "react";
import { LogOut, Package, Settings, User, Heart, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";

const Perfil = () => {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Bem-vinda de volta! 💄");
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao autenticar");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold mb-2">{isLogin ? "Entrar" : "Criar conta"}</h1>
            <p className="text-sm text-muted-foreground">{isLogin ? "Acesse sua conta para continuar" : "Junte-se à comunidade Glow"}</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" className="bg-muted border-none min-h-[44px]" required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="bg-muted border-none min-h-[44px]" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="bg-muted border-none min-h-[44px]" required />
            </div>
            <Button type="submit" disabled={submitting} className="w-full bg-gradient-gold text-primary-foreground shadow-gold hover:opacity-90 min-h-[44px]">
              {submitting ? "Carregando..." : isLogin ? "Entrar" : "Criar conta"}
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground mt-6">
            {isLogin ? "Não tem conta? " : "Já tem conta? "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline">
              {isLogin ? "Cadastre-se" : "Entrar"}
            </button>
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-8 pb-4 max-w-lg mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-gradient-gold flex items-center justify-center text-primary-foreground font-bold text-lg">
          {user.email?.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-xl font-display font-bold">{user.user_metadata?.full_name || "Minha conta"}</h1>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Link to="/pedidos" className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:bg-muted transition-colors min-h-[44px]">
          <Package className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium">Meus Pedidos</span>
        </Link>
        <Link to="/favoritos" className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:bg-muted transition-colors min-h-[44px]">
          <Heart className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium">Favoritos</span>
        </Link>
        <button className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:bg-muted transition-colors min-h-[44px]">
          <User className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium">Dados Pessoais</span>
        </button>
        {isAdmin && (
          <Link to="/admin" className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-primary/30 hover:bg-muted transition-colors min-h-[44px]">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">Painel Admin</span>
          </Link>
        )}
        <Button variant="ghost" onClick={() => signOut()} className="w-full justify-start gap-3 text-destructive hover:text-destructive min-h-[44px]">
          <LogOut className="w-5 h-5" />
          Sair
        </Button>
      </div>
    </div>
  );
};

export default Perfil;
