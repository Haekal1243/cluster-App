/**
 * Titik awal logo di Hero. Logonya sendiri (LogoTerbang) satu saja dan terbang dari sini ke judul tiap bagian;
 * komponen ini hanya menyediakan ruang kosong dan penanda [data-tz-anchor="hero"].
 */
export default function HeroLogo() {
  return (
    <div className="lp-hero-logo" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span className="tz-anchor-hero" data-tz-anchor="hero" />
    </div>
  );
}
