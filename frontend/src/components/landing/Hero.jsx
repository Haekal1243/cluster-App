import HeroLogo from "./HeroLogo";
import LinkMasuk from "./LinkMasuk";

export default function Hero() {
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

      {/* Blob gradient melayang pelan di background — cuma transform yang di-animate, murah buat GPU */}
      <div className="lp-hero-blob lp-hero-blob-a" aria-hidden="true" />
      <div className="lp-hero-blob lp-hero-blob-b" aria-hidden="true" />

      <div className="lp-hero-inner" style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "72px 48px 56px", width: "100%" }}>
        <div className="lp-hero-grid">
          {/* Kolom kiri - Teks */}
          <div className="tz-hero-kiri" style={{ animation: "lpFadeUp 0.6s ease both" }}>
            <p className="tz-hero-eyebrow">Portal Resmi · RW 21 · Permata Cimanggis · Kota Depok</p>
            <h1 className="tz-hero-title">
              Portal Digital Kepengurusan
              <br />
              <span>RW Cluster Topaz</span>
            </h1>
            <p className="tz-hero-lead">
              Pusat informasi kas, pengumuman resmi, dan layanan administrasi warga Permata Cimanggis Cluster Topaz.
              Menggantikan proses manual yang sebelumnya lewat WhatsApp.
            </p>

            <div className="tz-hero-aksi">
              <LinkMasuk href="/login" className="tz-btn tz-btn-isi">Masuk ke portal</LinkMasuk>
              <a href="#pengumuman" className="tz-btn tz-btn-garis">Lihat pengumuman</a>
            </div>

          </div>

          {/* Kolom kanan - Logo Topaz, goyang pelan */}
          <HeroLogo />
        </div>
      </div>
    </section>
  );
}
