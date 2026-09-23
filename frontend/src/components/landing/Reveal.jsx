"use client";

import { useEffect, useRef, useState } from "react";

/** Membungkus konten agar muncul dengan animasi saat masuk viewport. */
export default function Reveal({ children, style }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
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
      // rootMargin bawah positif: animasi mulai ~140px SEBELUM elemen kelihatan di layar,
      // supaya selesai duluan dan tidak pernah "ketangkap" nanggung di tengah transisi
      // pas discroll/di-screenshot (ini penyebab kartu kelihatan "ada shadow aneh").
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
        transform: shown ? "translateY(0)" : "translateY(12px)",
        transition:
          "opacity 0.4s cubic-bezier(0.4,0,0.2,1), transform 0.4s cubic-bezier(0.4,0,0.2,1)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
