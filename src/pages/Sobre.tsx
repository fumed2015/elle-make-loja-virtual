import SEOHead from "@/components/SEOHead";
import { Heart, MapPin, Truck, ShieldCheck, Star } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { Button } from "@/components/ui/button";

const values = [
  { icon: Heart, title: "Paixão por Beleza", desc: "Selecionamos cada produto com carinho, priorizando qualidade e custo-benefício." },
  { icon: ShieldCheck, title: "100% Original", desc: "Todos os produtos são adquiridos de fabricantes e distribuidores autorizados." },
  { icon: Truck, title: "Entrega Rápida", desc: "Entrega em até 3 horas na região metropolitana de Belém com nosso motoboy express." },
  { icon: Star, title: "Atendimento Humano", desc: "Suporte personalizado via WhatsApp — ajudamos a escolher o tom ideal da sua base." },
];

const Sobre = () => (
  <div className="pb-24">
    <SEOHead
      title="Sobre Nós"
      description="Conheça a Elle Make — loja de maquiagem e cosméticos com entrega rápida em Belém do Pará."
      jsonLd={{
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: "Elle Make",
        description: "Loja de maquiagem e cosméticos com delivery rápido em Belém do Pará.",
        address: { "@type": "PostalAddress", addressLocality: "Belém", addressRegion: "PA", addressCountry: "BR" },
        telephone: "+5591920048471",
        url: "https://ellemake2.lovable.app",
      }}
    />

    {/* Hero */}
    <section className="bg-gradient-to-b from-primary/10 to-background px-4 py-16 text-center">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-4xl font-display font-bold text-foreground">Sobre a Elle Make</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Nascemos da paixão pela beleza acessível em Belém do Pará. Nossa missão é levar maquiagem de qualidade com a rapidez que você merece — direto na sua porta.
        </p>
      </div>
    </section>

    {/* Story */}
    <section className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <h2 className="text-2xl font-display font-bold text-foreground">Nossa História</h2>
      <div className="text-muted-foreground space-y-4 leading-relaxed">
        <p>
          A Elle Make começou como um sonho de tornar a maquiagem profissional acessível para as mulheres de Belém. 
          Cansadas de esperar dias por produtos vindos de outros estados, decidimos criar uma loja com entrega local 
          ultrarrápida — e assim nascemos.
        </p>
        <p>
          Hoje trabalhamos com as melhores marcas nacionais como Ruby Rose, Max Love, Phallebeauty, Sarah Beauty, 
          Luisance e Macrilan, oferecendo produtos 100% originais com preços justos e entrega em até 3 horas 
          na região metropolitana de Belém.
        </p>
        <p>
          Mais do que uma loja, somos uma comunidade de mulheres que acreditam no poder da autoestima. 
          Cada produto que vendemos carrega o compromisso de realçar a beleza natural de cada cliente.
        </p>
      </div>
    </section>

    {/* Values */}
    <section className="bg-card border-y border-border px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-display font-bold text-center text-foreground mb-8">Nossos Valores</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {values.map((v) => (
            <div key={v.title} className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <v.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{v.title}</h3>
                <p className="text-sm text-muted-foreground">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* Location */}
    <section className="max-w-3xl mx-auto px-4 py-12 text-center space-y-4">
      <div className="flex items-center justify-center gap-2 text-primary">
        <MapPin className="w-5 h-5" />
        <span className="font-semibold">Belém do Pará</span>
      </div>
      <p className="text-muted-foreground">
        Atendemos toda a região metropolitana de Belém e Ananindeua com entrega expressa. 
        Para demais localidades, utilizamos o Melhor Envio para garantir o melhor custo e prazo.
      </p>
      <Button asChild className="bg-primary text-primary-foreground rounded-full px-8 min-h-[48px]">
        <a href="https://wa.me/5591983045531?text=Olá! Gostaria de conhecer mais sobre a Elle Make" target="_blank" rel="noopener noreferrer">
          <WhatsAppIcon className="w-4 h-4 mr-2" />
          Fale Conosco
        </a>
      </Button>
    </section>
  </div>
);

export default Sobre;
