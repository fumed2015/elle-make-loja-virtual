import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useProducts } from "@/hooks/useProducts";
import ProductCard from "@/components/product/ProductCard";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";
import { useState } from "react";

const brandNames: Record<string, string> = {
  "ruby-rose": "Ruby Rose",
  "max-love": "Max Love",
  "sarah-beauty": "Sarah Beauty",
  "phallebeauty": "Phallebeauty",
  "luisance": "Luisance",
  "macrilan": "Macrilan",
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const Marca = () => {
  const { slug } = useParams<{ slug: string }>();
  const [search, setSearch] = useState("");
  const brandName = brandNames[slug || ""] || slug || "Marca";

  const { data: products, isLoading } = useProducts({ search: brandName });

  const filtered = search
    ? products?.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : products;

  return (
    <div className="px-4 pt-8 pb-4 max-w-7xl mx-auto">
      <SEOHead title={brandName} description={`Produtos ${brandName} com entrega rápida em Belém. Confira toda a linha.`} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">{brandName}</h1>
        <p className="text-sm text-muted-foreground mb-6">Todos os produtos {brandName} com delivery rápido em Belém.</p>
      </motion.div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={`Buscar em ${brandName}...`}
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
      ) : filtered?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">Nenhum produto encontrado</p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {filtered?.map((product, i) => (
            <motion.div key={product.id} variants={item}>
              <ProductCard product={product} index={i} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default Marca;
