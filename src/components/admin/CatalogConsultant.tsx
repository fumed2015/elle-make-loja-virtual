import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Send, ShoppingCart, Sparkles, Trash2, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/catalog-consultant`;

const QUICK_PROMPTS = [
  { label: "🔍 Filtro de Fornecedor", prompt: "Analise os produtos do catálogo importado. Classifique os 5 melhores como 'estrelas' (lucro+imagem) e os 5 piores como 'bois de piranha' (só volume). Justifique com números de margem." },
  { label: "📦 Anti-Encalhe", prompt: "Quais produtos do meu catálogo têm maior risco de encalhe? Sugira bundles/kits para girá-los sem perder margem. Calcule o preço ideal do kit." },
  { label: "📅 Calendário Sazonal", prompt: "Considerando os próximos 60 dias, quais categorias devo reforçar o estoque e o que NÃO devo comprar? Considere meu orçamento e metas." },
  { label: "💰 Análise de Margem", prompt: "Calcule a margem de contribuição real de cada produto da loja (preço - custo - frete - taxa - embalagem). Quais estão abaixo da margem desejada? Ranking de rentabilidade." },
  { label: "🧮 Simulação de Compra", prompt: "Tenho R$3.000 para investir em estoque. Simule a melhor distribuição de compra considerando meu mix atual, margem desejada e ticket médio necessário. Quais produtos priorizar?" },
  { label: "📊 ROI por Marca", prompt: "Compare o ROI esperado de cada marca no meu catálogo. Considere preço de compra, preço de venda, giro estimado e margem líquida. Qual marca devo aumentar e qual devo reduzir?" },
];

const CatalogConsultant = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setShowQuickPrompts(false);
    const userMsg: Msg = { role: "user", content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro na consultora" }));
        throw new Error(err.error || `Erro ${resp.status}`);
      }

      if (!resp.body) throw new Error("Sem resposta de streaming");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              const snapshot = assistantSoFar;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: snapshot } : m);
                }
                return [...prev, { role: "assistant", content: snapshot }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              const snapshot = assistantSoFar;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: snapshot } : m);
                }
                return [...prev, { role: "assistant", content: snapshot }];
              });
            }
          } catch {}
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao consultar a IA");
      if (!assistantSoFar) {
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <Card className="flex flex-col h-[500px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-accent/5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-bold">Head de Compras</p>
            <p className="text-[9px] text-muted-foreground">Estrategista de Portfólio & Mix</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setShowQuickPrompts(!showQuickPrompts)}
                title="Atalhos rápidos"
              >
                <Zap className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setMessages([]); setShowQuickPrompts(false); }}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Quick prompts popover */}
      {showQuickPrompts && (
        <div className="px-4 py-2 border-b bg-muted/50 shrink-0">
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_PROMPTS.map((qp, i) => (
              <button
                key={i}
                onClick={() => sendMessage(qp.prompt)}
                className="text-left p-2 rounded-lg border bg-card hover:bg-accent/10 transition-colors"
              >
                <p className="text-[9px] font-medium">{qp.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3" ref={scrollContainerRef}>
        {messages.length === 0 ? (
          <div className="space-y-3">
            <div className="text-center py-4">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-primary/40" />
              <p className="text-xs font-medium text-muted-foreground">Consultora de Compras IA</p>
              <p className="text-[10px] text-muted-foreground mt-1">Análise de portfólio, margem, tendências e risco de encalhe</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_PROMPTS.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(qp.prompt)}
                  className="text-left p-2.5 rounded-lg border bg-card hover:bg-accent/10 transition-colors"
                >
                  <p className="text-[10px] font-medium">{qp.label}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-xs max-w-none dark:prose-invert [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_strong]:text-foreground">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-xl px-3 py-2 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span className="text-[9px] text-muted-foreground">Analisando...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t px-3 py-2 shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex gap-2"
        >
          <Input
            ref={inputRef}
            placeholder="Pergunte sobre compras, mix, margens..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="text-xs h-8"
          />
          <Button type="submit" size="icon" className="h-8 w-8 shrink-0" disabled={isLoading || !input.trim()}>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>
    </Card>
  );
};

export default CatalogConsultant;
