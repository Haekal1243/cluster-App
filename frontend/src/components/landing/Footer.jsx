import Image from "next/image";
import LogoTopaz from "@/assets/LogoTopaz.svg";

const footerLinks = [
  { href: "#beranda", label: "Beranda" },
  { href: "#pengumuman", label: "Pengumuman" },
  { href: "#layanan", label: "Layanan" },
  { href: "#peta", label: "Peta Cluster" },
  { href: "#pengaduan", label: "Pengaduan" },
  { href: "#panduan", label: "Panduan Portal" },
];

export default function Footer() {
  return (
    <footer id="kontak" className="lp-section tz-footer">
      <div className="tz-wrap">
        <div className="lp-footer-grid">
          <div>
            <Image src={LogoTopaz} alt="Cluster Topaz" height={52} style={{ height: 52, width: "auto", display: "block", marginBottom: 20 }} />
            <p className="tz-footer-teks" style={{ maxWidth: 320, marginBottom: 20 }}>
              Portal resmi administrasi warga RW 21 Cluster Topaz, Perumahan Permata Cimanggis, Kota Depok.
              Dikelola oleh kepengurusan RW 21.
            </p>
            <div className="tz-footer-kecil">
              Dikembangkan bersama <span style={{ color: "#2DD4BF", fontWeight: 600 }}>Nawasena</span>
            </div>
          </div>

          <div>
            <h5 className="tz-footer-judul">Navigasi</h5>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {footerLinks.map((l) => (
                <a key={l.href} href={l.href} className="lp-footer-link">
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h5 className="tz-footer-judul">Sekretariat RW 21</h5>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div className="tz-footer-label">Alamat</div>
                <div className="tz-footer-teks">
                  Cluster Topaz, RW 21
                  <br />
                  Permata Cimanggis, Kel. Cilangkap
                  <br />
                  Kec. Tapos, Kota Depok
                </div>
              </div>
              <div>
                <div className="tz-footer-label">Jam Pelayanan</div>
                <div className="tz-footer-teks">
                  Senin - Jumat
                  <br />
                  08.00 - 17.00 WIB
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <div className="tz-footer-kecil">© 2026 RW 21 Cluster Topaz, Permata Cimanggis. Hak cipta dilindungi.</div>
          <div className="tz-footer-kecil">Portal Administrasi Warga - Kota Depok, Jawa Barat</div>
        </div>
      </div>
    </footer>
  );
}
