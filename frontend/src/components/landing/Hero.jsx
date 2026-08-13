import Link from "next/link";
import { statistik } from "@/lib/landing-data";

export default function Hero({ data = statistik }) {
  return (
    <section
      id="beranda"
      style={{
        minHeight: "100vh",
        background: "#0F172A",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        paddingTop: 68,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#0D9488" }} />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "72px 48px 56px", width: "100%" }}>
        <div style={{ maxWidth: 700, animation: "lpFadeUp 0.6s ease both" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 20 }}>
            Portal Resmi · RW 21 · Permata Cimanggis · Kota Depok
          </p>
          <h1
            style={{
              fontFamily: "var(--font-syne), sans-serif",
              fontSize: "clamp(36px,5vw,58px)",
              fontWeight: 700,
              color: "white",
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
              marginBottom: 20,
            }}
          >
            Portal Digital Kepengurusan
            <br />
            <span style={{ color: "#0D9488" }}>RW Cluster Topaz</span>
          </h1>
          <p style={{ fontSize: 17, color: "#64748B", lineHeight: 1.75, maxWidth: 580, marginBottom: 36 }}>
            Pusat informasi kas, pengumuman resmi, dan layanan administrasi untuk seluruh warga Permata
            Cimanggis Cluster Topaz. Platform ini menggantikan proses administrasi manual yang sebelumnya
            dilakukan melalui WhatsApp.
          </p>

        </div>
      </div>

      <div style={{ borderTop: "1px solid #1E293B", background: "#0A1120" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 48px",
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
          }}
        >
          <div style={{ padding: "22px 24px 22px 0", borderRight: "1px solid #1E293B" }}>
            <div style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 28, fontWeight: 700, color: "white", marginBottom: 4 }}>
              {data.rw}
            </div>
            <div style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>{data.wilayah}</div>
          </div>

          <div style={{ padding: "22px 24px", borderRight: "1px solid #1E293B" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 4 }}>
              <div style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 28, fontWeight: 700, color: "white" }}>
                {data.totalKK}
              </div>
              <div style={{ fontSize: 11, color: "#334155", fontWeight: 600 }}>KK</div>
            </div>
            <div style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>Kepala Keluarga Terdaftar</div>
          </div>

          <div style={{ padding: "22px 0 22px 24px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 4 }}>
              <div style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 28, fontWeight: 700, color: "white" }}>
                {data.totalWarga}
              </div>
              <div style={{ fontSize: 11, color: "#334155", fontWeight: 600 }}>Jiwa</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#0D9488", flexShrink: 0 }} />
              <div style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>Warga Terdata — sinkron basis data</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
