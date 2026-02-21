import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useProducts } from "@/hooks/useProducts";
import ProductCard from "@/components/product/ProductCard";
import SEOHead from "@/components/SEOHead";
import { useState } from "react";

const categoryMeta: Record<string, { title: string; description: string }> = {
  rosto: { title: "Rosto", description: "Bases, corretivos, pós, blushes e contornos para um rosto perfeito." },
  olhos: { title: "Olhos", description: "Sombras, paletas, delineadores e máscaras para um olhar marcante." },
  labios: { title: "Lábios", description: "Batons, glosses e lip tints para lábios irresistíveis." },
  skincare: { title: "Skincare", description: "Hidratantes, protetores solares e séruns para cuidar da sua pele." },
  acessorios: { title: "Acessórios", description: "Pincéis, esponjas e acessórios essenciais para sua make." },
  ofertas: { title: "Ofertas", description: "Os melhores descontos em maquiagem e cosméticos." },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const Categoria = () => {
  const { slug } = useParams<{ slug: string }>();
  const [search, setSearch] = useState("");
  const meta = categoryMeta[slug || ""] || { title: slug || "Categoria", description: "" };

  const isOfertas = slug === "ofertas";

  const { data: products, isLoading } = useProducts({
    categorySlug: isOfertas ? undefined : slug,
    search: search || undefined,
  });

  const filtered = isOfertas
    ? products?.filter((p) => p.compare_at_price && p.compare_at_price > p.price)
    : products;

  const finalProducts = search
    ? filtered?.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : filtered;

  return (
    <div className="px-4 pt-8 pb-4 max-w-5xl mx-auto">
      <SEOHead title={meta.title} description={meta.description} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">{meta.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{meta.description}</p>
      </motion.div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={`Buscar em ${meta.title}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-muted border-none min-h-[44px] rounded-full"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : finalProducts?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Nenhum produto encontrado</p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {finalProducts?.map((product, i) => (
            <motion.div key={product.id} variants={item}>
              <ProductCard product={product} index={i} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default Categoria;
