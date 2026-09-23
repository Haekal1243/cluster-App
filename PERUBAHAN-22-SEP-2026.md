# Daftar Perubahan — 22 September 2026

Commit: `a851405` — "Kerjakan Bagian 1-3 RENCANA-PERBAIKAN-SISTEM.md: IPL pengurus, pengaduan
RW/RT, registrasi mandiri" (branch `ojan`, sudah di-push ke GitHub).

Mengerjakan Bagian 1, 2, 3 dari `RENCANA-PERBAIKAN-SISTEM.md`. 34 file berubah (+1857/-105
baris). Referensi lengkap keputusan desain & alasan ada di file itu; dokumen ini fokus ke
**apa saja yang berubah**, per bagian dan per file.

---

## ⚠️ Wajib dijalankan sebelum pakai (folder `backend`)

```bash
npx prisma migrate deploy
npx prisma db seed
```

Urutan penting: migrate dulu baru seed. Migration menambah tabel/kolom baru (aman, tidak
menghapus data), seed menambah permission baru ke role yang sudah ada (idempotent, tidak
menimpa data warga/transaksi). Tanpa dua perintah ini, fitur di bawah akan error saat dipakai
(kolom/tabel belum ada di database, atau role belum punya izinnya).

`@nestjs/schedule` (dependency baru untuk job auto-teruskan pengaduan) sudah ter-install di
commit ini — `npm install` biasa saja setelah pull, tidak perlu langkah tambahan.

---

## Bagian 1 — Pengelolaan IPL (pengurus bisa bayar IPL sendiri)

### Masalah yang diperbaiki
Pengurus (Ketua/Bendahara/Sekre RW & RT) sebelumnya **tidak bisa bayar IPL rumahnya sendiri**,
karena permission `ipl.bayar` cuma dipegang role WARGA. Bug ini masih ada meski sudah ada
merge sebelumnya yang menggabungkan menu Tagihan+Setoran jadi "Kelola IPL" — merge itu cuma
reorganisasi tampilan, bug intinya belum kesentuh.

### Perubahan RBAC (`backend/prisma/rbac-data.ts`)
- **Permission baru**: `ipl.konfirmasi_pengurus` — "Konfirmasi pembayaran IPL milik pengurus
  (bukan warga biasa)".
- `ipl.bayar` (scope OWN) ditambahkan ke: KETUA_RW, BENDAHARA_RW, SEKRE_RW, KETUA_RT,
  BENDAHARA_RT, SEKRE_RT.
- `ipl.konfirmasi_pengurus` (scope AREA) ditambahkan ke: KETUA_RT, BENDAHARA_RT.
- Aturan konfirmasi: Bendahara RT dikonfirmasi Ketua RT; Ketua RT & Sekre RT dikonfirmasi
  Bendahara RT; Pengurus RW dikonfirmasi Bendahara RT di RT rumahnya (diperlakukan seperti
  warga biasa).

### Perubahan backend
- **`backend/src/ipl/ipl.controller.ts`** — endpoint `PATCH /ipl/konfirmasi/:pembayaranId`
  tidak lagi pakai `@RequirePermission` tunggal (karena sekarang ada 2 permission yang boleh
  akses); pengecekan dipindah ke service.
- **`backend/src/ipl/ipl.service.ts`** — `konfirmasiPembayaran()`:
  - Cek permission `ipl.konfirmasi` ATAU `ipl.konfirmasi_pengurus` (yang kedua hanya berlaku
    kalau pembayarnya pengurus, `role.level < 3`).
  - Guard baru: **konfirmator tidak boleh sama dengan pembayar** (tidak bisa approve pembayaran
    sendiri).
  - `findAll()`: query tagihan sekarang ikut mengambil `role.level` penghuni (dipakai frontend
    untuk menentukan tombol konfirmasi mana yang tampil).
- **`backend/src/warga/warga.service.ts`**:
  - `assertBolehLihatUser()` dan `getTagihanByRumah()`: **rumah/data milik sendiri selalu boleh
    dilihat**, apa pun scope permission-nya. Fix untuk kasus pengurus RT 1 yang rumahnya di
    RT 3 — sebelumnya ketolak karena area-nya beda.
  - `uploadBuktiPembayaran()`: notifikasi "Bukti Pembayaran Baru" sekarang dikirim ke pemegang
    `ipl.konfirmasi_pengurus` kalau pembayarnya pengurus, atau ke pemegang `ipl.konfirmasi`
    seperti biasa kalau pembayarnya warga biasa.

