import { MapPin, ChevronDown, Loader2, ShoppingBag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import FreeShippingBar from "@/components/layout/FreeShippingBar";
import { useMemo } from "react";

const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validateCpf = (cpf: string): boolean => {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === parseInt(cpf[10]);
};

interface AddressStepProps {
  address: { street: string; number: string; complement: string; neighborhood: string; city: string; state: string; zip: string };
  setAddress: (addr: any) => void;
  customerInfo: { phone: string; cpf: string };
  setCustomerInfo: (info: any) => void;
  savedAddresses: any[] | undefined;
  showAddressPicker: boolean;
  setShowAddressPicker: (v: boolean) => void;
  selectSavedAddress: (addr: any) => void;
  cepLoading: boolean;
  items: any[];
  cartTotal: number;
  cartCount: number;
  onContinue: () => void;
  formatCpf: (v: string) => string;
  formatPhone: (v: string) => string;
  isGuest?: boolean;
  guestInfo?: { name: string; email: string; phone: string };
  setGuestInfo?: (info: any) => void;
}

const AddressStep = ({
  address, setAddress, customerInfo, setCustomerInfo,
  savedAddresses, showAddressPicker, setShowAddressPicker, selectSavedAddress,
  cepLoading, items, cartTotal, cartCount, onContinue, formatCpf, formatPhone,
  isGuest, guestInfo, setGuestInfo,
}: AddressStepProps) => {

  const emailValid = useMemo(() => !guestInfo?.email || validateEmail(guestInfo.email), [guestInfo?.email]);
  const cpfValid = useMemo(() => customerInfo.cpf.length < 11 || validateCpf(customerInfo.cpf), [customerInfo.cpf]);

  const guestCanContinue = isGuest && guestInfo
    ? guestInfo.name.trim().length >= 3 && validateEmail(guestInfo.email) && guestInfo.phone.length >= 10 && validateCpf(customerInfo.cpf) && address.zip.length >= 8
    : false;

  const loggedCanContinue = !isGuest
    ? address.street && address.number && address.neighborhood && address.zip && validateCpf(customerInfo.cpf)
    : false;

  const canContinue = isGuest ? guestCanContinue : loggedCanContinue;


  return (
    <motion.div key="address" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
      {/* Free shipping bar */}
      <div className="mb-4"><FreeShippingBar /></div>

      {/* Mini summary */}
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
                {product?.images?.[0] && <img src={product.images[0]} alt="" className="w-full h-full object-contain" />}
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

      {/* ── GUEST: simplified form ── */}
      {isGuest && guestInfo && setGuestInfo ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-display font-semibold">Seus Dados</h2>
          </div>

          <div className="space-y-2">
            <Label>Nome completo *</Label>
            <Input value={guestInfo.name} onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })} placeholder="Seu nome completo" className="bg-muted border-none min-h-[44px]" required />
          </div>

          <div className="space-y-2">
            <Label>E-mail *</Label>
            <Input value={guestInfo.email} onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })} placeholder="seu@email.com" className="bg-muted border-none min-h-[44px]" type="email" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>WhatsApp *</Label>
              <Input value={formatPhone(guestInfo.phone)} onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })} placeholder="(91) 99999-9999" className="bg-muted border-none min-h-[44px]" inputMode="tel" required />
            </div>
            <div className="space-y-2">
              <Label>CPF *</Label>
              <Input value={formatCpf(customerInfo.cpf)} onChange={(e) => setCustomerInfo({ ...customerInfo, cpf: e.target.value.replace(/\D/g, "").slice(0, 11) })} placeholder="000.000.000-00" className="bg-muted border-none min-h-[44px]" inputMode="numeric" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>CEP *</Label>
            <div className="relative">
              <Input value={address.zip} onChange={(e) => setAddress({ ...address, zip: e.target.value.replace(/\D/g, "").slice(0, 8) })} placeholder="66000-000" className="bg-muted border-none min-h-[44px]" inputMode="numeric" required />
              {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
            </div>
          </div>

          <Button onClick={onContinue} disabled={!canContinue} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px] mt-4">
            Continuar para Revisão
          </Button>
        </div>
      ) : (
        /* ── LOGGED IN: full address form ── */
        <>
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
              <div className="space-y-2"><Label>Cidade</Label><Input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} placeholder="Cidade" className="bg-muted border-none min-h-[44px]" required /></div>
              <div className="space-y-2"><Label>UF</Label><Input value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase().slice(0, 2) })} placeholder="UF" maxLength={2} className="bg-muted border-none min-h-[44px]" required /></div>
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
          <Button onClick={onContinue} disabled={!canContinue} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px] mt-4">
            Continuar para Revisão
          </Button>
        </>
      )}
    </motion.div>
  );
};

export default AddressStep;
