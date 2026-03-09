import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { motion } from "framer-motion";

const FloatingWhatsApp = () => (
  <motion.a
    href="https://wa.me/5591920048471?text=Olá! Gostaria de saber mais sobre os produtos"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Falar no WhatsApp"
    className="fixed bottom-20 md:bottom-6 right-4 z-50 w-11 h-11 rounded-full bg-[hsl(142,70%,45%)] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow"
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    initial={{ scale: 0, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay: 1, type: "spring", stiffness: 260, damping: 20 }}
  >
    <WhatsAppIcon className="w-5 h-5" />
  </motion.a>
);

export default FloatingWhatsApp;