### Perubahan frontend
- **`frontend/src/app/dashboard/kelola-ipl/tagihan/page.jsx`**:
  - Tampilan sekarang berbasis permission (`can`/`scopeOf`), bukan `isWargaView`/`roleLevel`
    lagi.
  - Pengurus yang punya `ipl.read` (lihat tagihan RT/RW) **dan** `ipl.bayar` (bisa bayar
    sendiri) dapat tab internal baru: **"Tagihan Warga"** / **"Tagihan Saya"**.
  - Warga biasa tetap tampilan lama (tanpa bar tab).
  - Tombol "Review" konfirmasi pembayaran sekarang muncul juga untuk pemegang
    `ipl.konfirmasi_pengurus`, tapi cuma di baris yang penghuninya pengurus.
- **`frontend/src/app/dashboard/kelola-ipl/layout.jsx`** — judul halaman dinamis: "Pengelolaan
  IPL" untuk pengurus, "Tagihan IPL" untuk warga (sebelumnya statis "Kelola IPL").
- **`frontend/src/lib/nav.js`** — label menu sidebar ikut dinamis sama seperti di atas.
  `resolveLabel()` baru ditambahkan supaya `label` di `NAV_ITEMS` bisa berupa fungsi
  `(user) => string`, bukan cuma string statis.
- **`frontend/src/components/layout/Sidebar.jsx`** dan **`Header.jsx`** — disesuaikan supaya
  bisa resolve label dinamis itu (`Header` sekarang kirim `user` ke `pageTitle()`).

### Yang sengaja tidak dikerjakan
- Pemecahan `tagihan/page.jsx` (masih ~1400 baris) ke `frontend/src/components/ipl/` — di
  rencana awal ini opsional/nice-to-have, bukan wajib.
- Kartu "Tagihan saya bulan ini" di Beranda pengurus.

---

## Bagian 2 — Pengaduan bertujuan RW/RT + auto-teruskan 7 hari

### Sebelumnya
Pengaduan tidak punya "tujuan" — visibilitasnya ditentukan dari area pelapor, dan role RW
(scope ALL) otomatis melihat SEMUA pengaduan termasuk yang harusnya cuma untuk RT. Pengurus
juga belum bisa bikin pengaduan sama sekali (`pengaduan.create` cuma dipegang WARGA).

### Perubahan schema (`backend/prisma/schema.prisma` + migration)
- `Pengaduan.tujuan Area` (wajib, `RW` atau `RT_01..RT_04`).
- `Pengaduan.diteruskanAt DateTime?` — cap waktu kalau sudah auto-diteruskan ke RW.
- Index baru: `(tujuan, status)` dan `(status, createdAt)`.
- Enum `TipeNotifikasi` tambah nilai `PENGADUAN_DITERUSKAN`.
- **Migration**: `backend/prisma/migrations/20260922000000_add_pengaduan_tujuan/migration.sql`
  — ditulis manual (bukan hasil `prisma migrate dev`) supaya bisa membackfill data pengaduan
  lama: `tujuan` diisi dari area pelapor kalau RT, selain itu default `RW`.

### Perubahan RBAC (`rbac-data.ts`)
- **Permission `pengaduan.create` dihapus**, diganti dua permission baru:
  - `pengaduan.create_rw` — "Buat pengaduan ke RW"
  - `pengaduan.create_rt` — "Buat pengaduan ke RT"
- WARGA: dapat keduanya (OWN) — sama seperti sebelumnya bisa mengadu ke RW atau RT manapun
  tempat rumahnya.
- KETUA_RT, BENDAHARA_RT, SEKRE_RT: dapat `create_rw` (OWN) — pengurus RT cuma boleh mengadu
  ke RW, bukan ke RT tempat dia menjabat (supaya tidak mengadu ke dirinya sendiri).
- KETUA_RW, BENDAHARA_RW, SEKRE_RW: dapat `create_rt` (OWN) — pengurus RW mengadu sebagai
  warga RT tempat rumahnya, bukan ke RW.
