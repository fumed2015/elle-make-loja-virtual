import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles, RotateCcw, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";
import { useAllProductsUnified } from "@/hooks/useProducts";

const breadcrumbItems = [{ label: "Quiz de Beleza" }];

interface Question {
  id: string;
  question: string;
  options: { label: string; value: string; emoji: string }[];
}

const questions: Question[] = [
  {
    id: "skin_type",
    question: "Qual é o seu tipo de pele?",
    options: [
      { label: "Oleosa", value: "oleosa", emoji: "💧" },
      { label: "Seca", value: "seca", emoji: "🏜️" },
      { label: "Mista", value: "mista", emoji: "⚖️" },
      { label: "Normal", value: "normal", emoji: "✨" },
    ],
  },
  {
    id: "concern",
    question: "Qual sua principal preocupação?",
    options: [
      { label: "Acne e poros", value: "acne", emoji: "🔬" },
      { label: "Manchas e tom desigual", value: "manchas", emoji: "🎨" },
      { label: "Linhas e firmeza", value: "antiaging", emoji: "⏳" },
      { label: "Hidratação e brilho", value: "hidratacao", emoji: "💎" },
    ],
  },
  {
    id: "finish",
    question: "Que acabamento você prefere na make?",
    options: [
      { label: "Matte (sem brilho)", value: "matte", emoji: "🌑" },
      { label: "Natural / Pele saudável", value: "natural", emoji: "🌿" },
      { label: "Luminoso / Glow", value: "glow", emoji: "✨" },
      { label: "Full coverage (alta cobertura)", value: "full", emoji: "💄" },
    ],
  },
  {
    id: "routine",
    question: "Quanto tempo você dedica à make diária?",
    options: [
      { label: "5 minutos (básico)", value: "rapida", emoji: "⚡" },
      { label: "10-15 minutos", value: "media", emoji: "⏱️" },
      { label: "20+ minutos (completa)", value: "completa", emoji: "🎭" },
      { label: "Só em ocasiões especiais", value: "especial", emoji: "🌟" },
    ],
  },
  {
    id: "budget",
    question: "Qual sua faixa de investimento?",
    options: [
      { label: "Até R$50", value: "economico", emoji: "💰" },
      { label: "R$50 – R$100", value: "medio", emoji: "💳" },
      { label: "R$100 – R$200", value: "premium", emoji: "👑" },
      { label: "Acima de R$200", value: "luxo", emoji: "💎" },
    ],
  },
];

// Recommendation logic based on answers
function getRecommendations(answers: Record<string, string>) {
  const tags: string[] = [];
  const categories: string[] = [];

  if (answers.skin_type === "oleosa") { tags.push("matte", "oil-free", "controle"); categories.push("rosto"); }
  if (answers.skin_type === "seca") { tags.push("hidratante", "cremoso"); categories.push("skincare"); }
  if (answers.concern === "acne") { tags.push("primer", "controle"); }
  if (answers.concern === "manchas") { tags.push("corretivo", "base"); categories.push("rosto"); }
  if (answers.concern === "hidratacao") { tags.push("hidratante", "glow"); categories.push("skincare"); }
  if (answers.finish === "matte") { tags.push("matte"); }
  if (answers.finish === "glow") { tags.push("iluminador", "glow"); }
  if (answers.routine === "rapida") { tags.push("multifuncional", "kit"); }
  if (answers.routine === "completa") { tags.push("paleta", "kit"); categories.push("olhos"); }

  return { tags, categories, budget: answers.budget };
}

