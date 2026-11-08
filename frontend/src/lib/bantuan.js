export const BANTUAN = {
  "data-warga": {
    judul: "Data Warga",
    ringkas: "Daftar akun warga di wilayah Anda beserta blok rumah dan kontaknya. Dari sini pengurus menambah warga, mengubah data, mengatur ulang kata sandi, atau mengajukan penghapusan akun.",
    faq: [
      { q: "Bagaimana menambah warga baru?", a: "Tekan tombol Tambah, isi nama, no. HP, RT, dan blok rumah. Nama pengguna disarankan otomatis dari nama + angka dan boleh diubah. Setelah disimpan, kata sandi sementara ditampilkan dan bisa disalin untuk dikirim ke warga." },
      { q: "Warga lupa kata sandi?", a: "Gunakan tombol atur ulang kata sandi (ikon kunci) di baris warga tersebut. Kata sandi baru hanya tampil sekali, jadi salin sebelum menutup popup." },
      { q: "Mengapa blok rumah tidak ada di pilihan?", a: "Blok harus sudah terdaftar dan masih kosong. Rumah baru ditambahkan admin lewat menu Kelola Rumah." },
    ],
  },
  "blok-rumah": {
    judul: "Blok Rumah",
    ringkas: "Daftar unit rumah di cluster beserta penghuni dan statusnya (Tetap, Kontrak, atau Kosong). Halaman ini hanya untuk melihat data, tanpa aksi ubah.",
    faq: [
      { q: "Apa arti status rumah?", a: "Tetap berarti dihuni pemilik, Kontrak berarti dihuni penyewa, dan Kosong berarti belum ada penghuni yang terdaftar." },
      { q: "Mengapa tidak ada tombol ubah?", a: "Pengelolaan rumah (tambah, ubah, hapus, kontrak) hanya dilakukan lewat Kelola Rumah oleh admin." },
    ],
  },
  "kelola-rumah": {
    judul: "Kelola Rumah",
    ringkas: "Tempat menambah, mengubah, dan menghapus data rumah, serta mengatur kontrak penyewa pada rumah yang dimiliki warga lain.",
    faq: [
      { q: "Bagaimana mengatur penyewa kontrak?", a: "Pilih ikon kontrak pada rumah, lalu pilih akun penyewa. Tagihan IPL baru akan masuk ke akun penyewa, sedangkan tagihan yang terbit sebelum kontrak tetap terlihat di akun pemilik dan penyewa." },
      { q: "Apa yang terjadi saat kontrak diakhiri?", a: "Rumah kembali ke pemilik dan tagihan berikutnya diterbitkan atas nama pemilik lagi." },
    ],
  },
  pendaftaran: {
    judul: "Pendaftaran Masuk",
    ringkas: "Daftar pendaftaran akun warga yang menunggu persetujuan. Pengurus meninjau data lalu menyetujui atau menolak.",
    faq: [
      { q: "Apa yang terjadi setelah disetujui?", a: "Akun warga aktif dan terhubung ke blok rumah yang dipilih, lalu warga bisa masuk ke aplikasi." },
      { q: "Bolehkah menolak pendaftaran?", a: "Boleh, sertakan alasan penolakan supaya jelas bagi pendaftar." },
    ],
  },
  "pengajuan-hapus": {
    judul: "Pengajuan Hapus Akun",
    ringkas: "Pengajuan penghapusan akun warga. Sekretaris RT mengajukan, lalu pengurus RW yang memutuskan setuju atau tolak.",
    faq: [
      { q: "Apa yang terjadi bila disetujui?", a: "Akun warga dihapus dan rumah yang terhubung menjadi kosong. Penyewa pada rumah itu juga dilepas." },
      { q: "Bagaimana bila ditolak?", a: "Akun tetap aktif dan alasan penolakan tercatat pada pengajuan." },
    ],
  },
  "ipl-warga": {
    judul: "Tagihan IPL",
    ringkas: "Tagihan IPL rumah Anda. Bayar dengan mengunggah bukti transfer, lalu pantau statusnya sampai dikonfirmasi pengurus.",
    faq: [
      { q: "Bagaimana cara membayar?", a: "Pilih tagihan, unggah foto bukti transfer, lalu kirim. Status berubah menjadi menunggu konfirmasi sampai pengurus memeriksanya." },
      { q: "Mengapa saya mendapat pengingat?", a: "Pengingat dikirim setiap hari pukul 09.00 selama ada tagihan yang sudah lewat jatuh tempo dan belum dibayar." },
    ],
  },
  "tagihan-warga": {
    judul: "Tagihan Warga",
    ringkas: "Tagihan IPL seluruh warga di wilayah Anda. Pengurus menerbitkan tagihan, memeriksa bukti bayar, dan mengonfirmasi atau menolaknya.",
    faq: [
      { q: "Bagaimana mengonfirmasi pembayaran?", a: "Buka tagihan berstatus menunggu konfirmasi, periksa bukti transfer, lalu setujui atau tolak dengan alasan." },
      { q: "Bagaimana tagihan untuk rumah yang dikontrakkan?", a: "Tagihan baru atas nama penyewa. Tagihan yang sudah terbit sebelum kontrak tetap menjadi tanggungan dan terlihat di kedua akun." },
    ],
  },
  "tagihan-saya": {
    judul: "Tagihan Saya",
    ringkas: "Tagihan IPL rumah pribadi Anda sebagai warga, terpisah dari tagihan warga yang Anda kelola sebagai pengurus.",
    faq: [
      { q: "Mengapa ada dua daftar tagihan?", a: "Anda pengurus sekaligus warga. Tagihan Warga adalah yang Anda kelola, sedangkan Tagihan Saya adalah kewajiban IPL rumah Anda sendiri." },
    ],
  },
  setoran: {
    judul: "Setoran IPL",
    ringkas: "Rekap IPL yang sudah lunas dan harus disetor RT ke RW. Pengurus RT membuat setoran, pengurus RW mengonfirmasi penerimaannya.",
    faq: [
      { q: "Kapan batas setor?", a: "Secara bawaan tanggal 15 tiap bulan. Pengurus RT mendapat pengingat bila ada IPL lunas yang belum disetor lewat batas itu." },
      { q: "Mengapa setoran ditolak?", a: "RW menyertakan alasan penolakan. Perbaiki sesuai alasan lalu ajukan kembali." },
    ],
  },
  "pengaduan-warga": {
    judul: "Pengaduan Lingkungan",
    ringkas: "Laporkan kendala di lingkungan cluster, misalnya lampu jalan mati atau kebersihan, lalu pantau tindak lanjutnya.",
    faq: [
      { q: "Bagaimana membuat pengaduan?", a: "Tekan Ajukan, isi judul, tujuan, kategori, dan deskripsi. Foto bersifat opsional." },
      { q: "Mengapa pengaduan saya diteruskan ke RW?", a: "Pengaduan yang lama belum ditanggapi pengurus RT diteruskan otomatis ke pengurus RW supaya tidak tertunda." },
    ],
  },
  "pengaduan-masuk": {
    judul: "Pengaduan Masuk",
    ringkas: "Laporan kendala dari warga yang ditujukan ke wilayah Anda. Pengurus meninjau, menanggapi, dan mengubah statusnya.",
    faq: [
      { q: "Apa arti status pengaduan?", a: "Menunggu belum ditinjau, Diproses sedang ditangani, Selesai sudah tuntas, dan Ditolak tidak dapat ditindaklanjuti." },
      { q: "Apa arti label Diteruskan ke RW?", a: "Pengaduan tidak ditanggapi RT dalam batas waktu, jadi otomatis dilimpahkan ke pengurus RW." },
    ],
  },
  "pengaduan-saya": {
    judul: "Pengaduan Saya",
    ringkas: "Pengaduan yang Anda ajukan sendiri beserta tanggapan dari pengurus.",
    faq: [
      { q: "Di mana melihat tanggapan?", a: "Buka detail pengaduan. Tanggapan pengurus tampil di kartu Tanggapan." },
    ],
  },
  kegiatan: {
    judul: "Kegiatan",
    ringkas: "Daftar kegiatan lingkungan. Kegiatan RT tampil untuk warga RT tersebut, dan kegiatan yang diajukan ke RW dapat tampil ke seluruh warga.",
    faq: [
      { q: "Bagaimana kegiatan RT tampil ke semua warga?", a: "Ajukan kegiatan ke RW. Setelah RW menyetujui, kegiatan tampil untuk seluruh warga." },
      { q: "Mengapa kegiatan harus memakai gambar?", a: "Gambar wajib agar kegiatan tampil menarik di halaman warga dan landing page." },
      { q: "Siapa yang bisa memberi masukan?", a: "Warga dapat memberi bintang dan komentar mulai saat acara berlangsung sampai 7 hari sesudahnya." },
    ],
  },
  "kegiatan-feedback": {
    judul: "Feedback Kegiatan",
    ringkas: "Penilaian dan komentar warga setelah kegiatan. Warga yang memilih anonim tidak tampil namanya.",
    faq: [
      { q: "Bisakah masukan disembunyikan?", a: "Bisa. Pengurus yang berhak dapat menyembunyikan masukan dari detail masukan, dan masukan itu tidak tampil di halaman publik." },
      { q: "Mengapa ada nama yang tampil Anonim?", a: "Warga memilih untuk tidak menampilkan nama saat mengirim masukan." },
    ],
  },
  pengumuman: {
    judul: "Pengumuman",
    ringkas: "Pengumuman resmi untuk warga. Pengumuman RT tampil untuk warga RT tersebut, dan yang diajukan ke RW dapat tampil ke seluruh warga.",
    faq: [
      { q: "Bagaimana melampirkan dokumen?", a: "Saat membuat pengumuman, unggah file lampiran. Warga dapat membukanya dari detail pengumuman." },
      { q: "Mengapa pengumuman ditolak RW?", a: "Alasan penolakan terlihat oleh pengurus di detail pengumuman. Perbaiki lalu ajukan kembali." },
    ],
  },
  "catatan-rapat": {
    judul: "Catatan Rapat",
    ringkas: "Arsip notulen rapat. Notulen RW dan RT terpisah dan tidak saling terlihat.",
    faq: [
      { q: "Format notulen apa yang bisa diunggah?", a: "Anda bisa menulis isi notulen langsung, atau melampirkan gambar atau dokumen (PDF/Word)." },
      { q: "Bagaimana mengunduh notulen?", a: "Buka detail catatan, lalu tekan Download PDF atau Download File." },
    ],
  },
  keuangan: {
    judul: "Keuangan",
    ringkas: "Laporan pemasukan dan pengeluaran kas wilayah Anda untuk periode yang dipilih. Data dapat diekspor ke Excel atau CSV.",
    faq: [
      { q: "Bagaimana mengganti periode?", a: "Gunakan filter periode di bawah banner. Kalau rentangnya tidak valid, tombol Export dinonaktifkan." },
      { q: "Bagaimana mengunduh laporan?", a: "Tekan tombol Export di banner. Tanda panah di sebelahnya membuka pilihan format unduhan." },
    ],
  },
  "admin-role": {
    judul: "Peran & Hak Akses",
    ringkas: "Atur akses tiap peran ke menu dan aksinya. Seluruhnya tersimpan di basis data dan berlaku langsung tanpa memasang ulang aplikasi.",
    faq: [
      { q: "Apa arti jangkauan ALL, AREA, dan OWN?", a: "ALL berlaku untuk seluruh wilayah, AREA hanya wilayah (RW/RT) pemegang peran, dan OWN hanya data milik pengguna sendiri." },
      { q: "Bagaimana membuat peran baru?", a: "Tambahkan peran di panel Peran, lalu centang menu dan aksi yang boleh diakses." },
    ],
  },
  "admin-pengurus": {
    judul: "Pengurus RW & RT",
    ringkas: "Tetapkan siapa yang menjabat ketua, bendahara, dan sekretaris di RW serta tiap RT. Satu jabatan satu orang per wilayah.",
    faq: [
      { q: "Apa yang terjadi pada pemegang jabatan lama?", a: "Saat jabatan diberikan ke orang lain, pemegang lama otomatis kembali menjadi warga." },
    ],
  },
  "panel-sistem": {
    judul: "Panel Pengelola Sistem",
    ringkas: "Pusat pengaturan untuk admin: hak akses, penetapan pengurus RW/RT, dan data warga.",
    faq: [
      { q: "Mengapa menu tagihan dan keuangan tidak ada?", a: "Urusan tagihan, keuangan, dan kegiatan dikerjakan pengurus RW/RT sesuai jabatannya." },
    ],
  },
};
