"use client";

import { useEffect, useRef, useState } from "react";

export default function LogoMuncul({ sisi = "kiri" }) {
  const ref = useRef(null);
  const [tampak, setTampak] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTampak(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setTampak(true); io.disconnect(); } },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span ref={ref} className={`tz-muncul tz-muncul-${sisi}${tampak ? " tz-muncul-on" : ""}`} aria-hidden="true">
      <img src="/LogoTopaz.svg" alt="" />
    </span>
  );
}
