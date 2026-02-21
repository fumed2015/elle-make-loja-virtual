import { Home, Search, ShoppingBag, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/explorar", icon: Search, label: "Explorar" },
  { to: "/carrinho", icon: ShoppingBag, label: "Carrinho" },
  { to: "/perfil", icon: User, label: "Perfil" },
];

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/80 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-[44px] rounded-xl transition-colors relative",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="bottomnav-indicator"
                    className="absolute -top-1 w-8 h-1 rounded-full bg-gradient-gold"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
