"use client";

import { useEffect, useRef } from "react";

/**
 * Logo Topaz di Hero: tegak (tidak miring), melayang naik-turun pelan, dan makin buram lalu hilang
 * seiring halaman di-scroll ke bawah. Di bagian lain logo muncul lagi lewat LogoMuncul.
 * Opacity/blur ditulis langsung ke elemen (bukan state) supaya tidak render ulang tiap frame scroll.
 */
export default function HeroLogo() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.55)));
      el.style.opacity = String(1 - p);
      el.style.filter = p > 0 ? `blur(${p * 10}px)` : "none";
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="lp-hero-logo" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div ref={ref} className="tz-goyang-wrap" style={{ willChange: "opacity, filter" }}>
        <span className="tz-goyang-glow" aria-hidden="true" />
        <img src="/LogoTopaz.svg" alt="Logo Cluster Topaz" className="tz-goyang" />
      </div>
    </div>
  );
}
