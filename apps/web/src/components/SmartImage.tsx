"use client";

import { useEffect, useState } from "react";

interface SmartImageProps {
  src: string | null | undefined;
  fallback: string;
  alt: string;
  className?: string;
}

export function SmartImage({ src, fallback, alt, className }: SmartImageProps) {
  const initial = src && src.length > 0 ? src : fallback;
  const [imgSrc, setImgSrc] = useState(initial);

  useEffect(() => {
    setImgSrc(src && src.length > 0 ? src : fallback);
  }, [src, fallback]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={() => setImgSrc(fallback)}
    />
  );
}
