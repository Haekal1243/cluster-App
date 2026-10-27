import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { API_BASE_URL, fileUrl } from "@/lib/api";

export const metadata = {
  title: "Riwayat Kegiatan - Cluster Topaz",
  description: "Dokumentasi dan agenda kegiatan warga RW 21 Cluster Topaz dari tahun ke tahun.",
};

async function getRiwayat() {
  try {
    const res = await fetch(`${API_BASE_URL}/kegiatan/portofolio`, { cache: "no-store" });
    if (!res.ok) return { total: 0, tahun: [] };
    return await res.json();
  } catch {
    return { total: 0, tahun: [] };
  }
}

const gambar = fileUrl;
const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default async function RiwayatKegiatanPage() {
  const { total, tahun } = await getRiwayat();
  const sekarang = new Date();

  // Terbaru di atas: tahun terbaru dulu, dan di tiap tahun kegiatan terdekat ke akhir tahun dulu.
  const urut = [...tahun]
    .sort((a, b) => b.tahun - a.tahun)
    .map((t) => ({
      tahun: t.tahun,
      kegiatan: [...t.kegiatan].sort((a, b) => new Date(b.tanggalAcara) - new Date(a.tanggalAcara)),
    }));

  return (
    <main>
      <Navbar />

      {/* ── Kepala halaman ─────────────────────────────────────── */}
      <section className="rk-hero">
        <div className="rk-wrap">
          <Link href="/landingpage" className="rk-back">← Kembali ke beranda</Link>
          <p className="rk-eyebrow">Arsip Cluster Topaz</p>
          <h1 className="rk-title">
            Riwayat <em>Kegiatan</em>
          </h1>
          <p className="rk-lead">
            Catatan acara dan kerja bakti warga RW 21, disusun dari yang terbaru sampai yang paling lama.
          </p>

          {urut.length > 0 && (
            <div className="rk-hero-foot">
              <dl className="rk-stats">
                <div>
                  <dt>Kegiatan tercatat</dt>
                  <dd>{total}</dd>
                </div>
                <div>
                  <dt>Rentang tahun</dt>
                  <dd>{urut.length > 1 ? `${urut[urut.length - 1].tahun}–${urut[0].tahun}` : urut[0].tahun}</dd>
                </div>
              </dl>
              <nav className="rk-years" aria-label="Loncat ke tahun">
                {urut.map(({ tahun: th }) => (
                  <a key={th} href={`#tahun-${th}`}>{th}</a>
                ))}
              </nav>
            </div>
          )}
        </div>
      </section>

      {/* ── Daftar per tahun ───────────────────────────────────── */}
      <section className="rk-body">
        <div className="rk-wrap">
          {urut.length === 0 ? (
            <div className="rk-empty">
              <strong>Belum ada kegiatan yang ditampilkan.</strong>
              <span>Kegiatan yang disetujui pengurus untuk tampil di halaman ini akan muncul di sini.</span>
            </div>
          ) : (
            urut.map(({ tahun: th, kegiatan }) => (
              <div key={th} id={`tahun-${th}`} className="rk-year">
                <div className="rk-year-head">
                  <span className="rk-year-num">{th}</span>
                  <span className="rk-year-count">{kegiatan.length} kegiatan</span>
                </div>

                <ol className="rk-list">
                  {kegiatan.map((k) => {
                    const tgl = new Date(k.tanggalAcara);
                    const img = gambar(k.gambarUrl);
                    const akanDatang = tgl > sekarang;
                    return (
                      <li key={k.id} className="rk-item">
                        <div className="rk-date" aria-label={tgl.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}>
                          <span className="rk-day">{tgl.getDate()}</span>
                          <span className="rk-month">{BULAN[tgl.getMonth()]}</span>
                        </div>

                        <div className="rk-text">
                          {akanDatang && <span className="rk-badge">Akan datang</span>}
                          <h3>{k.judul}</h3>
                          {k.deskripsi && <p>{k.deskripsi}</p>}
                        </div>

                        <div className="rk-thumb">
                          {img && <img src={img} alt={k.judul} loading="lazy" />}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
