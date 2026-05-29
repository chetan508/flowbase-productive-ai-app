"use client";

import { useEffect, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type RevealProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  delay?: number;
};

export function Reveal({ children, className, delay = 0, style, ...props }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn("scroll-reveal", visible && "is-visible", className)}
      ref={ref}
      style={{ "--reveal-delay": `${delay}ms`, ...style } as CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
}
