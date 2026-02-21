import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TrackingPixelsInjector = () => {
  const { data: pixels } = useQuery({
    queryKey: ["active-tracking-pixels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracking_pixels")
        .select("id, pixel_code")
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // cache 5 min
  });

  useEffect(() => {
    // Clean previous injected scripts
    document.querySelectorAll("script[data-tracking-pixel], noscript[data-tracking-pixel]").forEach(el => el.remove());

    if (!pixels?.length) return;

    pixels.forEach((pixel) => {
      const container = document.createElement("div");
      container.innerHTML = pixel.pixel_code;

      // Extract and inject script tags properly
      container.querySelectorAll("script").forEach((original) => {
        const script = document.createElement("script");
        // Copy attributes
        Array.from(original.attributes).forEach((attr) => {
          script.setAttribute(attr.name, attr.value);
        });
        script.setAttribute("data-tracking-pixel", pixel.id);
        if (original.textContent) {
          script.textContent = original.textContent;
        }
        document.head.appendChild(script);
      });

      // Also inject noscript tags
      container.querySelectorAll("noscript").forEach((original) => {
        const noscript = document.createElement("noscript");
        noscript.setAttribute("data-tracking-pixel", pixel.id);
        noscript.innerHTML = original.innerHTML;
        document.head.appendChild(noscript);
      });
    });

    return () => {
      document.querySelectorAll("script[data-tracking-pixel], noscript[data-tracking-pixel]").forEach(el => el.remove());
    };
  }, [pixels]);

  return null;
};

export default TrackingPixelsInjector;
