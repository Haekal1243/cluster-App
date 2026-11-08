"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

function mulaiTransisi(tombol, pindah, tujuan) {
  if (document.getElementById("tz-transisi")) return pindah();

  const r = tombol.getBoundingClientRect();
  const x = Math.round(r.left + r.width / 2);
  const y = Math.round(r.top + r.height / 2);

  const o = document.createElement("div");
  o.id = "tz-transisi";
  o.setAttribute("aria-hidden", "true");
  Object.assign(o.style, {
    position: "fixed",
    inset: "0",
    zIndex: "99999",
    display: "grid",
    placeItems: "center",
    background: "#0F172A",
    clipPath: `circle(0px at ${x}px ${y}px)`,
    transition: "clip-path 0.6s cubic-bezier(0.65, 0, 0.35, 1), opacity 0.5s ease",
  });
  const logo = document.createElement("img");
  logo.src = "/LogoTopaz.svg";
  logo.alt = "";
  Object.assign(logo.style, {
    width: "clamp(110px, 22vw, 170px)",
    opacity: "0",
    transform: "scale(0.7) rotate(-8deg)",
    transition: "opacity 0.45s ease 0.2s, transform 0.7s cubic-bezier(0.34, 1.3, 0.64, 1) 0.15s",
  });
  o.appendChild(logo);
  document.body.appendChild(o);

  requestAnimationFrame(() => {
    o.style.clipPath = `circle(150vmax at ${x}px ${y}px)`;
    logo.style.opacity = "1";
    logo.style.transform = "scale(1) rotate(0deg)";
  });

  setTimeout(pindah, 620);

  const mulai = Date.now();
  const cek = setInterval(() => {
    const lama = Date.now() - mulai;
    const sampai = window.location.pathname === tujuan;
    if ((sampai && lama > 1100) || lama > 8000) {
      clearInterval(cek);
      o.style.opacity = "0";
      o.style.pointerEvents = "none";
      setTimeout(() => o.remove(), 550);
    }
  }, 120);
}

export default function LinkMasuk({ href = "/login", onClick, children, ...props }) {
  const router = useRouter();

  const klik = (e) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    e.preventDefault();
    mulaiTransisi(e.currentTarget, () => router.push(href), href);
  };

  return (
    <Link href={href} onClick={klik} {...props}>
      {children}
    </Link>
  );
}
