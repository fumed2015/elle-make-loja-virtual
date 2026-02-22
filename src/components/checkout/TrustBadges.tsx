import { ShieldCheck, Lock, CreditCard, Truck } from "lucide-react";
import { motion } from "framer-motion";

const badges = [
  { icon: Lock, label: "Pagamento Seguro", sub: "Criptografia SSL 256-bit" },
  { icon: ShieldCheck, label: "Dados Protegidos", sub: "Conformidade PCI DSS" },
  { icon: CreditCard, label: "Mercado Pago", sub: "Gateway confiável" },
  { icon: Truck, label: "Entrega Garantida", sub: "Rastreamento completo" },
];

const TrustBadges = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-4 gap-1.5"
    >
      {badges.map((b, i) => (
        <div key={i} className="flex flex-col items-center text-center gap-1 py-2">
          <b.icon className="w-4 h-4 text-accent" />
          <p className="text-[8px] font-semibold leading-tight">{b.label}</p>
          <p className="text-[7px] text-muted-foreground leading-tight">{b.sub}</p>
        </div>
      ))}
    </motion.div>
  );
};

export default TrustBadges;
