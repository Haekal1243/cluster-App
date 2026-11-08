"use client";

import { useEffect, useRef, useState } from "react";

const AWAL = {
  up:    "translate3d(0, 28px, 0)",
  left:  "translate3d(-48px, 0, 0)",
  right: "translate3d(48px, 0, 0)",
  zoom:  "scale(0.92)",
  blur:  "translate3d(0, 20px, 0)",
};

export default function Reveal({ children, style, variant = "up", delay = 0 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.01, rootMargin: "0px 0px 140px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : AWAL[variant] ?? AWAL.up,
        filter: variant === "blur" && !shown ? "blur(8px)" : "none",
        transition:
          "opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1), filter 0.7s ease",
        transitionDelay: delay ? `${delay}ms` : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
