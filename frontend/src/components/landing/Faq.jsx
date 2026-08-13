"use client";

import { useState } from "react";
import Reveal from "./Reveal";
import { faq } from "@/lib/landing-data";

export default function Faq({ items = faq }) {
  const [active, setActive] = useState(null);

  return (
    <section style={{ padding: "80px 48px", background: "#F8FAFC" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Reveal style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
            Pertanyaan Umum
          </p>
          <h2 style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: "clamp(24px,3vw,36px)", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.015em" }}>
            FAQ
          </h2>
        </Reveal>

        <Reveal>
          <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, overflow: "hidden", background: "#F1F5F9" }}>
            {items.map((f, i) => {
              const open = active === i;
              return (
                <div key={i} style={{ borderBottom: i === items.length - 1 ? "none" : "1px solid #E2E8F0" }}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setActive(open ? null : i)}
                    className="lp-faq-btn"
                  >
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", lineHeight: 1.4 }}>{f.q}</span>
                    <span
                      style={{
                        fontSize: 18,
                        color: "#94A3B8",
                        flexShrink: 0,
                        fontWeight: 400,
                        transform: open ? "rotate(45deg)" : "none",
                        transition: "transform 0.2s",
                      }}
                    >
                      +
                    </span>
                  </button>
                  {open && (
                    <div style={{ padding: "0 24px 22px", background: "white" }}>
                      <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.75 }}>{f.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
