import { motion, AnimatePresence } from "framer-motion";
import { Bike, X } from "lucide-react";
import { useState, useEffect } from "react";

const FloatingDeliveryBadge = () => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem("delivery-badge-dismissed")) return;
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("delivery-badge-dismissed", "1");
    setTimeout(() => setVisible(false), 300);
  };

  return (
    <AnimatePresence>
      {visible && !dismissed && (
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-24 md:bottom-6 left-4 z-50 flex items-center gap-2 rounded-full bg-emerald-600 text-white pl-3 pr-2 py-2 shadow-lg cursor-default select-none max-w-[13.75rem]"
        >
          <Bike className="w-4 h-4 flex-shrink-0 text-white" />
          <span className="text-[0.6875rem] font-semibold leading-tight">
            Entrega em até 3h
            <span className="block text-[0.5625rem] font-normal opacity-80">Belém e Ananindeua</span>
          </span>
          <button
            onClick={handleDismiss}
            className="ml-1 p-0.5 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
            aria-label="Fechar"
          >
            <X className="w-3 h-3" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FloatingDeliveryBadge;
