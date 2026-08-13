import Reveal from "./Reveal";
import { pengurus } from "@/lib/landing-data";

export default function Pengurus({ items = pengurus }) {
  return (
    <section style={{ padding: "80px 48px", background: "white" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Reveal style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
            Susunan Kepengurusan
          </p>
          <h2 style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: "clamp(24px,3vw,36px)", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.015em" }}>
            Pengurus RW 21 &amp; RT
          </h2>
        </Reveal>

        <Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 20 }}>
            {items.map((o) => (
              <div key={o.id} style={{ background: "white", borderRadius: 10, padding: "28px 20px", border: "1px solid #E2E8F0", textAlign: "center" }}>
                <div
                  style={{
                    width: 68,
                    height: 68,
                    background: o.warna,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    fontFamily: "var(--font-syne), sans-serif",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "white",
                  }}
                >
                  {o.inisial}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                  {o.jabatan}
                </div>
                <h4 style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 15, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>
                  {o.nama}
                </h4>
                <p style={{ fontSize: 12, color: "#94A3B8" }}>{o.kontak}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
