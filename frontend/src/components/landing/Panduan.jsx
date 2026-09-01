import Reveal from "./Reveal";
import { panduan } from "@/lib/landing-data";

export default function Panduan({ items = panduan }) {
  return (
    <section id="panduan" style={{ padding: "80px 48px", background: "#0F172A" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Reveal style={{ marginBottom: 52 }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
              Cara Menggunakan Portal
            </p>
            <h2 style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: "clamp(24px,3vw,36px)", fontWeight: 700, color: "white", letterSpacing: "-0.015em" }}>
              Tiga Langkah Memulai
            </h2>
          </div>
        </Reveal>

        <Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2, background: "#1E293B", borderRadius: 10, overflow: "hidden" }}>
            {items.map((s) => (
              <div key={s.no} style={{ background: "#0F172A", padding: "40px 32px" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    background: "#0D9488",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 20,
                    fontFamily: "var(--font-syne), sans-serif",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "white",
                  }}
                >
                  {s.no}
                </div>
                <h3 style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 17, fontWeight: 700, color: "white", marginBottom: 12 }}>
                  {s.judul}
                </h3>
                <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.75 }}>{s.isi}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
