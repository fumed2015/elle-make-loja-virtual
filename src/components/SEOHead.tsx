import { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  noindex?: boolean;
}

const SITE_NAME = "Elle Make | Maquiagem em Belém";
const SITE_URL = "https://www.ellemake.com.br";
const DEFAULT_DESC = "Loja de maquiagem e cosméticos com delivery rápido em Belém do Pará. Frete grátis acima de R$ 199. Entrega em até 3h.";
const DEFAULT_IMAGE = "/og-image.jpg";

const SEOHead = ({
  title,
  description = DEFAULT_DESC,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  jsonLd,
  noindex = false,
}: SEOHeadProps) => {
  const location = useLocation();
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  // Auto-generate canonical URL from current path if not provided
  const canonicalUrl = url || `${SITE_URL}${location.pathname}`;
  // Ensure absolute image URL
  const absoluteImage = image.startsWith("http") ? image : `${SITE_URL}${image}`;

  useEffect(() => {
    document.title = fullTitle;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("name", "description", description);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", type);
    setMeta("property", "og:image", absoluteImage);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:site_name", "Elle Make");
    setMeta("property", "og:locale", "pt_BR");
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", absoluteImage);
    setMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow");

    // Canonical
    let canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);

    // JSON-LD (supports single or array)
    document.querySelectorAll("script[data-seo-ld]").forEach(el => el.remove());
    if (jsonLd) {
      const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      items.forEach((ld, i) => {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.setAttribute("data-seo-ld", `${i}`);
        script.textContent = JSON.stringify(ld);
        document.head.appendChild(script);
      });
    }

    return () => {
      document.querySelectorAll("script[data-seo-ld]").forEach(el => el.remove());
    };
  }, [fullTitle, description, absoluteImage, canonicalUrl, type, jsonLd, noindex]);

  return null;
};

export default SEOHead;
