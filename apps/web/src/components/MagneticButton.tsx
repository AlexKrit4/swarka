"use client";

import { useRef } from "react";
import gsap from "gsap";

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  strength?: number;
}

export function MagneticButton({
  children,
  className = "",
  href,
  onClick,
  type = "button",
  disabled,
  strength = 0.35,
}: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement | HTMLButtonElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    gsap.to(el, {
      x: x * strength,
      y: y * strength,
      duration: 0.35,
      ease: "power2.out",
    });
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    gsap.to(el, { x: 0, y: 0, duration: 0.55, ease: "elastic.out(1, 0.4)" });
  };

  const shared = {
    className,
    onMouseMove: onMove,
    onMouseLeave: onLeave,
    onClick,
  };

  if (href) {
    return (
      <a ref={ref as React.RefObject<HTMLAnchorElement>} href={href} {...shared}>
        {children}
      </a>
    );
  }

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      type={type}
      disabled={disabled}
      {...shared}
    >
      {children}
    </button>
  );
}
