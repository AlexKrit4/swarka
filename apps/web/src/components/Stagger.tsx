"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface StaggerProps {
  children: React.ReactNode;
  className?: string;
  itemSelector?: string;
  stagger?: number;
}

export function Stagger({
  children,
  className = "",
  itemSelector = "[data-stagger-item]",
  stagger = 0.1,
}: StaggerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const items = el.querySelectorAll(itemSelector);
    if (!items.length) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        items,
        { autoAlpha: 0, y: 40 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.75,
          stagger,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [itemSelector, stagger]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
