import { AlertTriangle, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

interface UrgencyBadgeProps {
  stock: number;
  compact?: boolean;
}

const UrgencyBadge = ({ stock, compact = false }: UrgencyBadgeProps) => {
  if (stock > 10 || stock <= 0) return null;

  const isVeryLow = stock <= 3;

  if (compact) {
    return (
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500 }}
      >
        <Badge variant="destructive" className="text-[9px] gap-1 animate-pulse">
          <Flame className="w-2.5 h-2.5" />
          {isVeryLow ? `Últimas ${stock} un!` : `Restam ${stock}`}
        </Badge>
      </motion.span>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
        isVeryLow 
          ? "bg-destructive/10 border border-destructive/20" 
          : "bg-amber-500/10 border border-amber-500/20"
      }`}
    >
      {isVeryLow ? (
        <AlertTriangle className="w-4 h-4 text-destructive animate-pulse" />
      ) : (
        <Flame className="w-4 h-4 text-amber-500" />
      )}
      <div>
        <p className={`text-xs font-bold ${isVeryLow ? "text-destructive" : "text-amber-700"}`}>
          {isVeryLow ? `⚠️ Últimas ${stock} unidades!` : `🔥 Restam apenas ${stock} em estoque`}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {isVeryLow ? "Pode esgotar a qualquer momento" : "Alta procura neste produto"}
        </p>
      </div>
    </motion.div>
  );
};

export default UrgencyBadge;