const QuizBeleza = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const { data: allProducts } = useAllProductsUnified();

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    if (step < questions.length - 1) {
      setTimeout(() => setStep(s => s + 1), 300);
    } else {
      setTimeout(() => setShowResults(true), 300);
    }
  };

  const recommended = useMemo(() => {
    if (!showResults || !allProducts?.length) return [];
    const { tags, categories, budget } = getRecommendations(answers);
    const maxPrice = budget === "economico" ? 50 : budget === "medio" ? 100 : budget === "premium" ? 200 : 99999;

    // Score products
    const scored = allProducts
      .filter(p => p.price <= maxPrice)
      .map(p => {
        let score = 0;
        const pTags = (p.tags || []).map((t: string) => t.toLowerCase());
        const pName = p.name.toLowerCase();
        const pDesc = (p.description || "").toLowerCase();
        const pCatSlug = (p as any).categories?.slug || "";

        for (const tag of tags) {
          if (pTags.includes(tag) || pName.includes(tag) || pDesc.includes(tag)) score += 3;
        }
        for (const cat of categories) {
          if (pCatSlug === cat) score += 2;
        }
        if (p.is_featured) score += 1;
        if (p.compare_at_price && p.compare_at_price > p.price) score += 1;

        return { ...p, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return scored;
  }, [showResults, allProducts, answers]);

  const reset = () => { setStep(0); setAnswers({}); setShowResults(false); };

  const skinProfile = useMemo(() => {
    if (!showResults) return null;
    const labels: Record<string, string> = {
      oleosa: "Oleosa", seca: "Seca", mista: "Mista", normal: "Normal",
      acne: "Controle de acne", manchas: "Uniformização", antiaging: "Anti-idade", hidratacao: "Hidratação",
      matte: "Matte", natural: "Natural", glow: "Luminoso", full: "Alta cobertura",
    };
    return {
      skinType: labels[answers.skin_type] || "",
      concern: labels[answers.concern] || "",
      finish: labels[answers.finish] || "",
    };
  }, [showResults, answers]);

  const quizJsonLd = {
    "@context": "https://schema.org",
    "@type": "Quiz",
    name: "Quiz de Beleza – Descubra seu tipo de pele",
    description: "Responda 5 perguntas e descubra os melhores produtos de maquiagem para o seu tipo de pele e estilo.",
    educationalAlignment: { "@type": "AlignmentObject", targetName: "Cuidados com a pele e maquiagem" },
  };

  return (
    <div>
      <SEOHead
        title="Quiz de Beleza – Descubra Seu Tipo de Pele"
        description="Responda 5 perguntas rápidas e descubra os melhores produtos de maquiagem para o seu tipo de pele. Quiz personalizado Elle Make."
        jsonLd={[breadcrumbJsonLd(breadcrumbItems), quizJsonLd]}
      />
      <Breadcrumbs items={breadcrumbItems} />

      <div className="max-w-2xl mx-auto px-4 py-8 pb-24 min-h-[70vh]">
        {!showResults ? (
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
              {/* Progress */}
              <div className="flex items-center gap-2 mb-8">
                {questions.map((_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
                ))}
              </div>

              <p className="text-xs text-muted-foreground mb-2">{step + 1} de {questions.length}</p>
              <h1 className="text-2xl md:text-3xl font-display font-bold mb-8 text-foreground">
                {questions[step].question}
              </h1>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {questions[step].options.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswer(questions[step].id, opt.value)}
                    className={`p-5 rounded-2xl border-2 text-left transition-all hover:border-primary hover:shadow-md ${
                      answers[questions[step].id] === opt.value
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border bg-card"
                    }`}
                  >
                    <span className="text-2xl mb-2 block">{opt.emoji}</span>
                    <span className="font-medium text-foreground">{opt.label}</span>
                  </button>
                ))}
              </div>

              {step > 0 && (
                <Button variant="ghost" className="mt-6" onClick={() => setStep(s => s - 1)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
              )}
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Results header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-bold mb-2">Seu Perfil de Beleza ✨</h1>
              <p className="text-muted-foreground">Baseado nas suas respostas, preparamos sugestões perfeitas para você</p>
            </div>

            {/* Profile cards */}
            {skinProfile && (
              <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Pele</p>
                  <p className="font-semibold text-sm text-foreground">{skinProfile.skinType}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Foco</p>
                  <p className="font-semibold text-sm text-foreground">{skinProfile.concern}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Acabamento</p>
                  <p className="font-semibold text-sm text-foreground">{skinProfile.finish}</p>
                </div>
              </div>
            )}

            {/* Recommended products */}
            <h2 className="text-lg font-display font-bold mb-4">Produtos Recomendados Para Você</h2>
            {recommended.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                {recommended.map((p: any) => (
                  <Link key={p.id} to={`/produto/${p.slug}`} className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-square overflow-hidden bg-muted">
                      <img src={p.images?.[0] || "/placeholder.svg"} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-muted-foreground truncate">{p.brand}</p>
                      <p className="text-sm font-medium text-foreground line-clamp-2">{p.name}</p>
                      <p className="text-sm font-bold text-primary mt-1">R$ {Number(p.price).toFixed(2)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm mb-8">Carregando recomendações...</p>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={reset} className="flex-1">
                <RotateCcw className="w-4 h-4 mr-1" /> Refazer Quiz
              </Button>
              <Button asChild className="flex-1">
                <Link to="/explorar"><ShoppingBag className="w-4 h-4 mr-1" /> Ver Catálogo</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default QuizBeleza;