import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  aspectRatio?: string;
  placeholderColor?: string;
}

const OptimizedImage = ({
  src,
  alt,
  className,
  aspectRatio = "1/1",
  placeholderColor,
  ...props
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden bg-muted", className)}
      style={{ aspectRatio }}
    >
      {/* Shimmer placeholder */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-500",
          loaded ? "opacity-0" : "opacity-100"
        )}
        style={{ backgroundColor: placeholderColor }}
      >
        <div className="w-full h-full bg-gradient-to-r from-muted via-muted-foreground/5 to-muted animate-pulse" />
      </div>

      {/* Actual image - only render src when in viewport */}
      {inView && (
        <picture>
          {src.match(/\.(jpe?g|png)$/i) && !src.includes('supabase.co') && (
            <source
              srcSet={src.replace(/\.(jpe?g|png)$/i, '.webp')}
              type="image/webp"
            />
          )}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-500",
              loaded ? "opacity-100" : "opacity-0"
            )}
            {...props}
          />
        </picture>
      )}
    </div>
  );
};

export default OptimizedImage;
