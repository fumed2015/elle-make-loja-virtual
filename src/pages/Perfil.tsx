import { useState, useCallback, useEffect, useRef } from "react";
import { LogOut, Package, Settings, User, Heart, Shield, MapPin, Star, Trash2, Plus, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useAddresses, useSaveAddress, useDeleteAddress, SavedAddress } from "@/hooks/useAddresses";
import { useLoyalty, TIER_LABELS } from "@/hooks/useLoyalty";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { fbTrackCompleteRegistration } from "@/hooks/useMetaPixel";
import { trackCompleteRegistration } from "@/hooks/useTikTokPixel";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";

const Perfil = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const hasRedirected = useRef(false);

  // Auto-redirect when user logs in and redirect param exists
  useEffect(() => {
    if (user && redirectTo && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate(redirectTo);
    }
  }, [user, redirectTo, navigate]);
  const { isAdmin } = useAdmin();
  const { data: addresses } = useAddresses();
  const { totalPoints, tier } = useLoyalty();
  const saveAddress = useSaveAddress();
  const deleteAddress = useDeleteAddress();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBirthday, setEditBirthday] = useState("");
  const [profileData, setProfileData] = useState<{ full_name: string | null; phone: string | null; birthday: string | null } | null>(null);

  // Fetch profile data from database
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase.from("profiles").select("full_name, phone, birthday").eq("user_id", user.id).single();
      if (data) setProfileData(data);
    };
    fetchProfile();
  }, [user]);
  const [newAddress, setNewAddress] = useState({
    label: "Casa", street: "", number: "", complement: "",
    neighborhood: "", city: "Belém", state: "PA", zip: "", is_default: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        toast.success("Bem-vinda de volta! 💄");
        if (redirectTo) navigate(redirectTo);
      } else {
        const { error } = await signUp(email, password, fullName, phone, birthday);
        if (error) throw error;
        fbTrackCompleteRegistration();
        trackCompleteRegistration();
        toast.success("Conta criada com sucesso! 🎉");
        if (redirectTo) navigate(redirectTo);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao autenticar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    const updates = {
      full_name: editName || null,
      phone: editPhone || null,
      birthday: editBirthday || null,
    };
    const { error } = await supabase.from("profiles").update(updates as any).eq("user_id", user.id);
    if (error) toast.error("Erro ao salvar");
    else {
      setProfileData(prev => ({ ...prev, ...updates }));
      toast.success("Perfil atualizado!");
      setShowEditProfile(false);
    }
  };

  const handleSaveAddress = () => {
    if (!newAddress.street || !newAddress.number || !newAddress.neighborhood || !newAddress.zip) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }
    saveAddress.mutate(newAddress, {
      onSuccess: () => {
        setShowAddressForm(false);
        setNewAddress({ label: "Casa", street: "", number: "", complement: "", neighborhood: "", city: "Belém", state: "PA", zip: "", is_default: false });
      },
    });
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
              <>
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" className="bg-muted border-none min-h-[44px]" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (WhatsApp)</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(91) 99999-9999" className="bg-muted border-none min-h-[44px]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthday">Data de Nascimento</Label>
                <Input id="birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className="bg-muted border-none min-h-[44px]" />
              </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="bg-muted border-none min-h-[44px]" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="bg-muted border-none min-h-[44px]" required />
            </div>
             <Button type="submit" disabled={submitting} className="w-full bg-primary text-primary-foreground shadow-marsala hover:bg-primary/90 min-h-[44px] press-scale">
               {submitting ? "Carregando..." : isLogin ? "Entrar" : "Criar conta"}
             </Button>
           </form>
           {isLogin && (
             <button
               onClick={async () => {
                 if (!email) { toast.error("Digite seu e-mail acima primeiro"); return; }
                 setSubmitting(true);
                 try {
                   const { error } = await supabase.auth.resetPasswordForEmail(email, {
                     redirectTo: `${window.location.origin}/reset-password`,
                   });
                   if (error) throw error;
                   toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
                 } catch (err: any) {
                   toast.error(err.message || "Erro ao enviar e-mail");
                 } finally {
                   setSubmitting(false);
                 }
               }}
               className="block w-full text-center text-xs text-primary hover:underline mt-3"
             >
               Esqueceu a senha?
             </button>
           )}
           <p className="text-center text-xs text-muted-foreground mt-4">
             {isLogin ? "Não tem conta? " : "Já tem conta? "}
             <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium hover:underline">
               {isLogin ? "Cadastre-se" : "Entrar"}
             </button>
           </p>
        </motion.div>
      </div>
    );
  }

  const tierInfo = TIER_LABELS[tier];

  const breadcrumbItems = [{ label: "Minha Conta" }];

  return (
    <div>
      <SEOHead title="Minha Conta" description="Gerencie sua conta, endereços e pedidos na Elle Make." jsonLd={breadcrumbJsonLd(breadcrumbItems)} />
      <Breadcrumbs items={breadcrumbItems} />
      <div className="px-4 pt-8 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-full bg-gradient-marsala flex items-center justify-center text-primary-foreground font-bold text-lg">
          {user.email?.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-display font-bold">{profileData?.full_name || user.user_metadata?.full_name || "Minha conta"}</h1>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          {profileData?.phone && <p className="text-xs text-muted-foreground">{profileData.phone}</p>}
        </div>
      </div>

      {/* Loyalty Card */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4 border border-primary/20 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <span className="text-xs font-medium">Programa Fidelidade</span>
          </div>
          <span className={`text-sm font-bold ${tierInfo.color}`}>{tierInfo.emoji} {tierInfo.label}</span>
        </div>
        <p className="text-2xl font-display font-bold mt-2">{totalPoints} <span className="text-xs text-muted-foreground font-normal">pontos</span></p>
        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
          <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${Math.min(100, (totalPoints % 500) / 5)}%` }} />
        </div>
      </div>

      {/* Menu */}
      <div className="space-y-2 mb-6">
        <Link to="/pedidos" className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:bg-muted hover-lift min-h-[44px]">
          <Package className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium">Meus Pedidos</span>
        </Link>
        <Link to="/favoritos" className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:bg-muted hover-lift min-h-[44px]">
          <Heart className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium">Favoritos</span>
        </Link>
        <button onClick={() => { setEditName(profileData?.full_name || ""); setEditPhone(profileData?.phone || ""); setEditBirthday(profileData?.birthday || ""); setShowEditProfile(!showEditProfile); }} className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:bg-muted hover-lift min-h-[44px]">
          <User className="w-5 h-5 text-muted-foreground" />
          <span className="text-sm font-medium">Dados Pessoais</span>
        </button>
        {isAdmin && (
          <Link to="/admin" className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-primary/30 hover:bg-muted hover-lift min-h-[44px]">
            <Shield className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">Painel Admin</span>
          </Link>
        )}
      </div>

      {/* Edit Profile Form */}
      <AnimatePresence>
        {showEditProfile && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6 space-y-3 overflow-hidden">
            <div className="bg-card rounded-xl p-4 border border-border space-y-3">
              <h3 className="text-sm font-medium">Editar Perfil</h3>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-muted border-none min-h-[44px]" />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="(91) 99999-9999" className="bg-muted border-none min-h-[44px]" />
              </div>
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Input type="date" value={editBirthday} onChange={(e) => setEditBirthday(e.target.value)} className="bg-muted border-none min-h-[44px]" />
              </div>
              <Button onClick={handleSaveProfile} size="sm" className="bg-primary text-primary-foreground text-xs press-scale">Salvar</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Addresses */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-display font-semibold">Endereços Salvos</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowAddressForm(!showAddressForm)} className="text-xs text-primary gap-1">
            <Plus className="w-3 h-3" />
            Novo
          </Button>
        </div>

        <AnimatePresence>
          {showAddressForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden">
              <div className="bg-card rounded-xl p-4 border border-border space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {["Casa", "Trabalho", "Outro"].map((l) => (
                    <button key={l} onClick={() => setNewAddress({ ...newAddress, label: l })} className={`px-3 py-1.5 rounded-full text-xs font-medium ${newAddress.label === l ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{l}</button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1"><Label className="text-xs">Rua</Label><Input value={newAddress.street} onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" /></div>
                  <div className="space-y-1"><Label className="text-xs">Nº</Label><Input value={newAddress.number} onChange={(e) => setNewAddress({ ...newAddress, number: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Bairro</Label><Input value={newAddress.neighborhood} onChange={(e) => setNewAddress({ ...newAddress, neighborhood: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" /></div>
                  <div className="space-y-1"><Label className="text-xs">CEP</Label><Input value={newAddress.zip} onChange={(e) => setNewAddress({ ...newAddress, zip: e.target.value })} className="bg-muted border-none min-h-[36px] text-xs" /></div>
                </div>
                <Button onClick={handleSaveAddress} disabled={saveAddress.isPending} size="sm" className="bg-primary text-primary-foreground text-xs press-scale">
                  {saveAddress.isPending ? "Salvando..." : "Salvar Endereço"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {addresses?.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">Nenhum endereço salvo</p>
        ) : (
          <div className="space-y-2">
            {addresses?.map((addr) => (
              <div key={addr.id} className="bg-card rounded-xl p-3 border border-border flex items-start gap-3">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{addr.label}</p>
                  <p className="text-[10px] text-muted-foreground">{addr.street}, {addr.number} - {addr.neighborhood}<br />{addr.city}/{addr.state} - {addr.zip}</p>
                </div>
                <button onClick={() => deleteAddress.mutate(addr.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button variant="ghost" onClick={() => signOut()} className="w-full justify-start gap-3 text-destructive hover:text-destructive min-h-[44px]">
        <LogOut className="w-5 h-5" />
        Sair
      </Button>
    </div>
  );
};

export default Perfil;
