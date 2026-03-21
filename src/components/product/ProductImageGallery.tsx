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
    <div className="relative overflow-hidden rounded-xl" style={{ backgroundColor: '#f8f5f2' }}>
      {/* Main image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ aspectRatio: '1/1', backgroundColor: '#f8f5f2' }}
        >
          <OptimizedImage
            src={validImages[current]}
            alt={`${alt} - Imagem ${current + 1}`}
            aspectRatio="1/1"
            displayWidth={1200}
            priority
            className="w-full h-full"
            placeholderColor="#f8f5f2"
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
        <div className="flex gap-2 p-2" style={{ backgroundColor: '#f8f5f2' }}>
          {validImages.map((img, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrent(i); }}
              className={cn(
                "rounded-lg overflow-hidden border-2 transition-all flex-shrink-0",
                i === current ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
              )}
              style={{ width: 80, height: 80, backgroundColor: '#f8f5f2' }}
            >
              <img
                src={img}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center',
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;
