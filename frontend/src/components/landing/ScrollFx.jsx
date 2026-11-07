"use client";

import { useEffect, useRef, useState } from "react";

const RING_R = 22;
const RING_LEN = 2 * Math.PI * RING_R;

/**
 * Efek scroll global landing page:
 * - garis progres tipis di paling atas layar
 * - lencana logo Topaz melayang di pojok kanan bawah (muncul setelah hero),
 *   cincinnya menunjukkan progres scroll, klik = kembali ke atas.
 * Progres ditulis langsung ke DOM lewat ref (bukan state) supaya tidak render ulang tiap frame.
 */
export default function ScrollFx() {
  const ringRef = useRef(null);
  const [tampil, setTampil] = useState(false);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const maks = document.documentElement.scrollHeight - window.innerHeight;
      const p = maks > 0 ? Math.min(1, Math.max(0, window.scrollY / maks)) : 0;
      if (ringRef.current) ringRef.current.style.strokeDashoffset = String(RING_LEN * (1 - p));
      setTampil(window.scrollY > window.innerHeight * 0.6);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    // Sorotan cahaya di kartu: posisi kursor ditulis ke --mx/--my kartu yang sedang di-hover.
    const onPointerMove = (e) => {
      const kartu = e.target instanceof Element ? e.target.closest(".lp-card, .lp-card-dark") : null;
      if (!kartu) return;
      const r = kartu.getBoundingClientRect();
      kartu.style.setProperty("--mx", `${e.clientX - r.left}px`);
      kartu.style.setProperty("--my", `${e.clientY - r.top}px`);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("pointermove", onPointerMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        className={`lp-fab${tampil ? " lp-fab-show" : ""}`}
        aria-label="Kembali ke atas"
        tabIndex={tampil ? 0 : -1}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <svg className="lp-fab-ring" viewBox="0 0 52 52" aria-hidden="true">
          <circle cx="26" cy="26" r={RING_R} fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="2.5" />
          <circle
            ref={ringRef}
            cx="26"
            cy="26"
            r={RING_R}
            fill="none"
            stroke="#0D9488"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={RING_LEN}
            strokeDashoffset={RING_LEN}
            transform="rotate(-90 26 26)"
          />
        </svg>
        <img src="/LogoTopaz.svg" alt="" className="lp-fab-logo" />
      </button>
    </>
  );
}
