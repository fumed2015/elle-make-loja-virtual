import { useState, useMemo } from "react";
import { Search, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";
import { motion, AnimatePresence } from "framer-motion";

const breadcrumbItems = [{ label: "Glossário de Beleza" }];

interface Term {
  term: string;
  definition: string;
  category: string;
  relatedProducts?: string;
}

const glossaryTerms: Term[] = [
  { term: "Ácido Hialurônico", definition: "Substância naturalmente presente na pele que retém até 1000x seu peso em água. Em cosméticos, promove hidratação profunda, preenchimento de linhas finas e efeito plump nos lábios.", category: "Ingredientes", relatedProducts: "skincare" },
  { term: "Ácido Salicílico", definition: "BHA (beta-hidroxiácido) que penetra nos poros, esfoliando internamente. Ideal para pele oleosa e acneica, reduz cravos e regula a oleosidade.", category: "Ingredientes", relatedProducts: "skincare" },
  { term: "Base Matte", definition: "Base com acabamento opaco, sem brilho. Ideal para pele oleosa pois controla o excesso de sebo e garante um visual uniforme por mais tempo.", category: "Produtos", relatedProducts: "rosto" },
  { term: "BB Cream", definition: "Produto multifuncional que combina hidratação, proteção solar leve e cobertura suave. Perfeito para o dia a dia quando se deseja um visual natural.", category: "Produtos", relatedProducts: "rosto" },
  { term: "Blush", definition: "Produto aplicado nas maçãs do rosto para dar cor e vivacidade. Disponível em pó, creme e líquido, cada textura funciona melhor para diferentes tipos de pele.", category: "Produtos", relatedProducts: "rosto" },
  { term: "Bronzer / Contorno", definition: "Produto mais escuro que o tom de pele usado para esculpir o rosto, criando sombras que definem maçãs do rosto, mandíbula e nariz.", category: "Técnicas" },
  { term: "Corretivo", definition: "Produto de alta cobertura usado para camuflar olheiras, manchas e imperfeições. Deve ser 1-2 tons mais claro que a pele para a área dos olhos.", category: "Produtos", relatedProducts: "rosto" },
  { term: "Delineador", definition: "Produto líquido, gel ou lápis usado para contornar os olhos. Pode ser aplicado na linha d'água (interno) ou na pálpebra (externo) para diferentes efeitos.", category: "Produtos", relatedProducts: "olhos" },
  { term: "FPS (Fator de Proteção Solar)", definition: "Indica o nível de proteção contra raios UVB. FPS 30 bloqueia 97% dos raios, FPS 50 bloqueia 98%. Essencial mesmo usando maquiagem, aplicar antes da base.", category: "Conceitos", relatedProducts: "skincare" },
  { term: "Gloss Labial", definition: "Produto labial com acabamento brilhante e muitas vezes transparente ou levemente colorido. Versões volumizadoras contêm ingredientes que estimulam leve circulação nos lábios.", category: "Produtos", relatedProducts: "labios" },
  { term: "Iluminador / Highlighter", definition: "Produto com partículas reflexivas que, aplicado nos pontos altos do rosto (maçãs, arco do cupido, ponta do nariz), cria um efeito de luminosidade natural.", category: "Produtos", relatedProducts: "rosto" },
  { term: "Lip Tint", definition: "Produto labial líquido que tinge os lábios como uma tinta, deixando cor duradoura com acabamento natural. Muito popular pelo efeito 'lábios mordidos'.", category: "Produtos", relatedProducts: "labios" },
  { term: "Máscara de Cílios", definition: "Produto aplicado nos cílios para alongar, dar volume e curvatura. Fórmulas à prova d'água resistem a lágrimas e suor.", category: "Produtos", relatedProducts: "olhos" },
  { term: "Niacinamida (Vitamina B3)", definition: "Ingrediente versátil que controla oleosidade, minimiza poros, uniformiza o tom da pele e fortalece a barreira cutânea. Pode ser usado com quase todos os outros ativos.", category: "Ingredientes", relatedProducts: "skincare" },
  { term: "Paleta de Sombras", definition: "Conjunto de sombras para olhos em diversas cores organizadas em um estojo. Paletas bem curadas oferecem tons complementares para criar looks variados.", category: "Produtos", relatedProducts: "olhos" },
  { term: "Pó Compacto", definition: "Produto em pó prensado que sela a maquiagem, controla o brilho e uniformiza a pele. Pode ser usado sozinho para cobertura leve ou sobre a base.", category: "Produtos", relatedProducts: "rosto" },
  { term: "Primer", definition: "Produto aplicado antes da base que prepara a pele, preenchendo poros e linhas finas. Aumenta a durabilidade da maquiagem e melhora a textura da pele.", category: "Produtos", relatedProducts: "rosto" },
  { term: "Retinol (Vitamina A)", definition: "Ativo anti-idade que estimula a renovação celular, aumenta a produção de colágeno e reduz rugas. Usar apenas à noite com proteção solar no dia seguinte.", category: "Ingredientes", relatedProducts: "skincare" },
  { term: "Setting Spray / Fixador", definition: "Spray aplicado sobre a maquiagem finalizada para fixar todos os produtos e aumentar a durabilidade. Alguns oferecem acabamento matte ou hidratante.", category: "Produtos", relatedProducts: "rosto" },
  { term: "Skincare / Rotina de Cuidados", definition: "Conjunto de etapas diárias para cuidar da pele: limpeza, tonificação, tratamento (sérum), hidratação e proteção solar. Base essencial para uma boa maquiagem.", category: "Conceitos", relatedProducts: "skincare" },
  { term: "Sombra", definition: "Produto colorido aplicado nas pálpebras para criar profundidade e destaque nos olhos. Disponível em acabamentos matte, cintilante e glitter.", category: "Produtos", relatedProducts: "olhos" },
  { term: "Vitamina C", definition: "Antioxidante potente que clareia manchas, uniformiza o tom da pele e protege contra danos do sol. Melhor aplicado pela manhã antes do protetor solar.", category: "Ingredientes", relatedProducts: "skincare" },
];

const categories = ["Todos", "Ingredientes", "Produtos", "Técnicas", "Conceitos"];

const Glossario = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return glossaryTerms
      .filter(t => {
        const matchSearch = !search || t.term.toLowerCase().includes(search.toLowerCase()) || t.definition.toLowerCase().includes(search.toLowerCase());
        const matchCat = activeCategory === "Todos" || t.category === activeCategory;
        return matchSearch && matchCat;
      })
      .sort((a, b) => a.term.localeCompare(b.term, "pt-BR"));
  }, [search, activeCategory]);

  // Group by first letter
  const grouped = useMemo(() => {
    const groups: Record<string, Term[]> = {};
    filtered.forEach(t => {
      const letter = t.term[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(t);
    });
    return groups;
  }, [filtered]);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: glossaryTerms.slice(0, 10).map(t => ({
      "@type": "Question",
      name: `O que é ${t.term}?`,
      acceptedAnswer: { "@type": "Answer", text: t.definition },
    })),
  };

  return (
    <div>
      <SEOHead
        title="Glossário de Beleza e Maquiagem"
        description="Dicionário completo de termos de beleza, maquiagem e skincare. Aprenda sobre ingredientes, técnicas e produtos cosméticos."
        jsonLd={[breadcrumbJsonLd(breadcrumbItems), faqJsonLd]}
      />
      <Breadcrumbs items={breadcrumbItems} />

      <div className="max-w-3xl mx-auto px-4 py-8 pb-24">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2 text-foreground">Glossário de Beleza</h1>
          <p className="text-muted-foreground">Tudo que você precisa saber sobre ingredientes, técnicas e produtos de maquiagem</p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar termo..."
            className="pl-10"
          />
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-xs text-muted-foreground mb-4">{filtered.length} termos encontrados</p>

        {/* Terms grouped by letter */}
        {Object.entries(grouped).map(([letter, terms]) => (
          <div key={letter} className="mb-6">
            <h2 className="text-xl font-display font-bold text-primary mb-3 sticky top-0 bg-background py-1 z-10">{letter}</h2>
            <div className="space-y-2">
              {terms.map(t => (
                <div key={t.term} className="border border-border rounded-xl overflow-hidden bg-card">
                  <button
                    onClick={() => setExpandedTerm(expandedTerm === t.term ? null : t.term)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <div>
                      <span className="font-semibold text-foreground">{t.term}</span>
                      <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t.category}</span>
                    </div>
                    {expandedTerm === t.term ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </button>
                  <AnimatePresence>
                    {expandedTerm === t.term && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 text-sm text-muted-foreground border-t border-border pt-3">
                          <p>{t.definition}</p>
                          {t.relatedProducts && (
                            <a
                              href={`/explorar?cat=${t.relatedProducts}`}
                              className="inline-flex items-center gap-1 mt-3 text-xs text-primary font-medium hover:underline"
                            >
                              Ver produtos relacionados →
                            </a>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">Nenhum termo encontrado</p>
            <p className="text-sm mt-1">Tente buscar com outras palavras</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Glossario;