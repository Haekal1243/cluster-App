"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Home, Megaphone, GalleryHorizontal, Layers, MessageCircle, Phone, LogIn } from "lucide-react";
import LogoTopaz from "@/assets/LogoTopaz.svg";
import { navLinks } from "@/lib/landing-data";

const NAV_ICONS = {
  "#beranda": Home,
  "#pengumuman": Megaphone,
  "/landingpage/portofolio": GalleryHorizontal,
  "#layanan": Layers,
  "#pengaduan": MessageCircle,
  "#kontak": Phone,
};

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [spinCount, setSpinCount] = useState(0);
  const drawerRef = useRef(null);
  const progressRef = useRef(null);

  // key={spinCount} bikin tombolnya remount tiap klik, supaya animasi spin 360°
  // selalu terputar ulang dari awal (bukan cuma sekali lalu diam).
  const toggleDrawer = () => {
    setDrawerOpen((prev) => !prev);
    setSpinCount((c) => c + 1);
  };
  // Di halaman lain (mis. Portofolio) tautan #bagian harus kembali ke beranda dulu.
  const pathname = usePathname();
  const base = pathname === "/landingpage" ? "" : "/landingpage";
  const resolveHref = (href) => (href.startsWith("#") ? `${base}${href}` : href);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      // Update langsung lewat ref (bukan setState) supaya progress bar mulus tanpa
      // memicu re-render React di setiap piksel scroll.
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${pct})`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Kunci scroll body selagi drawer terbuka, biar konten di belakangnya tidak ikut geser.
  useEffect(() => {
    if (!drawerOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen]);

  // Tutup drawer dengan tombol Escape.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <nav
      className="lp-navbar"
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
        href={resolveHref("#beranda")}
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
          <a key={l.href} href={resolveHref(l.href)} className="lp-nav-link">
            {l.label}
          </a>
        ))}
        <div className="lp-navbar-cta" style={{ width: 1, height: 20, background: "#1E293B" }} />
        <Link href="/login" className="lp-btn-primary lp-btn-sm lp-navbar-cta">
          Masuk
        </Link>

        {/* Tombol buka sidebar drawer — pengganti .lp-nav-link di layar <=1024px. */}
        <button
          key={spinCount}
          type="button"
          className="lp-drawer-toggle lp-fab-spin"
          onClick={toggleDrawer}
          aria-label="Buka menu navigasi"
          aria-expanded={drawerOpen}
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Scroll progress — nempel di tepi bawah navbar, nunjukin seberapa jauh halaman sudah dibaca */}
      <div className="lp-scroll-progress-track" aria-hidden="true">
        <div className="lp-scroll-progress-bar" ref={progressRef} />
      </div>

      {/* Overlay + sidebar drawer (mobile/tablet) */}
      <div
        className={`lp-drawer-overlay ${drawerOpen ? "is-open" : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden={!drawerOpen}
      />
      <aside
        className={`lp-drawer ${drawerOpen ? "is-open" : ""}`}
        ref={drawerRef}
        aria-label="Menu navigasi"
      >
        <div className="lp-drawer-header">
          <Image src={LogoTopaz} alt="Cluster Topaz" height={36} style={{ height: 36, width: "auto", display: "block" }} />
          <div className="lp-drawer-brand">
            <span className="lp-drawer-brand-title">Portal Resmi</span>
            <span className="lp-drawer-brand-sub">RW 21 · Cluster Topaz</span>
          </div>
          <button
            type="button"
            className="lp-drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Tutup menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="lp-drawer-nav">
          {navLinks.map((l) => {
            const Icon = NAV_ICONS[l.href] ?? Home;
            return (
              <a
                key={l.href}
                href={resolveHref(l.href)}
                className="lp-drawer-link"
                onClick={() => setDrawerOpen(false)}
              >
                <Icon size={18} className="lp-drawer-link-icon" />
                {l.label}
              </a>
            );
          })}
        </div>

        <div className="lp-drawer-footer">
          <Link href="/login" className="lp-btn-primary lp-drawer-login" onClick={() => setDrawerOpen(false)}>
            <LogIn size={16} /> Masuk ke Portal
          </Link>
        </div>
      </aside>
    </nav>
  );
}
