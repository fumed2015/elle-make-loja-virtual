import { Search, User, ShoppingBag, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/useCart";
import { useState } from "react";

const navLinks = [
  { label: "Novidades", to: "/explorar" },
  { label: "Super Ofertas", to: "/explorar?cat=ofertas" },
  { label: "Boca", to: "/explorar?cat=boca" },
  { label: "Olhos", to: "/explorar?cat=olhos" },
  { label: "Lábios", to: "/explorar?cat=labios" },
  { label: "Skin", to: "/explorar?cat=skin" },
  { label: "Acessórios", to: "/explorar?cat=acessorios" },
];

const Header = () => {
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/explorar?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <header className="sticky top-0 z-40">
      {/* Promo bar */}
      <div className="bg-primary text-primary-foreground text-center py-1.5 px-4">
        <p className="text-[11px] font-medium tracking-wide">
          ✨ FRETE GRÁTIS acima de R$ 199 para Belém e Região Metropolitana ✨
        </p>
      </div>

      {/* Main header */}
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <h1 className="text-xl font-bold tracking-wider text-primary">
              ELLE MAKE
            </h1>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="O que você procura?"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-muted border-none rounded-full text-sm"
            />
          </form>

          {/* Icons */}
          <div className="flex items-center gap-1">
            <Link to="/consultora" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors" aria-label="Consultora">
              <MessageCircle className="w-5 h-5 text-foreground" />
            </Link>
            <Link to="/perfil" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors" aria-label="Perfil">
              <User className="w-5 h-5 text-foreground" />
            </Link>
            <Link to="/carrinho" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors relative" aria-label="Carrinho">
              <ShoppingBag className="w-5 h-5 text-foreground" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="bg-primary overflow-x-auto scrollbar-hide">
        <div className="max-w-5xl mx-auto flex items-center gap-0 px-2">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className="flex-shrink-0 px-3.5 py-2.5 text-[12px] font-semibold text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors tracking-wide uppercase whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
};

export default Header;
