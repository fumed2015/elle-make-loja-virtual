import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getOptimizedImageUrl } from "@/lib/image-utils";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  aspectRatio?: string;
  placeholderColor?: string;
  priority?: boolean;
  /** Max display width in px — used to request a smaller image from Supabase */
  displayWidth?: number;
}

const OptimizedImage = ({
  src,
  alt,
  className,
  aspectRatio = "1/1",
  placeholderColor,
  priority = false,
  displayWidth,
  ...props
}: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(priority);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [priority]);

  // Use original URL at full quality — no downsizing
  const optimizedSrc = inView ? src : "";

  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      style={{
        aspectRatio: aspectRatio !== "auto" ? aspectRatio : undefined,
        backgroundColor: placeholderColor || '#f8f5f2',
      }}
    >
      {/* Shimmer placeholder */}
      {!loaded && (
        <div className="absolute inset-0 bg-muted/30">
          <div className="w-full h-full bg-gradient-to-r from-muted/40 via-muted/20 to-muted/40 animate-pulse" />
        </div>
      )}

      {/* Actual image */}
      {inView && (
        <img
          src={optimizedSrc}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center',
          }}
          className={cn(
            "transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0"
          )}
          {...props}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
