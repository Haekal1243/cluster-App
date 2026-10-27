import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Layanan from "@/components/landing/Layanan";
import Kegiatan from "@/components/landing/Kegiatan";
import Pengumuman from "@/components/landing/Pengumuman";
import Pengurus from "@/components/landing/Pengurus";
import Panduan from "@/components/landing/Panduan";
import PetaRt from "@/components/landing/PetaRt";
import Faq from "@/components/landing/Faq";
import Footer from "@/components/landing/Footer";
import LogoTerbang from "@/components/landing/LogoTerbang";
import { API_BASE_URL } from "@/lib/api";

export const metadata = {
  title: "Portal Warga RW 21 - Cluster Topaz",
  description:
    "Portal resmi administrasi warga RW 21 Cluster Topaz, Perumahan Permata Cimanggis, Kota Depok.",
};

async function getActiveList(path) {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [kegiatanItems, pengumumanItems] = await Promise.all([
    getActiveList("/kegiatan/active"),
    getActiveList("/pengumuman/active"),
  ]);

  return (
    // relative: logo yang terbang (LogoTerbang) memakai koordinat relatif ke <main>; clip: logo yang melewati tepi tidak memicu scroll samping
    <main style={{ position: "relative", overflowX: "clip" }}>
      <LogoTerbang />
      <Navbar />
      <Hero />
      <Panduan />
      <Layanan />
      <Kegiatan items={kegiatanItems} />
      <Pengumuman items={pengumumanItems} />
      <Pengurus />
      <PetaRt />
      <Faq />
      <Footer />
    </main>
  );
}
