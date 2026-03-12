import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import OptimizedImage from "@/components/ui/optimized-image";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ProductImageGalleryProps {
  images: string[];
  alt: string;
  children?: React.ReactNode; // for overlay badges
}

const ProductImageGallery = ({ images, alt, children }: ProductImageGalleryProps) => {
  const [current, setCurrent] = useState(0);
  const validImages = images?.filter(Boolean) || [];

  if (validImages.length === 0) {
    return (
      <div className="aspect-[4/5] bg-white flex items-center justify-center text-muted-foreground rounded-xl">
        Sem imagem
      </div>
    );
  }

  const goTo = (index: number) => {
    setCurrent((index + validImages.length) % validImages.length);
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-white">
      {/* Main image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <OptimizedImage
            src={validImages[current]}
            alt={`${alt} - Imagem ${current + 1}`}
            aspectRatio="4/5"
            displayWidth={800}
            className="w-full bg-white"
          />
        </motion.div>
      </AnimatePresence>

      {/* Overlays */}
      {children}

      {/* Navigation arrows */}
      {validImages.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(current - 1); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-background/90 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(current + 1); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-background/90 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {validImages.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {validImages.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrent(i); }}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i === current ? "bg-primary w-4" : "bg-background/60"
              )}
            />
          ))}
        </div>
      )}

      {/* Thumbnails strip */}
      {validImages.length > 1 && (
        <div className="flex gap-1.5 p-2 bg-background/50 backdrop-blur-sm">
          {validImages.map((img, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrent(i); }}
              className={cn(
                "w-12 h-12 rounded-md overflow-hidden border-2 transition-all flex-shrink-0",
                i === current ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
              )}
            >
              <img src={img} alt="" className="w-full h-full object-cover bg-white" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;
