import { Search, User, ShoppingBag, ChevronDown } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/useCart";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SubItem {
  label: string;
  to: string;
}

interface NavItem {
  label: string;
  to: string;
  subs?: SubItem[];
}

const navLinks: NavItem[] = [
  { label: "Novidades", to: "/explorar?cat=novidades" },
  {
    label: "Marcas", to: "/explorar",
    subs: [
      { label: "Ruby Rose", to: "/marca/ruby-rose" },
      { label: "Max Love", to: "/marca/max-love" },
      { label: "Sarah Beauty", to: "/marca/sarah-beauty" },
      { label: "Phallebeauty", to: "/marca/phallebeauty" },
      { label: "Luisance", to: "/marca/luisance" },
      { label: "Macrilan", to: "/marca/macrilan" },
    ],
  },
  {
    label: "Rosto", to: "/categoria/rosto",
    subs: [
      { label: "Bases & Corretivos", to: "/explorar?cat=rosto&q=base" },
      { label: "Pós & Bronzers", to: "/explorar?cat=rosto&q=po" },
      { label: "Primers & Fixadores", to: "/explorar?cat=primers-fixadores" },
      { label: "Blush & Contorno", to: "/explorar?cat=rosto&q=blush" },
    ],
  },
  {
    label: "Olhos", to: "/categoria/olhos",
    subs: [
      { label: "Sombras & Paletas", to: "/explorar?cat=paletas" },
      { label: "Delineadores", to: "/explorar?cat=olhos&q=delineador" },
      { label: "Máscaras", to: "/explorar?cat=olhos&q=mascara" },
      { label: "Sobrancelhas", to: "/explorar?cat=sobrancelhas" },
    ],
  },
  {
    label: "Lábios", to: "/categoria/labios",
    subs: [
      { label: "Batons", to: "/explorar?cat=labios&q=batom" },
      { label: "Glosses", to: "/explorar?cat=labios&q=gloss" },
      { label: "Lip Tint", to: "/explorar?cat=labios&q=tint" },
    ],
  },
  {
    label: "Skincare", to: "/categoria/skincare",
    subs: [
      { label: "Hidratantes", to: "/explorar?cat=skincare&q=hidratante" },
      { label: "Protetor Solar", to: "/explorar?cat=skincare&q=protetor" },
      { label: "Séruns", to: "/explorar?cat=skincare&q=serum" },
    ],
  },
  { label: "Acessórios", to: "/categoria/acessorios" },
  { label: "Ofertas", to: "/categoria/ofertas" },
];

const Header = () => {
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [promoIndex, setPromoIndex] = useState(0);

  const promoMessages = [
    "✨ FRETE GRÁTIS acima de R$ 199 para Belém e Região Metropolitana ✨",
    "🛵 Belém e Ananindeua: entrega em até 3 horas!",
    "💳 Pix com 5% OFF • Cartão até 3x sem juros",
  ];

  useEffect(() => {
    const interval = setInterval(() => setPromoIndex((i) => (i + 1) % promoMessages.length), 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/explorar?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40">
      {/* Promo bar */}
      <div className="bg-primary text-primary-foreground text-center py-1.5 px-4 overflow-hidden h-8 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={promoIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-[11px] font-medium tracking-wide"
          >
            {promoMessages[promoIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Main header */}
      <div className="bg-card border-b border-border px-3 md:px-4 py-2 md:py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-2 md:gap-3 min-w-0">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <motion.h1
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="text-lg md:text-xl font-bold tracking-wider text-primary"
            >
              ELLE MAKE
            </motion.h1>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 min-w-0 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 md:h-10 bg-muted border-none rounded-full text-sm focus:ring-2 focus:ring-primary/30 w-full"
            />
          </form>

          {/* Icons */}
          <div className="flex items-center gap-0.5 md:gap-1 flex-shrink-0">
            <a href="https://wa.me/5591983045531?text=Olá! Gostaria de saber mais sobre os produtos" target="_blank" rel="noopener noreferrer" className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors" aria-label="WhatsApp">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <WhatsAppIcon className="w-5 h-5 text-accent" />
              </motion.div>
            </a>
            <Link to="/perfil" className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors hidden md:flex" aria-label="Perfil">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <User className="w-5 h-5 text-foreground" />
              </motion.div>
            </Link>
            <Link to="/carrinho" className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors relative" aria-label="Carrinho">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <ShoppingBag className="w-5 h-5 text-foreground" />
              </motion.div>
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center"
                >
                  {cartCount}
                </motion.span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-primary overflow-x-auto scrollbar-hide relative">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-1 md:px-2">
          {navLinks.map((link) => (
            <div
              key={link.label}
              className="relative flex-1"
              onMouseEnter={() => link.subs && setHoveredNav(link.label)}
              onMouseLeave={() => setHoveredNav(null)}
            >
              <Link
                to={link.to}
                className="flex items-center justify-center gap-0.5 px-1 md:px-2 py-2.5 text-[10px] md:text-[11px] font-semibold text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-all tracking-wide uppercase whitespace-nowrap relative group"
              >
                {link.label}
                {link.subs && <ChevronDown className="w-2.5 h-2.5 md:w-3 md:h-3" />}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-primary-foreground/50 group-hover:w-3/4 transition-all duration-300" />
              </Link>

              <AnimatePresence>
                {link.subs && hoveredNav === link.label && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 z-50 min-w-[180px] bg-card border border-border rounded-lg shadow-lg py-1.5 mt-0"
                  >
                    {link.subs.map((sub) => (
                      <Link
                        key={sub.label}
                        to={sub.to}
                        className="block px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors whitespace-nowrap"
                      >
                        {sub.label}
                      </Link>
                    ))}
                    <div className="border-t border-border mt-1 pt-1">
                      <Link
                        to={link.to}
                        className="block px-4 py-2 text-xs font-semibold text-primary hover:bg-muted transition-colors"
                      >
                        Ver tudo em {link.label}
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </nav>
    </header>
  );
};

export default Header;
