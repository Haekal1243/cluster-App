import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import RiwayatItem from "./RiwayatItem";
import FilterTahun from "./FilterTahun";
import { API_BASE_URL, fileUrl } from "@/lib/api";

export const metadata = {
  title: "Riwayat Kegiatan - Cluster Topaz",
  description: "Dokumentasi dan agenda kegiatan warga RW 21 Cluster Topaz dari tahun ke tahun.",
};

const KOSONG = { total: 0, tahunTersedia: [], tahunDipilih: null, tahun: [] };

async function getRiwayat(tahun) {
  try {
    const q = tahun ? `?tahun=${encodeURIComponent(tahun)}` : "";
    const res = await fetch(`${API_BASE_URL}/kegiatan/portofolio${q}`, { cache: "no-store" });
    if (!res.ok) return KOSONG;
    return { ...KOSONG, ...(await res.json()) };
  } catch {
    return KOSONG;
  }
}

const gambar = fileUrl;

export default async function RiwayatKegiatanPage({ searchParams }) {
  const { tahun: tahunQuery } = await searchParams;
  const { total, tahun, tahunTersedia, tahunDipilih } = await getRiwayat(Array.isArray(tahunQuery) ? tahunQuery[0] : tahunQuery);
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

          {(urut.length > 0 || tahunTersedia.length > 0) && (
            <div className="rk-hero-foot">
              <dl className="rk-stats">
                <div>
                  <dt>Kegiatan tercatat</dt>
                  <dd>{total}</dd>
                </div>
              </dl>
              <FilterTahun tahunTersedia={tahunTersedia} tahunDipilih={tahunDipilih} />
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
                    const akanDatang = new Date(k.tanggalAcara) > sekarang;
                    return <RiwayatItem key={k.id} kegiatan={k} img={gambar(k.gambarUrl)} akanDatang={akanDatang} />;
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
