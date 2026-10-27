"use client";

import { useState, useEffect } from "react";
import Reveal from "./Reveal";
import SectionHead from "./SectionHead";
import { PhotoIcon } from "./icons";
import { fileUrl } from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatTanggalPanjang as formatTanggalAcara } from "@/lib/format";

export default function Kegiatan({ items = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(true);

  // Slider aktif jika item > 3
  const isSliderActive = items.length > 3;

  // Clone 3 item pertama untuk infinite loop
  const extendedItems = isSliderActive ? [...items, ...items.slice(0, 3)] : items;

  const handleNext = () => {
    if (!isSliderActive) return;
    if (currentIndex >= items.length) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (!isSliderActive) return;
    if (currentIndex <= 0) {
      setIsTransitioning(false);
      setCurrentIndex(items.length);
      setTimeout(() => {
        setIsTransitioning(true);
        setCurrentIndex(items.length - 1);
      }, 50);
    } else {
      setIsTransitioning(true);
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleTransitionEnd = () => {
    if (currentIndex >= items.length) {
      setIsTransitioning(false);
      setCurrentIndex(0);
    }
  };

  useEffect(() => {
    if (!isSliderActive) return;
    const timer = setInterval(() => {
      handleNext();
    }, 3000);
    return () => clearInterval(timer);
  }, [isSliderActive, currentIndex]);

  return (
    <section id="kegiatan" className="lp-section" style={{ background: "white" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <SectionHead varian="c" label="Dokumentasi kegiatan" title="Kegiatan warga RW 21">
          {/* Navigasi Kiri & Kanan */}
          {isSliderActive && (
            <div style={{ display: "flex", gap: 12 }}>
              <button 
                onClick={handlePrev} 
                style={{ width: 44, height: 44, borderRadius: "50%", background: "#F1F5F9", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#475569", transition: "all 0.2s" }}
                onMouseOver={e => e.currentTarget.style.background = "#E2E8F0"} 
                onMouseOut={e => e.currentTarget.style.background = "#F1F5F9"}
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={handleNext} 
                style={{ width: 44, height: 44, borderRadius: "50%", background: "#0D9488", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white", transition: "all 0.2s" }}
                onMouseOver={e => e.currentTarget.style.background = "#0F766E"} 
                onMouseOut={e => e.currentTarget.style.background = "#0D9488"}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </SectionHead>

        {items.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
            Belum ada kegiatan yang ditampilkan.
          </div>
        ) : (
        <Reveal variant="zoom">
          <div style={{ position: "relative", overflow: "hidden" }}>
            {/* Slider Track */}
            <div
              className="lp-kegiatan-track"
              onTransitionEnd={handleTransitionEnd}
              style={{
                display: "flex",
                gap: 20,
                transition: isTransitioning ? "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
                transform: `translateX(calc(-${currentIndex} * (33.333333% + 6.666666px)))`,
              }}
            >
              {extendedItems.map((k, idx) => {
                const img = fileUrl(k.gambarUrl);
                return (
                  <div key={`${k.id}-${idx}`} className="lp-kegiatan-item" style={{ flex: "0 0 calc(33.333333% - 13.333333px)", boxSizing: "border-box" }}>
                    <div className="lp-card" style={{ background: "white", borderRadius: 16, overflow: "hidden", border: "1px solid #E2E8F0" }}>
                      <div
                        style={{
                          background: "#134E4A",
                          height: 250,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          position: "relative",
                        }}
                      >
                        {img ? (
                          <img src={img} alt={k.judul} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <PhotoIcon />
                        )}
                        {/* tanggal sebagai pil di atas foto, bukan teks abu-abu kecil di bawah */}
                        <span className="tz-pil-tanggal">{formatTanggalAcara(k.tanggalAcara)}</span>
                      </div>
                      <div style={{ padding: 20 }}>
                        <h4 style={{ fontFamily: "var(--font-jakarta), sans-serif", fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 8, lineHeight: 1.35 }}>
                          {k.judul}
                        </h4>
                        <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, margin: 0 }}>{k.deskripsi}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stepper (Dots) */}
            {isSliderActive && (
              <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 32 }}>
                {items.map((_, idx) => {
                  const isActive = (currentIndex % items.length) === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setIsTransitioning(true);
                        setCurrentIndex(idx);
                      }}
                      style={{
                        width: isActive ? 28 : 12,
                        height: 12,
                        borderRadius: 12,
                        background: isActive ? "#0D9488" : "#CBD5E1",
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        padding: 0
                      }}
                      aria-label={`Go to slide page ${idx + 1}`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </Reveal>
        )}
      </div>
    </section>
  );
}
