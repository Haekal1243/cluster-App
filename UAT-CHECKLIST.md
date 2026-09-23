# Checklist UAT (User Acceptance Testing)

Struktur: per role dulu (biar sesuai cara pengurus beneran login pakai akun masing-masing dan
nyoba fitur dia sendiri), ditutup dengan section **Skenario Lintas Peran** buat flow yang
butuh serah-terima 2 pihak. Tiap role ada 2 bagian: **Bisa** (positif, sesuai matriks
permission di `backend/prisma/rbac-data.ts`) dan **Tidak Boleh Bisa** (negatif, cek batas
scope OWN/AREA/ALL — ini yang paling sering jadi sumber bug RBAC).

Cara pakai: login pakai akun role terkait, centang tiap baris. Kalau ada yang gagal/beda dari
ekspektasi, catat di bawah baris itu (jangan hapus baris checklist-nya).

---

## Admin

Cuma ngurusin sistem, bukan urusan RT/RW.

**Bisa:**
- [ ] Buka menu Role & Permission, ubah matriks permission suatu role, cek langsung ke akun
      role itu (browser/tab lain) hak aksesnya berubah tanpa perlu deploy ulang.
- [ ] Tetapkan/ubah jabatan pengurus RW/RT (menu Pengurus).
- [ ] Lihat, tambah, ubah, hapus data warga (semua area).
- [ ] Reset password warga mana pun.

**Tidak boleh bisa:**
- [ ] Buka menu/endpoint Tagihan IPL, Keuangan, Pengaduan, Kegiatan, Pengumuman, Catatan
      Rapat — dashboard admin harus PanelSistem, bukan statistik IPL.

---

## Ketua RW

**Bisa:**
- [ ] Lihat data warga semua RT (ALL).
- [ ] Lihat semua tagihan IPL semua RT (ALL), termasuk tagihan IPL milik pengurus.
- [ ] Bayar IPL milik sendiri (tab "Tagihan Saya").
- [ ] Lihat semua setoran IPL RT → RW (ALL).
- [ ] Lihat rekap keuangan semua RT (ALL).
- [ ] Lihat & tanggapi pengaduan yang ditujukan ke RW (AREA).
- [ ] Ajukan pengaduan ke RT (dia warga di RT tempat rumahnya).
- [ ] CRUD kegiatan & pengumuman (ALL), approve pengajuan kegiatan/pengumuman dari RT.
- [ ] Lihat catatan rapat RW (AREA — notulen RW saja).

**Tidak boleh bisa:**
- [ ] Lihat/tanggapi pengaduan yang ditujukan ke RT tertentu (bukan ke RW) — harus AREA, bukan ALL.
- [ ] Lihat catatan rapat milik RT mana pun (RW dan RT harus saling tidak lihat).
- [ ] Generate/ubah/hapus tagihan IPL (itu wewenang Bendahara RT).
- [ ] Buka menu Role & Permission atau Pengurus (itu wewenang Admin).

---

## Bendahara RW

**Bisa:**
- [ ] Lihat data warga semua RT, lihat semua tagihan IPL (ALL), bayar IPL milik sendiri.
- [ ] Lihat semua setoran RT → RW dan **konfirmasi** setoran itu (upload bukti dari RT lalu
      masuk sebagai transaksi kas RW).
- [ ] Lihat rekap keuangan semua RT (ALL), tapi cuma bisa tambah/ubah/hapus transaksi kas milik
      RW sendiri (AREA).
- [ ] Lihat & ajukan pengaduan ke RT (OWN, dia warga RT-nya).
- [ ] Lihat kegiatan & pengumuman semua RT.
- [ ] Lihat catatan rapat RW (AREA).

**Tidak boleh bisa:**
- [ ] Tambah/ubah/hapus transaksi kas milik RT (harus AREA-nya sendiri saja, bukan RT lain).
- [ ] Generate tagihan IPL (itu wewenang Bendahara RT, bukan Bendahara RW).
- [ ] Tanggapi pengaduan (dia gak punya `pengaduan.respon` — cek di kode, kalau ternyata bisa
      berarti ada bug, laporkan).
- [ ] Lihat catatan rapat RT mana pun.

---

## Sekretaris RW

**Bisa:**
- [ ] Lihat data warga semua RT, lihat tagihan IPL semua (ALL), bayar IPL sendiri.
- [ ] Lihat keuangan RW (AREA).
- [ ] Lihat & tanggapi pengaduan ke RW (AREA), ajukan pengaduan ke RT (OWN).
- [ ] CRUD kegiatan & pengumuman (ALL), approve pengajuan dari RT.
- [ ] CRUD catatan rapat RW (AREA — bisa buat/ubah/hapus, bukan cuma baca).

