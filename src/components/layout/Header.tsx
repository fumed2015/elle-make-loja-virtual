import { Search, User, ShoppingBag, ChevronDown, LogIn, LogOut, Settings, Menu, ChevronLeft, ChevronRight, X, Mail, Phone } from "lucide-react";

import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useProducts } from "@/hooks/useProducts";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { toast } from "sonner";

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
  {
    label: "Novidades", to: "/explorar?cat=novidades",
    subs: [
      { label: "Lançamentos", to: "/explorar?cat=novidades&q=lancamento" },
      { label: "Mais Vendidos", to: "/explorar?cat=novidades&q=vendido" },
      { label: "Tendências", to: "/explorar?cat=novidades&q=tendencia" },
    ],
  },
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
  {
    label: "Acessórios", to: "/categoria/acessorios",
    subs: [
      { label: "Pincéis", to: "/explorar?cat=acessorios&q=pincel" },
      { label: "Esponjas", to: "/explorar?cat=acessorios&q=esponja" },
      { label: "Necessaires", to: "/explorar?cat=acessorios&q=necessaire" },
    ],
  },
  {
    label: "Ofertas", to: "/categoria/ofertas",
    subs: [
      { label: "Até 30% Off", to: "/explorar?cat=ofertas&q=30" },
      { label: "Até 50% Off", to: "/explorar?cat=ofertas&q=50" },
      { label: "Kits Promocionais", to: "/explorar?cat=kits-bundles" },
    ],
  },
];

// Labels to show on mobile (reduced set to fit one line)
const mobileNavLabels = new Set(["Novidades", "Marcas", "Rosto", "Olhos", "Lábios", "Ofertas"]);

