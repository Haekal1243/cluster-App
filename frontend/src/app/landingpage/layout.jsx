import "./globals.css";

export const metadata = {
  title: "Portal Warga RW 21 - Cluster Topaz",
  description: "Portal resmi administrasi warga RW 21 Cluster Topaz, Kota Depok.",
};

// Segmen layout tidak boleh merender <html>/<body> sendiri — itu hanya milik
// root app/layout.jsx. Variabel font (--font-syne/--font-jakarta) sudah
// dipasang di <html> root, jadi komponen landing tetap bisa memakainya.
export default function LandingpageLayout({ children }) {
  return <>{children}</>;
}
