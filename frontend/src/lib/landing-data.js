// Data landing page Portal Topaz.
// Nantinya seluruh isi file ini diganti hasil query database (Prisma / API backend).

export const statistik = {
  rw: "RW 21",
  wilayah: "Kelurahan Cilangkap, Kec. Tapos",
  totalKK: 127,
  totalWarga: 438,
};

export const layanan = [
  {
    id: "kas-ipl",
    icon: "kartu",
    akses: "login",
    judul: "Kas & Iuran IPL",
    deskripsi:
      "Pembayaran iuran pengelolaan lingkungan (IPL) beserta riwayat pembayaran rumah tangga masing-masing. Rincian hanya terlihat oleh pemilik akun.",
  },
  {
    id: "pengumuman",
    icon: "dokumen",
    akses: "publik",
    judul: "Pengumuman Resmi",
    deskripsi:
      "Informasi dan agenda kegiatan RW yang diterbitkan secara resmi oleh pengurus, menggantikan penyebaran melalui grup WhatsApp.",
  },
  {
    id: "pengaduan",
    icon: "chat",
    akses: "login",
    judul: "Pengaduan Warga",
    deskripsi:
      "Pelaporan gangguan lingkungan, keamanan, atau infrastruktur. Status penanganan dapat dipantau langsung oleh pelapor.",
  },
  {
    id: "surat",
    icon: "surat",
    akses: "login",
    judul: "Administrasi Surat",
    deskripsi:
      "Pengajuan surat pengantar RT/RW secara daring. Formulir diisi melalui portal dan dokumen dapat diambil di sekretariat RW.",
  },
  {
    id: "fasilitas",
    icon: "kalender",
    akses: "login",
    judul: "Booking Fasilitas Umum",
    deskripsi:
      "Reservasi penggunaan aula dan fasilitas bersama milik RW. Jadwal dan ketersediaan dapat dilihat secara langsung.",
  },
  {
    id: "kependudukan",
    icon: "warga",
    akses: "pengurus",
    judul: "Data Kependudukan",
    deskripsi:
      "Pengelolaan data warga oleh pengurus RW. Warga hanya dapat memperbarui data rumah tangganya sendiri melalui akun masing-masing.",
  },
];

export const kegiatan = [
  {
    id: "kerja-bakti",
    label: "KEGIATAN",
    labelStyle: "teal",
    bg: "#134E4A",
    tanggal: "15 Juni 2026",
    judul: "Kerja Bakti Bulanan",
    deskripsi:
      "Kegiatan bersih-bersih lingkungan setiap bulan yang melibatkan seluruh warga RW 21.",
    gambar: "/images/kegiatan 1.png",
  },
  {
    id: "hut-ri",
    label: "PERAYAAN",
    labelStyle: "merah",
    bg: "#1E1A3A",
    tanggal: "17 Agustus 2025",
    judul: "Perayaan HUT RI ke-80",
    deskripsi:
      "Perlombaan dan perayaan kemerdekaan bersama seluruh warga Cluster Topaz RW 21.",
    gambar: "/images/kegiatan 2.jpeg",
  },
  {
    id: "ronda",
    label: "KEAMANAN",
    labelStyle: "gelap",
    bg: "#0C1A2E",
    tanggal: "Rutin — Setiap Malam",
    judul: "Ronda Malam Warga",
    deskripsi:
      "Kegiatan ronda rutin yang dilaksanakan secara bergilir oleh warga untuk menjaga keamanan lingkungan.",
    gambar: "/images/kegiatan 3.jpeg",
  },
];

