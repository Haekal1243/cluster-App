import Reveal from "./Reveal";
import SectionHead from "./SectionHead";
import { formatTanggalPanjang as formatTanggalPengumuman } from "@/lib/format";

const badgeStyle = { background: "#ECFDF5", color: "#0D9488" };

export default function Pengumuman({ items = [] }) {
  return (
    <section id="pengumuman" className="lp-section" style={{ background: "#F8FAFC" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <SectionHead varian="d" sebaris label="Papan pengumuman" title="Pengumuman terbaru" lead="Informasi resmi dari pengurus RW dan RT." />

        {items.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
            Belum ada pengumuman yang ditampilkan.
          </div>
        ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            border: "1px solid #E2E8F0",
            borderRadius: 16,
            overflow: "hidden",
            background: "white",
          }}
        >
          {items.map((p, i) => {
            return (
              <Reveal key={p.id} variant="left" delay={i * 90}>
                <div
                  className="lp-row lp-pengumuman-row"
                  style={{
                    borderBottom: i === items.length - 1 ? "none" : "1px solid #E2E8F0",
                  }}
                >
                  <div style={{ paddingTop: 2 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 30,
                        height: 30,
                        background: badgeStyle.background,
                        color: badgeStyle.color,
                        fontSize: 13,
                        fontWeight: 700,
                        borderRadius: "50%",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>{p.judul}</h4>
                    <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>{p.keteranganPengumuman}</p>
                  </div>
                  <div className="lp-pengumuman-tanggal" style={{ textAlign: "right", whiteSpace: "nowrap", paddingTop: 2 }}>
                    <span className="tz-pil-tanggal tz-pil-tanggal-terang">{formatTanggalPengumuman(p.createDate)}</span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
        )}
      </div>
    </section>
  );
}
