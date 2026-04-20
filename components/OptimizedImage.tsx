import React from "react";

type LoadingMode = "eager" | "lazy";
type DecodingMode = "async" | "auto" | "sync";
type FetchPriorityMode = "high" | "low" | "auto";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  sizes?: string;
  srcSet?: string;
  loading?: LoadingMode;
  decoding?: DecodingMode;
  fetchPriority?: FetchPriorityMode;
  referrerPolicy?: React.ImgHTMLAttributes<HTMLImageElement>["referrerPolicy"];
  draggable?: boolean;
  style?: React.CSSProperties;
}

const withFormat = (url: string, format: "avif" | "webp" | "jpg"): string => {
  if (!url.includes("images.unsplash.com")) return url;
  if (url.match(/[?&]fm=/)) return url.replace(/([?&]fm=)[^&]+/, `$1${format}`);
  const glue = url.includes("?") ? "&" : "?";
  return `${url}${glue}fm=${format}`;
};

const convertSrcSet = (srcSet: string | undefined, format: "avif" | "webp" | "jpg"): string | undefined => {
  if (!srcSet) return undefined;
  return srcSet
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const parts = chunk.split(/\s+/);
      const src = parts[0];
      const descriptor = parts.slice(1).join(" ");
      const converted = withFormat(src, format);
      return descriptor ? `${converted} ${descriptor}` : converted;
    })
    .join(", ");
};

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className,
  width,
  height,
  sizes,
  srcSet,
  loading = "lazy",
  decoding = "async",
  fetchPriority,
  referrerPolicy = "no-referrer",
  draggable = false,
  style,
}) => {
  const avifSrc = withFormat(src, "avif");
  const webpSrc = withFormat(src, "webp");
  const fallbackSrc = withFormat(src, "jpg");
  const avifSet = convertSrcSet(srcSet, "avif");
  const webpSet = convertSrcSet(srcSet, "webp");
  const fallbackSet = convertSrcSet(srcSet, "jpg");

  return (
    <picture>
      <source type="image/avif" srcSet={avifSet ?? avifSrc} sizes={sizes} />
      <source type="image/webp" srcSet={webpSet ?? webpSrc} sizes={sizes} />
      <img
        src={fallbackSrc}
        srcSet={fallbackSet}
        sizes={sizes}
        alt={alt}
        className={className}
        width={width}
        height={height}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        referrerPolicy={referrerPolicy}
        draggable={draggable}
        style={style}
      />
    </picture>
  );
};

export default OptimizedImage;
