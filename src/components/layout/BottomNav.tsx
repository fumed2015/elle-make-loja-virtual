import { Home, Search, ShoppingBag, User, Heart } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useCart } from "@/hooks/useCart";

const navItems = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/explorar", icon: Search, label: "Explorar" },
  { to: "/favoritos", icon: Heart, label: "Favoritos" },
  { to: "/carrinho", icon: ShoppingBag, label: "Sacola" },
  { to: "/perfil", icon: User, label: "Perfil" },
];

const BottomNav = () => {
  const { cartCount } = useCart();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border glass safe-area-bottom md:hidden">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] rounded-xl transition-all duration-200 relative",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="bottomnav-indicator"
                    className="absolute -top-[1px] w-8 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <motion.div
                  whileTap={{ scale: 0.8 }}
                  whileHover={{ y: -1 }}
                  className="flex flex-col items-center gap-1 no-theme-transition relative"
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {item.to === "/carrinho" && cartCount > 0 && (
                    <motion.span
                      key={`bottom-badge-${cartCount}`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                      className="absolute -top-1.5 -right-2 w-[1rem] h-[1rem] rounded-full bg-primary text-primary-foreground text-[0.5625rem] font-bold flex items-center justify-center"
                    >
                      {cartCount > 9 ? "9+" : cartCount}
                    </motion.span>
                  )}
                  <span className="text-[0.625rem] font-medium leading-none">{item.label}</span>
                </motion.div>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
