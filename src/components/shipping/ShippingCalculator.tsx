import { Truck, Loader2, MapPin, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import type { ShippingOption } from "@/hooks/useShipping";

interface ShippingCalculatorProps {
  cep: string;
  onCepChange: (value: string) => void;
  onCalculate: () => void;
  loading: boolean;
  error: string | null;
  options: ShippingOption[];
  selectedOption: string | null;
  onSelectOption: (id: string) => void;
  isLocal: boolean;
  addressInfo: { city?: string; state?: string; neighborhood?: string } | null;
  compact?: boolean;
}

const ShippingCalculator = ({
  cep,
  onCepChange,
  onCalculate,
  loading,
  error,
  options,
  selectedOption,
  onSelectOption,
  isLocal,
  addressInfo,
  compact = false,
}: ShippingCalculatorProps) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onCalculate();
  };

  return (
    <div className={`bg-card rounded-xl border border-border ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center gap-2 mb-3">
        <Truck className="w-4 h-4 text-primary" />
        <h3 className={`font-semibold ${compact ? "text-xs" : "text-sm"}`}>Calcular Frete</h3>
      </div>

      <div className="flex gap-2">
        <Input
          value={cep}
          onChange={(e) => onCepChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="00000-000"
          maxLength={9}
          className="bg-muted border-none min-h-[40px] text-sm flex-1"
          inputMode="numeric"
        />
        <Button
          size="sm"
          onClick={onCalculate}
          disabled={loading}
          className="bg-primary text-primary-foreground hover:bg-primary/90 min-h-[40px] px-4 text-xs font-semibold"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Calcular"}
        </Button>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-1.5 mt-2 text-destructive"
          >
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <p className="text-xs">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Address info */}
      <AnimatePresence>
        {addressInfo && options.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3"
          >
            <div className="flex items-center gap-1.5 mb-3">
              <MapPin className="w-3 h-3 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground">
                {addressInfo.neighborhood && `${addressInfo.neighborhood}, `}
                {addressInfo.city} - {addressInfo.state}
              </p>
              {isLocal && (
                <span className="ml-auto text-[10px] font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                  Região local
                </span>
              )}
            </div>

            <div className="space-y-2">
              {options.map((option) => (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => onSelectOption(option.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                    selectedOption === option.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{option.name}</p>
                    <p className="text-[10px] text-muted-foreground">{option.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {option.price !== null ? (
                      <p className="text-sm font-bold text-primary">
                        R$ {option.price.toFixed(2).replace(".", ",")}
                      </p>
                    ) : (
                      <p className="text-xs font-semibold text-accent">A combinar</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">{option.estimatedDays}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedOption === option.id ? "border-primary" : "border-muted-foreground"
                    }`}
                  >
                    {selectedOption === option.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShippingCalculator;
