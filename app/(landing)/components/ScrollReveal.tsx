"use client";
import { useEffect, useRef } from "react";

interface Props {
  children: React.ReactNode;
  className?: string;
  direction?: "up" | "left" | "right";
  delay?: number;
}

export function ScrollReveal({ children, className = "", direction = "up", delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) el.classList.add("visible"); },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cls = direction === "left" ? "reveal-left" : direction === "right" ? "reveal-right" : "reveal";
  const delayStyle = delay ? { transitionDelay: `${delay}s` } : {};

  return (
    <div ref={ref} className={`${cls} ${className}`} style={delayStyle}>
      {children}
    </div>
  );
}
