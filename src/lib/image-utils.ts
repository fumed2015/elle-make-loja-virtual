/**
 * Appends Supabase Storage image transformation parameters to optimize delivery.
 * Only applies to Supabase-hosted images.
 */
export function getOptimizedImageUrl(
  src: string,
  options?: { width?: number; quality?: number }
): string {
  if (!src) return src;

  const isSupabaseStorage = src.includes('.supabase.co/storage/v1/object/public/');
  if (!isSupabaseStorage) return src;

  // Convert public URL to render (transformation) URL
  const renderUrl = src.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );

  const params = new URLSearchParams();
  if (options?.width) params.set('width', String(options.width));
  if (options?.quality) params.set('quality', String(options.quality));

  const separator = renderUrl.includes('?') ? '&' : '?';
  return `${renderUrl}${separator}${params.toString()}`;
}