- **KETUA_RW, BENDAHARA_RW, SEKRE_RW: `pengaduan.read`/`respon` diturunkan dari ALL ke AREA** —
  supaya RW cuma lihat pengaduan bertujuan RW, tidak ikut lihat pengaduan RT.
- `seed.ts` — ditambah langkah pembersihan: permission `pengaduan.create` lama otomatis
  dihapus dari database (cascade menghapus grant-nya juga) saat `npx prisma db seed`
  dijalankan, supaya tidak jadi permission mati yang nyampah di menu Peran & Hak Akses.

### Perubahan backend
- **`backend/src/pengaduan/pengaduan.service.ts`** (ditulis ulang total):
  - `scopeWhere()` baru: visibilitas berdasarkan `tujuan`, bukan area pelapor. RW melihat
    tujuan RW + yang sudah diteruskan; RT melihat tujuan RT-nya; pelapor selalu melihat
    miliknya sendiri apa pun tujuannya.
  - `getTujuanPilihan(user)` — method baru, menghitung pilihan tujuan (RW/RT mana saja) yang
    valid untuk seorang user berdasarkan rumah yang dimilikinya + jabatannya. Dipakai bareng
    oleh validasi `create()` dan endpoint form, supaya keduanya tidak pernah beda aturan.
  - `create()` — sekarang menerima `tujuan`, divalidasi lewat `getTujuanPilihan()`.
  - `respond()` — guard baru: pelapor tidak bisa menanggapi pengaduannya sendiri.
  - **Job terjadwal** `teruskanOtomatis()` — jalan tiap hari jam 01:00 (`@Cron`) dan sekali saat
    aplikasi start. Cari pengaduan tujuan RT berstatus MENUNGGU yang sudah ≥7 hari dan belum
    diteruskan, set `diteruskanAt`, kirim notifikasi ke RW + RT asal + pelapor. Idempotent
    (aman dijalankan berkali-kali).
- **`backend/src/pengaduan/pengaduan.controller.ts`**:
  - Endpoint baru `GET /pengaduan/tujuan` — daftar pilihan tujuan untuk form (publik untuk user
    yang login, tanpa permission khusus).
  - `POST /pengaduan` tidak lagi pakai `@RequirePermission` tunggal (sama alasannya dengan IPL
    konfirmasi — dua permission yang bisa akses).
- **`backend/src/pengaduan/dto/create-pengaduan.dto.ts`** — tambah field `tujuan` (wajib).
- **`backend/src/notifikasi/notifikasi.service.ts`** — method baru
  `kirimKePermissionAreaPersis()`. **Bug yang ditemukan & diperbaiki**: method lama
  `kirimKePermission()` punya shortcut "area RW = kirim ke SEMUA pemegang permission apa pun
  areanya" (dipakai buat Kegiatan/Pengumuman yang memang "berlaku untuk semua RT"). Kalau
  dipakai apa adanya untuk notifikasi Pengaduan tujuan RW, notifikasinya bakal ikut nyasar ke
  pengurus RT — jadi dibuatkan varian baru yang area-nya selalu dicocokkan persis. Method lama
  **tidak diubah** supaya Kegiatan/Pengumuman/Pengajuan tidak kena regresi.
- **`backend/src/app.module.ts`** — tambah `ScheduleModule.forRoot()` untuk mengaktifkan job
  `@Cron`.

### Perubahan frontend
- **`frontend/src/app/dashboard/pengaduan/page.jsx`**:
  - Tampilan berbasis permission (tab "Pengaduan Masuk" / "Pengaduan Saya"), bukan
    `isWargaView` lagi — pola sama seperti Bagian 1.
  - Kolom/badge **Tujuan** di tabel & kartu grid.
  - Penanda "diteruskan ke RW" (ikon `Forward`) untuk pengaduan yang sudah lewat 7 hari.
- **`frontend/src/components/pengaduan/PengaduanFormModal.jsx`** — field baru **Tujuan**:
  fetch pilihan dari `GET /pengaduan/tujuan`, tampil sebagai teks tetap kalau cuma 1 pilihan,
  dropdown kalau lebih dari 1, pesan error kalau tidak ada pilihan valid sama sekali.