**Tidak boleh bisa:**
- [ ] Lihat/ubah keuangan RT mana pun.
- [ ] Lihat/tanggapi pengaduan yang ditujukan ke RT tertentu.
- [ ] Lihat catatan rapat RT mana pun.

---

## Ketua RT (contoh: RT 02 — ganti sesuai RT akun tes)

**Bisa:**
- [ ] CRUD data warga di RT sendiri, reset password warga RT sendiri.
- [ ] Approve/tolak pendaftaran mandiri warga baru di RT sendiri (tab "Pendaftaran Masuk").
- [ ] Lihat tagihan IPL RT sendiri (AREA), bayar IPL milik sendiri (OWN, tab "Tagihan Saya").
- [ ] **Konfirmasi pembayaran IPL milik pengurus lain** di RT sendiri (`ipl.konfirmasi_pengurus`
      — ini beda dari konfirmasi IPL warga biasa yang jadi wewenang Bendahara RT).
- [ ] Lihat setoran IPL RT sendiri ke RW, lihat keuangan RT sendiri.
- [ ] Lihat & tanggapi pengaduan yang masuk ke RT sendiri (AREA), ajukan pengaduan ke RW (OWN).
- [ ] Lihat kegiatan/pengumuman/catatan rapat RT sendiri.

**Tidak boleh bisa:**
- [ ] Lihat/ubah data warga RT lain.
- [ ] Approve pendaftaran warga baru di RT lain.
- [ ] Lihat/tanggapi pengaduan yang ditujukan ke RT lain atau ke RW.
- [ ] Generate tagihan IPL (bukan wewenang Ketua RT, itu Bendahara RT — cek `ipl.generate` gak
      ada di matriks Ketua RT).
- [ ] Konfirmasi pembayaran IPL warga biasa (`ipl.konfirmasi` — beda dari `ipl.konfirmasi_pengurus`,
      pastikan gak ketuker).
- [ ] Buat/ubah/hapus kegiatan, pengumuman, atau catatan rapat (Ketua RT cuma `read`, yang CRUD
      itu Sekretaris RT).

---

## Bendahara RT (contoh: RT 02)

**Bisa:**
- [ ] Lihat data warga RT sendiri (read-only, gak ada create/update/delete).
- [ ] Generate tagihan IPL periode baru untuk RT sendiri, ubah, hapus tagihan.
- [ ] Konfirmasi pembayaran IPL warga biasa DAN pengurus (`ipl.konfirmasi` +
      `ipl.konfirmasi_pengurus`), bayar IPL milik sendiri.
- [ ] Setor IPL RT ke RW (upload bukti), lihat riwayat setoran RT sendiri.
- [ ] CRUD keuangan/kas RT sendiri.
- [ ] Lihat pengaduan RT sendiri, ajukan pengaduan ke RW.

**Tidak boleh bisa:**
- [ ] Generate/lihat tagihan IPL RT lain.
- [ ] Tambah/ubah data warga (cuma read).
- [ ] Approve pendaftaran warga baru (itu wewenang Ketua RT/Sekretaris RT, bukan Bendahara RT).
- [ ] Konfirmasi setoran RT ke RW (itu wewenang Bendahara RW, bukan Bendahara RT — Bendahara RT
      cuma `create`).
- [ ] Buat/ubah kegiatan, pengumuman, catatan rapat (cuma `read`).

---

## Sekretaris RT (contoh: RT 02)

**Bisa:**
- [ ] CRUD data warga RT sendiri, reset password, approve pendaftaran mandiri warga baru.
- [ ] Lihat tagihan IPL RT sendiri, bayar IPL milik sendiri (OWN) — **tapi tidak bisa
      konfirmasi pembayaran** (itu wewenang Bendahara RT/Ketua RT, bukan Sekretaris RT).
- [ ] Lihat keuangan RT sendiri (read-only).
- [ ] Ajukan pengaduan ke RW.
- [ ] CRUD kegiatan & pengumuman RT sendiri, **ajukan** ke RW supaya tampil ke seluruh warga RW
      (butuh approve dari Ketua/Sekretaris RW).
- [ ] CRUD catatan rapat RT sendiri.

**Tidak boleh bisa:**
- [ ] Konfirmasi pembayaran IPL (baik warga maupun pengurus).
- [ ] Generate tagihan IPL.
- [ ] Tambah/ubah/hapus transaksi kas (cuma `read`).
- [ ] Approve sendiri pengajuan kegiatan/pengumuman yang dia ajukan (approve itu wewenang RW,
      bukan RT — pastikan tombol approve gak muncul di sisi RT).
- [ ] Lihat/tanggapi pengaduan yang ditujukan ke RT lain.

---

## Warga (non-pengurus)

