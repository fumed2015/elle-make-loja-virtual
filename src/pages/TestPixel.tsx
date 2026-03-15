import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fbTrackPurchase, fbTrackInitiateCheckout } from "@/hooks/useMetaPixel";
import { trackPurchase, trackInitiateCheckout } from "@/hooks/useTikTokPixel";

const TestPixel = () => {
  const [fired, setFired] = useState(false);

  const fireTestPurchase = () => {
    const fakeOrderId = "test-" + Date.now();
    const fakeValue = 149.90;
    const fakeContentIds = ["test-product-001"];
    const fakeContents = [{ id: "test-product-001", quantity: 1 }];

    // Meta Pixel Purchase
    fbTrackPurchase({
      orderId: fakeOrderId,
      value: fakeValue,
      itemCount: 1,
      contentIds: fakeContentIds,
      contents: fakeContents,
    });

    // TikTok Pixel Purchase
    trackPurchase({
      orderId: fakeOrderId,
      value: fakeValue,
      itemCount: 1,
      contentIds: fakeContentIds,
    });

    setFired(true);
    toast.success("Eventos de Purchase disparados! Verifique o painel do UTMify e Meta.");
  };

  const fireTestInitiateCheckout = () => {
    fbTrackInitiateCheckout({
      value: 149.90,
      itemCount: 1,
      contentIds: ["test-product-001"],
      contents: [{ id: "test-product-001", quantity: 1 }],
    });
    trackInitiateCheckout({ value: 149.90, itemCount: 1, contentIds: ["test-product-001"] });
    toast.success("Evento InitiateCheckout disparado!");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
      <h1 className="text-2xl font-display font-bold">🧪 Teste de Pixels</h1>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        Clique nos botões para disparar eventos fake. Depois verifique no painel do UTMify e no Meta Events Manager.
      </p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button onClick={fireTestInitiateCheckout} variant="outline" className="min-h-[44px]">
          🛒 Disparar InitiateCheckout
        </Button>
        <Button onClick={fireTestPurchase} className="bg-primary text-primary-foreground min-h-[44px]">
          💰 Disparar Purchase (R$ 149,90)
        </Button>
      </div>

      {fired && (
        <div className="bg-accent/10 rounded-lg p-4 text-center max-w-md">
          <p className="text-sm font-medium text-accent">✅ Eventos disparados!</p>
          <p className="text-xs text-muted-foreground mt-1">
            O texto "Pedido Registrado" também aparecerá abaixo para o UTMify detectar a Purchase por texto na página.
          </p>
          <p className="text-lg font-bold mt-3">Pedido Registrado!</p>
        </div>
      )}
    </div>
  );
};

export default TestPixel;
