import Reveal from "./Reveal";

const badgeStyle = { background: "#ECFDF5", color: "#0D9488" };

function formatTanggalPengumuman(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function Pengumuman({ items = [] }) {
  return (
    <section id="pengumuman" className="lp-section" style={{ background: "#F8FAFC" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Reveal style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
                Papan Pengumuman
              </p>
              <h2 style={{ fontFamily: "var(--font-jakarta), sans-serif", fontSize: "clamp(24px,3vw,36px)", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.015em" }}>
                Pengumuman Terbaru
              </h2>
            </div>
          </div>
        </Reveal>

        {items.length === 0 ? (
          <div style={{ padding: "48px 0", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
            Belum ada pengumuman yang ditampilkan.
          </div>
        ) : (
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
              return (
                <div
                  key={p.id}
                  className="lp-row lp-pengumuman-row"
                  style={{
                    borderBottom: i === items.length - 1 ? "none" : "1px solid #E2E8F0",
                  }}
                >
                  <div style={{ paddingTop: 2 }}>
                    <span
                      style={{
                        display: "inline-block",
                        background: badgeStyle.background,
                        color: badgeStyle.color,
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        padding: "3px 8px",
                        borderRadius: 4,
                      }}
                    >
                      Pengumuman
                    </span>
                  </div>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>{p.judul}</h4>
                    <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>{p.keteranganPengumuman}</p>
                  </div>
                  <div className="lp-pengumuman-tanggal" style={{ textAlign: "right", whiteSpace: "nowrap", paddingTop: 2 }}>
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>{formatTanggalPengumuman(p.createDate)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
        )}
      </div>
    </section>
  );
}