export const pengumuman = [
  {
    id: 1,
    kategori: "Kegiatan",
    tone: "teal",
    judul: "Jadwal Kerja Bakti Bulanan — Blok A & B",
    isi: "Kerja bakti dilaksanakan Minggu, 22 Juni 2026 pukul 07.00 WIB. Warga dimohon menyiapkan peralatan kebersihan masing-masing.",
    tanggal: "18 Jun 2026",
  },
  {
    id: 2,
    kategori: "Penting",
    tone: "merah",
    judul: "Batas Pembayaran IPL Juni 2026 — 15 Juni 2026",
    isi: "Warga yang belum membayar IPL bulan Juni dimohon segera melunasi sebelum tanggal jatuh tempo. Konfirmasi pembayaran ke bendahara RW.",
    tanggal: "10 Jun 2026",
  },
  {
    id: 3,
    kategori: "Umum",
    tone: "netral",
    judul: "Pertemuan Warga RW 21 — Agenda Bulanan",
    isi: "Pertemuan warga bulanan dilaksanakan Jumat, 27 Juni 2026 pukul 19.30 WIB di aula pertemuan. Kehadiran perwakilan setiap rumah tangga sangat diharapkan.",
    tanggal: "5 Jun 2026",
  },
  {
    id: 4,
    kategori: "Pemeliharaan",
    tone: "kuning",
    judul: "Perbaikan Lampu Jalan Blok C — Sedang Diproses",
    isi: "Laporan kerusakan lampu jalan di Blok C nomor 7–12 telah diterima. Teknisi dijadwalkan melakukan perbaikan dalam 2–3 hari kerja.",
    tanggal: "3 Jun 2026",
  },
  {
    id: 5,
    kategori: "Administrasi",
    tone: "netral",
    judul: "Pembaruan Data KTP/KK Warga — Batas 30 Juni 2026",
    isi: "Warga dimohon memperbarui data kependudukan di sekretariat RW atau melalui portal, khususnya yang mengalami perubahan data sejak 2024.",
    tanggal: "1 Jun 2026",
  },
];

export const pengurus = [
  { id: 1, inisial: "KR", warna: "#0D9488", jabatan: "Ketua RW 21", nama: "— Nama Ketua RW —", kontak: "— No. WhatsApp —" },
  { id: 2, inisial: "SK", warna: "#1D4ED8", jabatan: "Sekretaris RW", nama: "— Nama Sekretaris —", kontak: "— No. WhatsApp —" },
  { id: 3, inisial: "BD", warna: "#7C3AED", jabatan: "Bendahara RW", nama: "— Nama Bendahara —", kontak: "— No. WhatsApp —" },
  { id: 4, inisial: "RT", warna: "#B45309", jabatan: "Ketua RT 01", nama: "— Nama Ketua RT —", kontak: "— No. WhatsApp —" },
];

export const panduan = [
  {
    no: "1",
    judul: "Daftar atau Masuk Akun",
    isi: "Buat akun menggunakan nomor rumah yang terdaftar di RW 21, atau masuk langsung apabila akun sudah dibuat sebelumnya. Verifikasi dilakukan melalui WhatsApp.",
  },
  {
    no: "2",
    judul: "Pilih Layanan yang Diperlukan",
    isi: "Navigasi ke layanan yang dibutuhkan: pembayaran IPL, pengajuan surat pengantar, pelaporan pengaduan, atau pembaruan data kependudukan.",
  },
  {
    no: "3",
    judul: "Ikuti Instruksi dan Selesai",
    isi: "Isi formulir sesuai petunjuk di dalam portal. Notifikasi status dan konfirmasi akan dikirimkan ke nomor WhatsApp yang terdaftar secara otomatis.",
  },
];

export const faq = [
  {
    q: "Bagaimana cara membayar iuran IPL melalui portal?",
    a: "Masuk ke menu Kas & IPL, pilih bulan yang akan dibayar, kemudian ikuti petunjuk transfer ke nomor rekening resmi RW. Konfirmasi pembayaran dikirim secara otomatis setelah transfer diverifikasi oleh bendahara.",
  },
  {
    q: "Bagaimana cara mengajukan surat pengantar RT/RW?",
    a: "Masuk ke menu Administrasi Surat, isi formulir keperluan surat, dan unggah dokumen pendukung apabila diperlukan. Surat akan diproses dalam 1–3 hari kerja dan dapat diambil langsung di sekretariat RW atau dikirim secara digital.",
  },
  {
    q: "Bagaimana cara melaporkan pengaduan lingkungan?",
    a: "Gunakan menu Pengaduan Warga, isi formulir laporan dengan keterangan lokasi dan uraian masalah. Foto pendukung dapat dilampirkan. Status penanganan dapat dipantau langsung di halaman pengaduan setelah laporan dikirim.",
  },
  {
    q: "Saya lupa kata sandi. Bagaimana cara mengatur ulang?",
    a: 'Pada halaman masuk portal, klik tautan "Lupa Kata Sandi", masukkan nomor rumah yang terdaftar, dan ikuti instruksi yang dikirimkan ke nomor WhatsApp terdaftar. Apabila mengalami kendala, hubungi pengurus RW langsung.',
  },
];

export const navLinks = [
  { href: "#beranda", label: "Beranda" },
  { href: "#pengumuman", label: "Pengumuman" },
  { href: "#layanan", label: "Layanan" },
  { href: "#pengaduan", label: "Pengaduan" },
  { href: "#kontak", label: "Kontak" },
];