- **`frontend/src/components/pengaduan/PengaduanDetailModal.jsx`** dan
  **`PengaduanRespondModal.jsx`** — tampilkan Tujuan + penanda "Diteruskan ke RW" kalau ada.
- **`frontend/src/lib/api.js`** — `pengaduanApi.getTujuanPilihan()` baru.
- **`frontend/src/lib/nav.js`** — `allow` menu Pengaduan update ke permission baru
  (`create_rw`/`create_rt` menggantikan `create`).

### Yang sengaja tidak dikerjakan
- Meneruskan pengaduan secara manual oleh pengurus RT (di luar auto-teruskan 7 hari).
- Eskalasi bertingkat lebih dari RT → RW.
- Notifikasi WhatsApp/email.

---

## Bagian 3 — Registrasi mandiri warga (self-register)

### Sebelumnya
Akun warga cuma bisa dibuat pengurus RT lewat menu Data Warga. Ditemukan UI registrasi lama di
branch `origin/register` (dari versi lama sebelum restrukturisasi RBAC), tapi backend-nya
sudah tidak cocok dengan skema sekarang (endpoint tanpa proteksi, blok rumah diisi teks bebas).

### Perubahan schema
- **Tabel baru `tb_PendaftaranWarga`**: `namaUser`, `noTelp`, `email`, `password` (sudah
  di-hash), `rt`, `rumahId` (FK ke `tb_Rumah`), `status` (PENDING/DISETUJUI/DITOLAK),
  `alasanTolak`, `diprosesOleh`, `diprosesAt`, `createdAt`. Index `(rt, status)`.
- Enum `TipeNotifikasi` tambah nilai `PENDAFTARAN_BARU`.
- **Migration**:
  `backend/prisma/migrations/20260922010000_add_pendaftaran_warga/migration.sql` — tabel baru,
  tanpa backfill (tidak ada data lama untuk fitur ini).

### Perubahan RBAC
- **Permission baru** `warga.approve_registrasi` — "Setujui/tolak pendaftaran mandiri warga",
  diberikan ke KETUA_RT dan SEKRE_RT (scope AREA) — role yang sama yang sudah punya
  `warga.create` untuk RT-nya.

### Perubahan backend
- **`backend/src/warga/warga.service.ts`** — method baru:
  - `getRumahKosong(rt)` — daftar blok rumah berstatus KOSONG di satu RT (untuk dropdown form).
  - `daftarMandiri(dto)` — validasi rumah masih kosong, cek duplikat no HP/email (baik yang
    sudah jadi akun maupun yang masih pending), hash password, simpan sebagai
    `PendaftaranWarga` status PENDING, kirim notifikasi ke pemegang `warga.approve_registrasi`
    di RT itu.
  - `getPendaftaran(ctx, status)` — daftar pendaftaran di area pengurus (default: yang PENDING
    saja).
  - `setujuiPendaftaran(ctx, id)` — transaksi: cek ulang rumah masih kosong (jaga-jaga kalau
    sudah keburu diisi lewat menu lain), buat `tb_User` baru (role WARGA, password dipindah
    apa adanya dari hash yang sudah ada — tidak perlu password sementara karena warga sudah
    pilih sendiri), hubungkan ke rumah, tandai pendaftaran DISETUJUI.
  - `tolakPendaftaran(ctx, id, alasan)` — tandai DITOLAK + simpan alasan.
- **`backend/src/warga/warga.controller.ts`** — route baru:
  - `POST /warga/daftar` — **publik** (tanpa token), dipanggil dari halaman register.
  - `GET /warga/rumah-kosong?rt=...` — **publik**, dipakai dropdown blok rumah di form.
  - `GET /warga/pendaftaran`, `PATCH /warga/pendaftaran/:id/setuju`,
    `PATCH /warga/pendaftaran/:id/tolak` — butuh permission `warga.approve_registrasi`.
- **DTO baru**: `backend/src/warga/dto/daftar-mandiri.dto.ts`,
  `backend/src/warga/dto/tolak-pendaftaran.dto.ts`.
- **Catatan desain**: tidak ada notifikasi otomatis ke pendaftar saat disetujui/ditolak,
  karena sebelum disetujui pendaftar belum punya akun (`tb_Notifikasi` butuh `idUser` yang
  valid) dan project belum punya infra email/SMS. Pengurus RT menyampaikan hasilnya manual
  (WhatsApp dll.), sama seperti proses pembuatan akun manual yang sudah ada sekarang.

