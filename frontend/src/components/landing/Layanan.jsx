import Reveal from "./Reveal";
import { ServiceIcon } from "./icons";
import { layanan } from "@/lib/landing-data";

export default function Layanan({ items = layanan }) {
  return (
    <section id="layanan" className="lp-section" style={{ background: "#F8FAFC" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Reveal style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
            Layanan yang Tersedia
          </p>
          <h2 style={{ fontFamily: "var(--font-jakarta), sans-serif", fontSize: "clamp(24px,3vw,36px)", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.015em", marginBottom: 12 }}>
            Administrasi Warga Secara Digital
          </h2>
          <p style={{ fontSize: 15, color: "#64748B", maxWidth: 560, lineHeight: 1.7, marginBottom: 24 }}>
            Seluruh layanan administrasi yang sebelumnya dikelola secara manual kini dapat diakses melalui
            portal ini.
          </p>
        </Reveal>

        <Reveal>
          <div
            className="lp-layanan-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 1,
              background: "#E2E8F0",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {items.map((s) => (
              <div key={s.id} id={s.id === "pengaduan" ? "pengaduan" : undefined} className="lp-card" style={{ background: "white", padding: "32px 28px" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    background: "#ECFDF5",
                    borderRadius: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 18,
                  }}
                >
                  <ServiceIcon name={s.icon} />
                </div>
                <h3 style={{ fontFamily: "var(--font-jakarta), sans-serif", fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>
                  {s.judul}
                </h3>
                <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.7 }}>{s.deskripsi}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
