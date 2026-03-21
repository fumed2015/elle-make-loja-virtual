import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface SuccessStepProps {
  orderId: string;
  paymentMethod: string;
  onViewOrders: () => void;
  onBackToStore: () => void;
}

const SuccessStep = ({ orderId, paymentMethod, onViewOrders, onBackToStore }: SuccessStepProps) => {
  return (
    <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12 space-y-4">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
        <CheckCircle className="w-20 h-20 text-accent mx-auto" />
      </motion.div>
      <h2 className="text-2xl font-display font-bold">Pedido Registrado!</h2>
      <p className="text-sm text-muted-foreground">
        Seu pedido #{orderId.slice(0, 8)} foi recebido com sucesso.
        {paymentMethod === "pix" && <><br />O pagamento será confirmado automaticamente.</>}
        {paymentMethod === "boleto" && <><br />Aguarde a compensação do boleto (1-3 dias úteis).</>}
      </p>
      <div className="flex flex-col gap-2 pt-4">
        <Button onClick={onViewOrders} className="bg-primary text-primary-foreground min-h-[44px]">Ver Meus Pedidos</Button>
        <Button variant="outline" onClick={onBackToStore} className="min-h-[44px]">Voltar à Loja</Button>
      </div>
    </motion.div>
  );
};

export default SuccessStep;