### Perubahan frontend
- **`frontend/src/app/register/page.jsx`** (baru) — form step 1 "Data Diri": nama, no HP, RT,
  lalu **dropdown blok rumah** yang otomatis terisi dari `GET /warga/rumah-kosong` sesuai RT
  yang dipilih (bukan input teks bebas seperti versi lama).
- **`frontend/src/app/register/account-info/page.jsx`** (baru) — form step 2 "Akun": email
  (opsional), password, konfirmasi password. Submit ke `POST /warga/daftar`, lalu tampil pesan
  "menunggu persetujuan pengurus RT" (bukan langsung "berhasil, silakan login").
- **`frontend/src/components/auth/RegisterStepper.jsx`** (baru) — indikator 2 langkah,
  dipulihkan dari `origin/register` (UI-nya sama, cuma label diselaraskan).
- **`frontend/src/app/login/page.jsx`** — tambah link "Daftar di sini" mengarah ke `/register`
  (sebelumnya teks di sini bilang "hubungi sekretaris/ketua RT" untuk bikin akun — itu
  kebijakan lama yang sekarang dibalik atas permintaan user).
- **`frontend/src/app/dashboard/warga/page.jsx`** — tab baru **"Pendaftaran Masuk"** (cuma
  tampil untuk pemegang `warga.approve_registrasi`), dengan badge jumlah pending. Isinya
  daftar pendaftaran + tombol Setuju (konfirmasi) dan Tolak (minta alasan lewat dialog).
- **`frontend/src/lib/api.js`** — `wargaApi.getRumahKosong()`, `daftarMandiri()`,
  `getPendaftaran()`, `setujuiPendaftaran()`, `tolakPendaftaran()`.

### Keputusan yang diambil (dari opsi yang ditanyakan ke user)
- **Perlu persetujuan pengurus** (bukan langsung aktif) — konsisten dengan pola "pengurus
  yang memvalidasi warga" yang sudah ada.
- **Pilih rumah dari dropdown blok KOSONG** (bukan teks bebas + verifikasi manual).

### Yang sengaja tidak dikerjakan
- Verifikasi OTP SMS/email (belum ada infra pengirim pesan).
- Halaman cek status pendaftaran untuk pendaftar (tidak ada akun untuk login sebelum
  disetujui, jadi tidak ada tempat menampilkannya).
- Lupa password mandiri (tetap lewat pengurus, tidak berubah).
- Opsi "blok belum ada di daftar" dengan teks bebas — tidak dipilih user.

---

## Bagian 4 — Belum dikerjakan (sengaja)

Dokumen BAST + rincian harga per fitur untuk diserahkan ke RW — **menunggu sinyal eksplisit
dari user**, dicatat sebagai rencana di `RENCANA-PERBAIKAN-SISTEM.md` tapi belum dibuat.

---

## Ringkasan file yang berubah

**Backend (14 file diubah, 6 file baru):**
`prisma/schema.prisma`, `prisma/rbac-data.ts`, `prisma/seed.ts`, `prisma/migrations/…` (2
migration baru), `src/app.module.ts`, `src/ipl/ipl.controller.ts`, `src/ipl/ipl.service.ts`,
`src/notifikasi/notifikasi.service.ts`, `src/pengaduan/*` (controller, service, dto),
`src/warga/warga.controller.ts`, `src/warga/warga.service.ts`, `src/warga/dto/*` (2 file baru),
`package.json` (+`@nestjs/schedule`).

**Frontend (13 file diubah, 4 file baru):**
`app/dashboard/kelola-ipl/layout.jsx`, `app/dashboard/kelola-ipl/tagihan/page.jsx`,
`app/dashboard/pengaduan/page.jsx`, `app/dashboard/warga/page.jsx`, `app/login/page.jsx`,
`app/register/*` (2 file baru), `components/auth/RegisterStepper.jsx` (baru),
`components/layout/Header.jsx`, `components/layout/Sidebar.jsx`,
`components/pengaduan/*` (3 file), `lib/api.js`, `lib/nav.js`.

**Build**: `nest build` (backend) dan `next build` (frontend) lolos tanpa error di semua
perubahan di atas.
