import Reveal from "./Reveal";
import { pengumuman } from "@/lib/landing-data";

const toneMap = {
  teal: { background: "#ECFDF5", color: "#0D9488" },
  merah: { background: "#FEF2F2", color: "#DC2626" },
  kuning: { background: "#FFFBEB", color: "#B45309" },
  netral: { background: "#F1F5F9", color: "#475569" },
};

export default function Pengumuman({ items = pengumuman }) {
  return (
    <section id="pengumuman" style={{ padding: "80px 48px", background: "#F8FAFC" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Reveal style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
                Papan Pengumuman
              </p>
              <h2 style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: "clamp(24px,3vw,36px)", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.015em" }}>
                Pengumuman Terbaru
              </h2>
            </div>
            <a href="#panduan" className="lp-link-teal">
              Lihat Semua →
            </a>
          </div>
        </Reveal>

        <Reveal>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              border: "1px solid #E2E8F0",
              borderRadius: 10,
              overflow: "hidden",
              background: "white",
            }}
          >
            {items.map((p, i) => {
              const t = toneMap[p.tone] || toneMap.netral;
              return (
                <div
                  key={p.id}
                  className="lp-row"
                  style={{
                    padding: "22px 28px",
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: 20,
                    alignItems: "start",
                    borderBottom: i === items.length - 1 ? "none" : "1px solid #E2E8F0",
                  }}
                >
                  <div style={{ paddingTop: 2 }}>
                    <span
                      style={{
                        display: "inline-block",
                        background: t.background,
                        color: t.color,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        padding: "3px 8px",
                        borderRadius: 4,
                      }}
                    >
                      {p.kategori}
                    </span>
                  </div>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>{p.judul}</h4>
                    <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>{p.isi}</p>
                  </div>
                  <div style={{ textAlign: "right", whiteSpace: "nowrap", paddingTop: 2 }}>
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>{p.tanggal}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
