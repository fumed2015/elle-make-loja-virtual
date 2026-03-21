import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

const SITE_URL = "https://www.ellemake.com.br";

/**
 * Generates JSON-LD BreadcrumbList structured data for SEO.
 */
export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: SITE_URL },
      ...items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: item.label,
        ...(item.href ? { item: `${SITE_URL}${item.href}` } : {}),
      })),
    ],
  };
}

const Breadcrumbs = ({ items, className }: BreadcrumbsProps) => {
  return (
    <div className={className || "bg-muted/50 border-b border-border"}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1" aria-label="Página inicial">
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Início</span>
          </Link>
          {items.map((item, i) => {
            const isLast = i === items.length - 1;
            return (
              <span key={i} className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                {isLast || !item.href ? (
                  <span className="text-foreground font-medium truncate max-w-[200px]">{item.label}</span>
                ) : (
                  <Link to={item.href} className="hover:text-primary transition-colors truncate max-w-[200px]">
                    {item.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default Breadcrumbs;
