import Image from "next/image";
import LogoTopaz from "@/assets/LogoTopaz.svg";

const footerLinks = [
  { href: "#beranda", label: "Beranda" },
  { href: "#pengumuman", label: "Pengumuman" },
  { href: "#layanan", label: "Layanan" },
  { href: "#pengaduan", label: "Pengaduan" },
  { href: "#panduan", label: "Panduan Portal" },
];

export default function Footer() {
  return (
    <footer id="kontak" style={{ background: "#0F172A", borderTop: "1px solid #1E293B", padding: "64px 48px 32px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
          <div>
            <Image src={LogoTopaz} alt="Cluster Topaz" height={52} style={{ height: 52, width: "auto", display: "block", marginBottom: 20 }} />
            <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.8, maxWidth: 300, marginBottom: 20 }}>
              Portal resmi administrasi warga RW 21 Cluster Topaz, Perumahan Permata Cimanggis, Kota Depok.
              Dikelola oleh kepengurusan RW 21.
            </p>
            <div style={{ fontSize: 12, color: "#334155" }}>
              Dikembangkan bersama <span style={{ color: "#0D9488", fontWeight: 600 }}>Nawasena</span>
            </div>
          </div>

          <div>
            <h5 style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18 }}>
              Navigasi
            </h5>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {footerLinks.map((l) => (
                <a key={l.href} href={l.href} className="lp-footer-link">
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h5 style={{ fontSize: 11, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 18 }}>
              Sekretariat RW 21
            </h5>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
                  Alamat
                </div>
                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6 }}>
                  Cluster Topaz, RW 21
                  <br />
                  Permata Cimanggis, Kel. Cilangkap
                  <br />
                  Kec. Tapos, Kota Depok
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
                  Jam Pelayanan
                </div>
                <div style={{ fontSize: 13, color: "#334155" }}>
                  Senin – Jumat
                  <br />
                  08.00 – 17.00 WIB
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #1E293B", paddingTop: 22, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 11, color: "#334155" }}>© 2026 RW 21 Cluster Topaz, Permata Cimanggis. Hak cipta dilindungi.</div>
          <div style={{ fontSize: 11, color: "#334155" }}>Portal Administrasi Warga — Kota Depok, Jawa Barat</div>
        </div>
      </div>
    </footer>
  );
}
