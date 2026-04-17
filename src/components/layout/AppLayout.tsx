import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import BottomNav from "./BottomNav";
import FloatingWhatsApp from "./FloatingWhatsApp";
import FloatingDeliveryBadge from "./FloatingDeliveryBadge";
import { useMetaPageView } from "@/hooks/useMetaPageView";
import { useMetaAdvancedMatching } from "@/hooks/useMetaAdvancedMatching";

const AppLayout = () => {
  useMetaPageView();
  useMetaAdvancedMatching();

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header />
      <main className="pb-20 md:pb-0 animate-fade-in">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
      <FloatingWhatsApp />
      <FloatingDeliveryBadge />
    </div>
  );
};

export default AppLayout;
