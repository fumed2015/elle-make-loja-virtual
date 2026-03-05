import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/beauty-consultant`;

const quickQuestions = [
  "Pele oleosa",
  "Rotina de skincare",
  "Base para pele negra",
  "Maquiagem pro dia a dia",
  "Protetor solar",
  "Kit completo",
];

const InlineConsultant = () => {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Oi, amiga! 😊 Sou a **Michelle**, consultora de beleza da Elle Make. Me conta o que você tá procurando — vou te ajudar a encontrar os produtos perfeitos pra você!" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hasInteracted = useRef(false);
  const msgIdCounter = useRef(0);
  const [msgKeys] = useState<Map<number, string>>(() => new Map());

  const getMsgKey = (index: number) => {
    if (!msgKeys.has(index)) {
      msgKeys.set(index, `msg-${msgIdCounter.current++}`);
    }
    return msgKeys.get(index)!;
  };

  useEffect(() => {
    if (hasInteracted.current && scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;
    hasInteracted.current = true;
    const userMsg: Msg = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "Erro na consultora");
      }

      if (!resp.body) throw new Error("No stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
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
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && prev.length > newMessages.length) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Erro ao consultar a IA");
      setMessages(prev => [...prev, { role: "assistant", content: "Desculpe, tive um problema. Tente novamente! 💫" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="px-4 py-10 max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" /> Michelle — Consultora de Beleza
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Precisa de ajuda para escolher?</h2>
        <p className="text-sm text-muted-foreground">Fala com a Michelle — ela conhece todos os nossos produtos e vai te dar dicas incríveis!</p>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {/* Chat messages */}
        <div ref={scrollContainerRef} className="h-[320px] overflow-y-auto px-4 py-4 space-y-3">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={getMsgKey(i)}
                initial={i === messages.length - 1 ? { opacity: 0, y: 8 } : false}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none [&_p]:m-0 [&_ul]:my-1 [&_li]:my-0 text-foreground">
                      <ReactMarkdown
                        components={{
                          a: ({ href, children }) => {
                            if (href?.startsWith("/")) {
                              return (
                                <Link to={href} className="text-primary font-semibold underline hover:text-primary/80 transition-colors">
                                  {children}
                                </Link>
                              );
                            }
                            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">{children}</a>;
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          
        </div>

        {/* Quick questions */}
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {quickQuestions.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              disabled={isLoading}
              className="flex-shrink-0 px-3 py-1 rounded-full bg-primary/10 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ex: Qual base combina com minha pele?"
              className="bg-muted border-none min-h-[44px] text-sm"
              disabled={isLoading}
            />
            <Button onClick={() => send()} disabled={!input.trim() || isLoading} size="icon" className="bg-primary min-w-[44px] min-h-[44px]">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InlineConsultant;
