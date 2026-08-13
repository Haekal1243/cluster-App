import Image from "next/image";
import Reveal from "./Reveal";
import { PhotoIcon } from "./icons";
import { kegiatan } from "@/lib/landing-data";

const labelStyles = {
  teal: { background: "rgba(13,148,136,0.85)", color: "white", border: "none" },
  merah: { background: "rgba(220,38,38,0.85)", color: "white", border: "none" },
  gelap: { background: "rgba(30,41,59,0.9)", color: "#94A3B8", border: "1px solid #334155" },
};

export default function Kegiatan({ items = kegiatan }) {
  return (
    <section id="kegiatan" style={{ padding: "80px 48px", background: "white" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Reveal style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>
            Dokumentasi Kegiatan
          </p>
          <h2 style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: "clamp(24px,3vw,36px)", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.015em" }}>
            Kegiatan Warga RW 21
          </h2>
        </Reveal>

        <Reveal>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            {items.map((k) => {
              const ls = labelStyles[k.labelStyle] || labelStyles.gelap;
              return (
                <div key={k.id} style={{ background: "white", borderRadius: 10, overflow: "hidden", border: "1px solid #E2E8F0" }}>
                  <div
                    style={{
                      background: k.bg,
                      height: 250,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                  >
                    {k.gambar ? (
                      <Image src={k.gambar} alt={k.judul} fill style={{ objectFit: "cover" }} />
                    ) : (
                      <PhotoIcon />
                    )}
                    <div style={{ position: "absolute", top: 12, left: 12, borderRadius: 4, padding: "3px 8px", ...ls }}>
                      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", color: ls.color }}>{k.label}</span>
                    </div>
                  </div>
                  <div style={{ padding: 20 }}>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 6 }}>{k.tanggal}</div>
                    <h4 style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 15, fontWeight: 700, color: "#0F172A", marginBottom: 8 }}>
                      {k.judul}
                    </h4>
                    <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6 }}>{k.deskripsi}</p>
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
