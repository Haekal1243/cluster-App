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
    judul: "Tagihan & Iuran IPL",
    deskripsi:
      "Lihat tagihan iuran pengelolaan lingkungan (IPL) dan riwayat pembayaran rumah tangga masing-masing. Rincian hanya terlihat oleh pemilik akun.",
  },
  {
    id: "pengumuman",
    icon: "dokumen",
    akses: "publik",
    judul: "Pengumuman & Kegiatan",
    deskripsi:
      "Informasi, agenda, dan dokumentasi kegiatan RW yang diterbitkan secara resmi oleh pengurus, menggantikan penyebaran melalui grup WhatsApp.",
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
    id: "keuangan",
    icon: "kartu",
    akses: "pengurus",
    judul: "Keuangan RT & RW",
    deskripsi:
      "Pencatatan pemasukan, pengeluaran, dan setoran kas RT ke RW secara transparan oleh pengurus.",
  },
  {
    id: "catatan-rapat",
    icon: "dokumen",
    akses: "pengurus",
    judul: "Catatan Rapat",
    deskripsi:
      "Notulen dan hasil keputusan rapat pengurus tersimpan rapi dan mudah ditelusuri kembali.",
  },
  {
    id: "kependudukan",
    icon: "warga",
    akses: "pengurus",
    judul: "Data Warga",
    deskripsi:
      "Pengelolaan data warga dan rumah oleh pengurus RT/RW sesuai wilayah masing-masing.",
  },
];

export const pengurus = [
  { id: 1, foto: "/ketua-rw.jpg",      inisial: "KR", warna: "#0D9488", jabatan: "Ketua RW 21",   nama: "Jamal",    kontak: "- No. WhatsApp -" },
  { id: 2, foto: "/sekretaris-rw.jpg", inisial: "SK", warna: "#1D4ED8", jabatan: "Sekretaris RW", nama: "Adisun",  kontak: "- No. WhatsApp -" },
  { id: 3, foto: "/bendahara.jpg",     inisial: "BD", warna: "#7C3AED", jabatan: "Bendahara RW",  nama: "Haris Hambali",  kontak: "- No. WhatsApp -" },
  { id: 4, foto: "/rt1.jpg",           inisial: "RT", warna: "#B45309", jabatan: "Ketua RT 01",   nama: "muhsid",   kontak: "- No. WhatsApp -" },
  { id: 5, foto: "/rt2.jpg",           inisial: "RT", warna: "#B45309", jabatan: "Ketua RT 02",   nama: "Udin",   kontak: "- No. WhatsApp -" },
];

export const panduan = [
  {
    no: "1",
    judul: "Masuk dengan Akun dari RT",
    isi: "Akun warga dibuatkan oleh pengurus RT. Masuk dengan nama pengguna (nomor HP) dan kata sandi sementara dari RT, lalu buat kata sandi baru saat masuk pertama kali.",
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
    a: "Masuk ke menu Administrasi Surat, isi formulir keperluan surat, dan unggah dokumen pendukung apabila diperlukan. Surat akan diproses dalam 1-3 hari kerja dan dapat diambil langsung di sekretariat RW atau dikirim secara digital.",
  },
  {
    q: "Bagaimana cara melaporkan pengaduan lingkungan?",
    a: "Gunakan menu Pengaduan Warga, isi formulir laporan dengan keterangan lokasi dan uraian masalah. Foto pendukung dapat dilampirkan. Status penanganan dapat dipantau langsung di halaman pengaduan setelah laporan dikirim.",
  },
  {
    q: "Saya lupa kata sandi. Bagaimana cara mengatur ulang?",
    a: "Hubungi sekretaris atau ketua RT Anda. Pengurus RT akan membuatkan kata sandi sementara yang wajib Anda ganti saat masuk berikutnya. Apabila mengalami kendala, hubungi pengurus RW langsung.",
  },
];

export const navLinks = [
  { href: "#beranda", label: "Beranda" },
  { href: "#pengumuman", label: "Pengumuman" },
  { href: "/landingpage/riwayat-kegiatan", label: "Riwayat Kegiatan" },
  { href: "#layanan", label: "Layanan" },
  { href: "#peta", label: "Peta" },
];