**Bisa:**
- [ ] Lihat & bayar tagihan IPL milik sendiri saja (OWN — rumah sendiri selalu boleh dilihat
      meski belum ada tagihan berjalan).
- [ ] Ajukan pengaduan ke RT sendiri ATAU ke RW, lihat status pengaduan yang dia buat sendiri
      (OWN — bukan pengaduan warga lain).
- [ ] Lihat kegiatan & pengumuman yang berlaku untuk RT-nya (AREA: milik RT sendiri + yang
      sudah di-ACC RW untuk tampil ke seluruh RW).

**Tidak boleh bisa:**
- [ ] Lihat tagihan IPL warga lain (termasuk warga di RT yang sama).
- [ ] Lihat pengaduan warga lain, atau lihat pengaduan yang ditujukan ke RT/RW dari sisi
      "masuk" (dia cuma punya `pengaduan.read` OWN, bukan AREA).
- [ ] Akses menu Data Warga, Keuangan, Setoran, Catatan Rapat, Role & Permission sama sekali
      (gak ada permission-nya).
- [ ] Generate/konfirmasi tagihan IPL siapa pun.

---

## Registrasi Mandiri (publik, belum login)

- [ ] Buka `/register`, pilih rumah dari daftar rumah kosong (`GET /warga/rumah-kosong`) — pastikan
      rumah yang statusnya sudah terisi TIDAK muncul di daftar.
- [ ] Isi form daftar (`POST /warga/daftar`), submit — cek validasi input (NIK, no HP format
      benar, field wajib gak boleh kosong).
- [ ] Setelah daftar, cek muncul di tab "Pendaftaran Masuk" pada akun Ketua RT / Sekretaris RT
      **RT yang sesuai dengan rumah yang dipilih** (bukan RT lain).
- [ ] Ketua RT / Sekretaris RT approve pendaftaran → cek akun warga baru otomatis aktif dan
      bisa login.
- [ ] Ketua RT / Sekretaris RT tolak pendaftaran → cek pendaftar tidak bisa login, dan idealnya
      dapat notifikasi alasan ditolak (kalau fiturnya ada).
- [ ] Coba daftar 2x dengan NIK/no HP yang sama → pastikan ditolak (no duplicate).

---

## Skenario Lintas Peran

Flow yang butuh 2 pihak berbeda — gak bisa divalidasi lengkap cuma dari 1 section role di atas.

1. **Alur bayar IPL sampai setor ke RW:**
   Bendahara RT generate tagihan → Warga (atau pengurus) bayar & upload bukti → Bendahara RT
   (atau Ketua RT khusus untuk sesama pengurus) konfirmasi → tagihan lunas otomatis masuk
   antrean setoran → Bendahara RT setor ke RW (upload bukti) → Bendahara RW konfirmasi setoran
   → cek otomatis tercatat sebagai transaksi kas RW.

2. **Alur pengaduan ke RT dengan auto-teruskan:**
   Warga ajukan pengaduan ke RT → Ketua RT/Sekretaris RT **sengaja tidak** menanggapi selama
   7 hari → cek job `@Cron` otomatis meneruskan pengaduan itu ke RW → pastikan RW cuma
   menerima pengaduan yang diteruskan ini, bukan semua pengaduan RT lain yang belum lewat 7
   hari.

3. **Alur pengaduan ke RW (langsung):**
   Warga atau pengurus ajukan pengaduan ke RW → Ketua RW/Sekretaris RW tanggapi → cek warga
   pembuat pengaduan dapat notifikasi status berubah.

4. **Alur kegiatan/pengumuman tampil ke seluruh RW:**
   Sekretaris RT buat kegiatan/pengumuman → ajukan ke RW → Ketua RW/Sekretaris RW approve
   (dengan durasi tampil + flag portofolio landing) → cek muncul di halaman warga RT **lain**
   (bukan cuma RT pembuat) selama durasi tampil, dan hilang setelah lewat durasi.

5. **Notifikasi lintas area:**
   Cek notifikasi terkait Bagian 2 (`kirimKePermissionAreaPersis`) — pastikan saat RW
   mengirim/menanggapi sesuatu yang sifatnya AREA-spesifik, notifikasi **tidak** kekirim ke
   semua area (bug lama yang sudah coba diperbaiki, worth diverifikasi ulang manual).

---

## Catatan

- Checklist ini dibuat dari matriks permission aktual di `backend/prisma/rbac-data.ts` (23 Sep
  2026). Kalau matriks berubah lewat menu Role & Permission, checklist ini bisa jadi tidak akurat
  lagi — update manual kalau ada perubahan besar.
- Body "Tidak boleh bisa" itu bagian paling penting: kalau salah satu makul (harusnya gak bisa,
  ternyata bisa), itu bug RBAC yang serius — segera catat detail langkahnya buat dilaporkan.
