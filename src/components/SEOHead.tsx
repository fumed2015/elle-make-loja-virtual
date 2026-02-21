import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  
}

const SITE_NAME = "Elle Make | Maquiagem em Belém";
const DEFAULT_DESC = "Loja de maquiagem e cosméticos com delivery rápido em Belém do Pará. Frete grátis acima de R$ 199. Entrega em até 3h.";
const DEFAULT_IMAGE = "/og-image.jpg";

const SEOHead = ({
  title,
  description = DEFAULT_DESC,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  jsonLd,
}: SEOHeadProps) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;

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
    setMeta("property", "og:image", image);
    setMeta("property", "og:site_name", "Elle Make");
    setMeta("property", "og:locale", "pt_BR");
    if (url) setMeta("property", "og:url", url);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image);
    setMeta("name", "robots", "index, follow");

    // Canonical
    let canonical = document.querySelector("link[rel='canonical']") as HTMLLinkElement;
    if (url) {
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
      }
      canonical.setAttribute("href", url);
    }

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
  }, [fullTitle, description, image, url, type, jsonLd]);

  return null;
};

export default SEOHead;
