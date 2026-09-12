import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Layanan from "@/components/landing/Layanan";
import Kegiatan from "@/components/landing/Kegiatan";
import Pengumuman from "@/components/landing/Pengumuman";
import Pengurus from "@/components/landing/Pengurus";
import Panduan from "@/components/landing/Panduan";
import Faq from "@/components/landing/Faq";
import Footer from "@/components/landing/Footer";

export const metadata = {
  title: "Portal Warga RW 21 — Cluster Topaz",
  description:
    "Portal resmi administrasi warga RW 21 Cluster Topaz, Perumahan Permata Cimanggis, Kota Depok.",
};

export default function HomePage() {
  // Ganti dengan data dari database bila sudah siap, mis:
  // const statistik = await prisma.warga.aggregate(...)
  return (
    <main>
      <Navbar />
      <Hero />
      <Panduan />
      <Layanan />
      <Kegiatan />
      <Pengumuman />
      <Pengurus />
      <Faq />
      <Footer />
    </main>
  );
}
