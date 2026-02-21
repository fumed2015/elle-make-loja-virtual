import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Header from "./Header";
import BottomNav from "./BottomNav";
import FloatingWhatsApp from "./FloatingWhatsApp";
import FreeShippingBar from "./FreeShippingBar";

const AppLayout = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header />
      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="pb-20 md:pb-0"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <BottomNav />
      <FloatingWhatsApp />
      <FreeShippingBar />
    </div>
  );
};

export default AppLayout;
