"use client";

import { useState, useEffect } from "react";
import Reveal from "./Reveal";
import { pengurus } from "@/lib/landing-data";

const RADIUS = 220; 
const CARD_H = 250;   

export default function Pengurus({ items = pengurus }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const total     = items.length;
  const angleStep = 360 / total;

  /* Auto-rotate tiap 2.8 detik */
  useEffect(() => {
    const id = setInterval(
      () => setActiveIdx(prev => (prev + 1) % total),
      2800
    );
    return () => clearInterval(id);
  }, [total]);

  /* Hitung selisih sudut terpendek (circular) */
  const getDiff = (i) => {
    let d = i - activeIdx;
    if (d >  total / 2) d -= total;
    if (d < -total / 2) d += total;
    return d;
  };

  const goTo = (idx) => setActiveIdx(idx);

  return (
    <section className="lp-section lp-pengurus-section" style={{ background: "white" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        <Reveal style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
            Susunan Kepengurusan
          </p>
          <h2 style={{ fontFamily: "var(--font-jakarta), sans-serif", fontSize: "clamp(24px,3vw,36px)", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.015em" }}>
            Pengurus RW 21 &amp; RT
          </h2>
        </Reveal>

        <Reveal>
          {/* ── 3D Globe Scene ─────────────────────────────────── */}
          <div className="lp-pengurus-globe" style={{
            perspective      : "1000px",
            perspectiveOrigin: "50% 50%",
            height           : 380,
            position         : "relative",
            marginTop        : 8,
          }}>
            {/* Globe platform — preserve-3d, lurus ke depan */}
            <div style={{
              position       : "absolute",
              inset          : 0,
              transformStyle : "preserve-3d",
            }}>
              {items.map((o, i) => {
                const diff    = getDiff(i);
                const angle   = diff * angleStep;
                const isActive = diff === 0;
                const absD    = Math.abs(diff);

                /* Kartu aktif maju ke depan (extra translateZ) */
                const extra   = isActive ? 50 : 0;
                const opacity = isActive ? 1 : absD === 1 ? 0.55 : 0.25;

                return (
                  <div
                    key={o.id}
                    onClick={() => goTo(i)}
                    style={{
                      position          : "absolute",
                      left              : "50%",
                      top               : "50%",
                      width             : 200,
                      marginLeft        : -100,
                      marginTop         : -(CARD_H / 2),
                      cursor            : "pointer",
                      transformStyle    : "preserve-3d",
                      backfaceVisibility: "hidden",
                      transform         : `rotateY(${angle}deg) translateZ(${RADIUS + extra}px)`,
                      transition        : "transform 0.75s cubic-bezier(0.4,0,0.2,1), opacity 0.5s ease",
                      opacity,
                    }}
                  >
                    {/* ── Card ─ desain identik dengan asli ── */}
                    <div style={{
                      background   : "white",
                      borderRadius : 10,
                      padding      : "28px 20px",
                      border       : isActive ? "1.5px solid #0D9488" : "1px solid #E2E8F0",
                      textAlign    : "center",
                      boxShadow    : isActive ? "0 24px 64px rgba(13,148,136,0.22)" : "0 2px 8px rgba(0,0,0,0.06)",
                      transform    : isActive ? "scale(1.10)" : "scale(1)",
                      transition   : "transform 0.5s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.4s ease, border-color 0.4s ease",
                    }}>
                      {/* Foto lingkaran */}
                      <div style={{
                        width          : 90,
                        height         : 90,
                        borderRadius   : "50%",
                        overflow       : "hidden",
                        margin         : "0 auto 16px",
                        border         : isActive ? `3px solid ${o.warna}` : "2px solid #E2E8F0",
                        boxShadow      : isActive ? `0 0 28px ${o.warna}66` : "none",
                        transition     : "box-shadow 0.4s ease, border-color 0.4s ease",
                        background     : "#F8FAFC",
                        display        : "flex",
                        alignItems     : "center",
                        justifyContent : "center",
                        flexShrink     : 0,
                      }}>
                        {o.foto ? (
                          <img
                            src={o.foto}
                            alt={o.nama}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <span style={{ fontFamily: "var(--font-jakarta), sans-serif", fontSize: 22, fontWeight: 700, color: "white", background: o.warna, width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {o.inisial}
                          </span>
                        )}
                      </div>

                      {/* Jabatan */}
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                        {o.jabatan}
                      </div>
                      <h4 style={{ fontFamily: "var(--font-jakarta), sans-serif", fontSize: 15, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>
                        {o.nama}
                      </h4>
                      <p style={{ fontSize: 12, color: "#94A3B8" }}>{o.kontak}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Navigasi ─────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 12 }}>
            <button
              onClick={() => goTo((activeIdx - 1 + total) % total)}
              style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid #E2E8F0", background: "white", cursor: "pointer", fontSize: 18, color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#0D9488"; e.currentTarget.style.color = "#0D9488"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.color = "#64748B"; }}
            >&#8249;</button>

            <div style={{ display: "flex", gap: 6 }}>
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  style={{ width: i === activeIdx ? 20 : 6, height: 6, borderRadius: 3, background: i === activeIdx ? "#0D9488" : "#E2E8F0", border: "none", cursor: "pointer", transition: "all 0.35s ease", padding: 0 }}
                />
              ))}
            </div>

            <button
              onClick={() => goTo((activeIdx + 1) % total)}
              style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid #E2E8F0", background: "white", cursor: "pointer", fontSize: 18, color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#0D9488"; e.currentTarget.style.color = "#0D9488"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.color = "#64748B"; }}
            >&#8250;</button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
