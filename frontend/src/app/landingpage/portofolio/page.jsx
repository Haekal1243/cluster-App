import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { API_BASE_URL } from "@/lib/api";

export const metadata = {
  title: "Portofolio Kegiatan — Cluster Topaz",
  description: "Rekam jejak kegiatan warga RW 21 Cluster Topaz selama 5 tahun terakhir.",
};

async function getPortofolio() {
  try {
    const res = await fetch(`${API_BASE_URL}/kegiatan/portofolio`, { cache: "no-store" });
    if (!res.ok) return { total: 0, tahun: [] };
    return await res.json();
  } catch {
    return { total: 0, tahun: [] };
  }
}

const tanggal = (v) =>
  v ? new Date(v).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "-";

const gambar = (f) => (f ? `${API_BASE_URL}/uploads/kegiatan/${f}` : null);

export default async function PortofolioPage() {
  const { total, tahun } = await getPortofolio();

  return (
    <main>
      <Navbar />

      <section className="lp-section" style={{ background: "#F8FAFC", paddingTop: 128, minHeight: "70vh" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <Link href="/landingpage" style={{ fontSize: 13, color: "#0D9488", textDecoration: "none", fontWeight: 600 }}>
            ← Kembali ke beranda
          </Link>

          <p style={{ fontSize: 11, fontWeight: 700, color: "#0D9488", textTransform: "uppercase", letterSpacing: "0.12em", margin: "24px 0 10px" }}>
            Portofolio Cluster
          </p>
          <h1 style={{ fontFamily: "var(--font-jakarta), sans-serif", fontSize: "clamp(26px,3.4vw,40px)", fontWeight: 700, color: "#0F172A", letterSpacing: "-0.015em", margin: 0 }}>
            Kegiatan Warga RW 21, 5 Tahun Terakhir
          </h1>
          <p style={{ fontSize: 15, color: "#64748B", maxWidth: 640, lineHeight: 1.7, marginTop: 12 }}>
            Rekam jejak kegiatan yang diselenggarakan bersama warga Cluster Topaz, dari tahun ke tahun.
            {total > 0 ? ` Total ${total} kegiatan terdokumentasi.` : ""}
          </p>

          {tahun.length === 0 ? (
            <div style={{ padding: "64px 0", textAlign: "center", color: "#94A3B8", fontSize: 14 }}>
              Belum ada kegiatan yang ditampilkan sebagai portofolio.
            </div>
          ) : (
            <div style={{ marginTop: 48, position: "relative" }}>
              {tahun.map(({ tahun: th, kegiatan }) => (
                <div key={th} style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: 24, marginBottom: 48 }} className="lp-porto-row">
                  <div style={{ position: "relative" }}>
                    <div style={{ fontFamily: "var(--font-syne), sans-serif", fontSize: 30, fontWeight: 700, color: "#0D9488", position: "sticky", top: 96 }}>
                      {th}
                    </div>
                  </div>
                  <div style={{ borderLeft: "2px solid #CCFBF1", paddingLeft: 24 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                      {kegiatan.map((k) => {
                        const img = gambar(k.gambarUrl);
                        return (
                          <article key={k.id} style={{ background: "white", borderRadius: 10, overflow: "hidden", border: "1px solid #E2E8F0" }}>
                            <div style={{ background: "#134E4A", height: 190 }}>
                              {img && <img src={img} alt={k.judul} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                            </div>
                            <div style={{ padding: 18 }}>
                              <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 6 }}>{tanggal(k.tanggalAcara)}</div>
                              <h3 style={{ fontFamily: "var(--font-jakarta), sans-serif", fontSize: 15, fontWeight: 700, color: "#0F172A", margin: "0 0 8px" }}>
                                {k.judul}
                              </h3>
                              <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, margin: 0 }}>{k.deskripsi}</p>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
