import React, { useEffect, useRef, useState } from "react";

interface LazyRenderProps {
  children: React.ReactNode;
  minHeight?: number;
}

const LazyRender: React.FC<LazyRenderProps> = ({ children, minHeight = 1200 }) => {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "500px 0px" }
    );

    observer.observe(anchor);
    return () => observer.disconnect();
  }, [isVisible]);

  if (!isVisible) {
    return (
      <div
        ref={anchorRef}
        style={{ minHeight }}
        aria-hidden="true"
        className="w-full"
      />
    );
  }

  return <>{children}</>;
};

export default LazyRender;
