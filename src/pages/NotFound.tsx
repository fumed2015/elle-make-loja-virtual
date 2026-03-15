import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import SEOHead from "@/components/SEOHead";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <SEOHead title="Página não encontrada" description="A página que você procura não existe." noindex />
      <div className="text-center px-4">
        <h1 className="mb-4 text-6xl font-bold text-foreground">404</h1>
        <p className="mb-2 text-xl font-semibold text-foreground">Página não encontrada</p>
        <p className="mb-6 text-sm text-muted-foreground">A página que você procura não existe ou foi movida.</p>
        <Link
          to="/"
          className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          Voltar para a Loja
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
