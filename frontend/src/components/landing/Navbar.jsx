"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import LogoTopaz from "@/assets/LogoTopaz.svg";
import { navLinks } from "@/lib/landing-data";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "#0F172A",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        height: 68,
        borderBottom: "1px solid #1E293B",
        boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.4)" : "none",
        transition: "box-shadow 0.3s",
      }}
    >
      <Link
        href="#beranda"
        style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none", flexShrink: 0 }}
      >
        <Image src={LogoTopaz} alt="Cluster Topaz" height={44} style={{ height: 44, width: "auto", display: "block" }} priority />
        <div style={{ paddingLeft: 14, borderLeft: "1px solid #1E293B" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", lineHeight: 1.3, whiteSpace: "nowrap" }}>
            Portal Resmi
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#64748B", lineHeight: 1.3, whiteSpace: "nowrap" }}>
            RW 21 · Cluster Topaz
          </div>
        </div>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0, flexShrink: 1 }}>
        {navLinks.map((l) => (
          <a key={l.href} href={l.href} className="lp-nav-link">
            {l.label}
          </a>
        ))}
        <div style={{ width: 1, height: 20, background: "#1E293B" }} />
        <Link href="/register" className="lp-btn-primary lp-btn-sm">
          Login
        </Link>
      </div>
    </nav>
  );
}