const Header = () => {
  const { cartCount } = useCart();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [promoIndex, setPromoIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);

  // Fetch all products for autocomplete (cached 5min)
  const { data: allProducts } = useProducts({});

  const suggestions = useMemo(() => {
    if (!search || search.length < 2 || !allProducts) return [];
    const q = search.toLowerCase();
    return allProducts
      .filter(p => p.name.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q))
      .slice(0, 5);
  }, [search, allProducts]);

  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback((label: string) => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setHoveredNav(label);
  }, []);

  const handleMouseLeave = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => setHoveredNav(null), 150);
  }, []);

  const promoMessages = [
    "✨ FRETE GRÁTIS acima de R$ 199 para Belém e Região Metropolitana ✨",
    "🛵 Belém e Ananindeua: entrega em até 3 horas!",
    "💳 Pix com 5% OFF • Cartão até 3x sem juros",
  ];

  useEffect(() => {
    const interval = setInterval(() => setPromoIndex((i) => (i + 1) % promoMessages.length), 4000);
    return () => clearInterval(interval);
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node) &&
        mobileSearchContainerRef.current && !mobileSearchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (search.trim()) navigate(`/explorar?q=${encodeURIComponent(search.trim())}`);
  };

  const handleSelectSuggestion = (slug: string) => {
    setShowSuggestions(false);
    setSearch("");
    setMobileSearchOpen(false);
    navigate(`/produto/${slug}`);
  };

  const SuggestionsDropdown = () => (
    <AnimatePresence>
      {showSuggestions && suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="absolute top-full left-0 right-0 bg-card border border-border rounded-lg mt-1 shadow-lg z-50 overflow-hidden"
        >
          {suggestions.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelectSuggestion(p.slug)}
              className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-md overflow-hidden bg-muted flex-shrink-0">
                {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" loading="lazy" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{p.name}</p>
                <p className="text-[10px] text-primary font-bold">R$ {Number(p.price).toFixed(2).replace(".", ",")}</p>
              </div>
            </button>
          ))}
          <button
            onClick={() => { setShowSuggestions(false); if (search.trim()) navigate(`/explorar?q=${encodeURIComponent(search.trim())}`); }}
            className="w-full text-center px-3 py-2 text-[10px] font-semibold text-primary hover:bg-muted transition-colors border-t border-border"
          >
            Ver todos os resultados →
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <header className="sticky top-0 z-40">
      {/* Promo bar with arrows — always opaque */}
      <div className="bg-primary text-primary-foreground py-1.5 px-2 overflow-hidden h-8 flex items-center justify-between relative z-10">
        <button
          onClick={() => setPromoIndex((i) => (i - 1 + promoMessages.length) % promoMessages.length)}
          className="w-6 h-6 flex items-center justify-center flex-shrink-0 hover:bg-primary-foreground/10 rounded-full transition-colors"
          aria-label="Promoção anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 text-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={promoIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-[11px] font-medium tracking-wide flex items-center justify-center gap-1.5"
            >
              <span>🚚</span> {promoMessages[promoIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
        <button
          onClick={() => setPromoIndex((i) => (i + 1) % promoMessages.length)}
          className="w-6 h-6 flex items-center justify-center flex-shrink-0 hover:bg-primary-foreground/10 rounded-full transition-colors"
          aria-label="Próxima promoção"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Desktop secondary info bar */}
      <div className="hidden md:flex bg-card/60 backdrop-blur-md border-b border-border/30 px-4 py-1.5">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <a href="https://wa.me/5591983045531" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
              <WhatsAppIcon className="w-3.5 h-3.5" /> WhatsApp
            </a>
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" /> (91) 98304-5531
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" /> contato@ellemake.com.br
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <Link to="/sobre" className="hover:text-primary transition-colors">Sobre</Link>
            <Link to="/termos" className="hover:text-primary transition-colors">Contato</Link>
          </div>
        </div>
      </div>

      {/* Main header — MOBILE: hamburger left, centered logo, cart right */}
      {/* DESKTOP: logo left, nav center, search+icons right */}
      <div className="bg-card/70 md:bg-card/60 md:backdrop-blur-md border-b border-border/30 px-3 md:px-4 py-2.5 md:py-3">
        <div className="max-w-6xl mx-auto flex items-center min-w-0">
          {/* Left: hamburger (mobile only) + Logo */}
          <div className="flex items-center gap-1 flex-shrink-0 md:w-auto">
            <Sheet>
              <SheetTrigger asChild>
                <button className="md:hidden w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors" aria-label="Menu">
                  <Menu className="w-6 h-6 text-foreground" />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="p-4 border-b border-border">
                  <h2 className="text-lg font-bold text-primary tracking-wider">ELLE MAKE</h2>
                </div>
                <nav className="py-2">
                  {navLinks.map((link) => (
                    <div key={link.label}>
                      <SheetClose asChild>
                        <Link
                          to={link.to}
                          className="flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                        >
                          {link.label}
                          {link.subs && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        </Link>
                      </SheetClose>
                      {link.subs && (
                        <div className="pl-6 pb-1">
                          {link.subs.map((sub) => (
                            <SheetClose asChild key={sub.label}>
                              <Link
                                to={sub.to}
                                className="block px-4 py-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                              >
                                {sub.label}
                              </Link>
                            </SheetClose>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          {/* Center: Logo (centered on mobile, left on desktop) */}
          <div className="flex-1 flex justify-center md:justify-start md:flex-none md:mr-8">
            <Link to="/">
              <motion.h1
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="text-xl md:text-2xl font-bold tracking-[0.15em] text-primary"
              >
                ELLE MAKE
              </motion.h1>
            </Link>
          </div>

          {/* Desktop nav links inline in header */}
          <nav
            className="hidden md:flex flex-1 items-center justify-center gap-0.5 overflow-visible relative"
            onMouseLeave={handleMouseLeave}
          >
            {navLinks.map((link) => (
              <div
                key={link.label}
                className="relative flex-shrink-0"
                onMouseEnter={() => handleMouseEnter(link.label)}
              >
                <Link
                  to={link.to}
                  className="flex items-center gap-0.5 px-2.5 py-2 text-[12px] font-semibold text-foreground/80 hover:text-primary transition-all tracking-wide uppercase whitespace-nowrap"
                >
                  {link.label}
                  {link.subs && <ChevronDown className="w-3 h-3" />}
                </Link>
              </div>
            ))}

            {/* Mega menu panel */}
            <AnimatePresence>
              {hoveredNav && navLinks.find(l => l.label === hoveredNav)?.subs && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 w-[600px] z-50 bg-card border border-border shadow-lg rounded-b-lg"
                  onMouseEnter={() => handleMouseEnter(hoveredNav)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="px-6 py-5">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                      {navLinks.find(l => l.label === hoveredNav)?.subs?.map((sub) => (
                        <Link
                          key={sub.label}
                          to={sub.to}
                          className="text-sm text-foreground hover:text-primary font-medium transition-colors whitespace-nowrap"
                        >
                          {sub.label}
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-border mt-4 pt-3">
                      <Link
                        to={navLinks.find(l => l.label === hoveredNav)?.to || "/explorar"}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Ver tudo em {hoveredNav} →
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </nav>

          {/* Right: search + icons */}
          <div className="flex items-center gap-1 flex-shrink-0 md:w-auto justify-end">
            {/* Desktop search */}
            <div className="hidden md:flex relative w-48 lg:w-56" ref={searchContainerRef}>
              <form onSubmit={handleSearch} className="w-full relative">
                <Input
                  placeholder="Buscar"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowSuggestions(e.target.value.length >= 2); }}
                  onFocus={() => search.length >= 2 && setShowSuggestions(true)}
                  className="h-10 bg-background border border-border rounded-lg text-sm pr-10 focus:ring-2 focus:ring-primary/30 w-full"
                />
                <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors">
                  <Search className="w-5 h-5 text-muted-foreground" />
                </button>
              </form>
              <SuggestionsDropdown />
            </div>

            {/* User dropdown (desktop) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden md:flex w-10 h-10 items-center justify-center rounded-full hover:bg-muted transition-colors relative" aria-label="Conta">
                  <User className="w-5 h-5 text-foreground" />
                  {user && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent border-2 border-card" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {user ? (
                  <>
                    <div className="px-3 py-2">
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/perfil")}>
                      <User className="w-4 h-4 mr-2" /> Meu Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/pedidos")}>
                      <ShoppingBag className="w-4 h-4 mr-2" /> Meus Pedidos
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/favoritos")}>
                      <Settings className="w-4 h-4 mr-2" /> Favoritos
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={async () => { await signOut(); toast.success("Você saiu da conta"); }}>
                      <LogOut className="w-4 h-4 mr-2" /> Sair
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/perfil")}>
                      <LogIn className="w-4 h-4 mr-2" /> Entrar / Cadastrar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Cart */}
            <Link to="/carrinho" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors relative" aria-label="Carrinho">
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                key={cartCount}
                animate={cartCount > 0 ? { scale: [1, 1.3, 1], rotate: [0, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                <ShoppingBag className="w-5 h-5 text-foreground" />
              </motion.div>
              {cartCount > 0 && (
                <motion.span
                  key={`badge-${cartCount}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center"
                >
                  {cartCount}
                </motion.span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile search bar (always visible on mobile) */}
      <div className="md:hidden bg-card border-b border-border px-3 py-2" ref={mobileSearchContainerRef}>
        <div className="relative">
          <form onSubmit={handleSearch} className="w-full relative">
            <Input
              placeholder="Buscar"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowSuggestions(e.target.value.length >= 2); }}
              onFocus={() => search.length >= 2 && setShowSuggestions(true)}
              className="h-10 bg-background border border-border rounded-lg text-sm pr-12 focus:ring-2 focus:ring-primary/30 w-full"
            />
            <button type="submit" className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors">
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
          </form>
          <SuggestionsDropdown />
        </div>
      </div>
    </header>
  );
};

export default Header;
