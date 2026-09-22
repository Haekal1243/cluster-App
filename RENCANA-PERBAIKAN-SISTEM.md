# Rencana Perbaikan Sistem

Status: Bagian 1, 2 & 3 **selesai dikerjakan** (22 Sep 2026, kode + `nest build`/`next build`
lolos — lihat catatan lengkap di bawah judul masing-masing bagian). File ini dipakai sebagai
perintah kerja. Jangan ubah kode di luar cakupan di bawah, dan jangan menjalankan reset/seed/
migrate DB sendiri: minta user yang menjalankannya.

**User WAJIB menjalankan ini di folder `backend` sebelum Bagian 1-3 kepakai di data yang
sudah ada** (urutan penting, migrate dulu baru seed):
1. `npx prisma migrate deploy` — menerapkan 2 migration baru sekaligus:
   `20260922000000_add_pengaduan_tujuan` (Bagian 2: `tujuan`/`diteruskanAt` di Pengaduan + enum
   notifikasi) dan `20260922010000_add_pendaftaran_warga` (Bagian 3: tabel
   `tb_PendaftaranWarga` + enum notifikasi). Keduanya ditulis manual (bukan hasil
   `prisma migrate dev`) supaya bisa membackfill data lama sebelum kolom baru diwajibkan —
   aman dijalankan di DB yang sudah berisi data.
2. `npx prisma db seed` — upsert semua permission baru Bagian 1-3 (`ipl.bayar` utk pengurus,
   `ipl.konfirmasi_pengurus`, `pengaduan.create_rw`/`create_rt`, `warga.approve_registrasi`) +
   hapus `pengaduan.create` lama. Idempotent (upsert + `skipDuplicates`) dan **tidak menghapus
   data warga/transaksi yang sudah ada** (lihat `prisma/seed.ts` — kalau sudah ada user, data
   dummy dilewati).

`@nestjs/schedule` (dependency baru Bagian 2, dipakai job auto-teruskan pengaduan) sudah
ter-install di repo ini (`npm install` sudah dijalankan, `package.json`/lockfile sudah ikut
ter-commit-siap) — user tidak perlu install ulang kecuali clone fresh, lalu tinggal
`npm install` seperti biasa.

Isi:

1. **Bagian 1**: menu Pengelolaan IPL + Tagihan Saya untuk pengurus (gabung Tagihan & Setoran).
2. **Bagian 2**: Pengaduan dengan tujuan RW/RT, pengurus boleh mengadu, auto-teruskan 7 hari.
3. **Bagian 3**: Registrasi mandiri warga (self-register), UI dipakai lagi dari branch
   `origin/register` lama.
4. **Bagian 4** (non-kode): Dokumen BAST + rincian harga per fitur. **Jangan dikerjakan sampai
   user kasih sinyal eksplisit** — bagian lain di file ini boleh jalan duluan tanpa menunggu ini.

Ketiga bagian bisa dikerjakan terpisah. Bagian 1 & 2 sama-sama memakai pola "tab Saya" untuk
pengurus dan sama-sama mengubah matriks permission di `rbac-data.ts`, jadi kerjakan berurutan
agar tidak bentrok. Bagian 3 tidak menyentuh matriks permission Bagian 1/2, tapi tetap menambah
baris baru di `rbac-data.ts` (lihat di bawah), jadi cek dulu baris itu belum diubah bagian lain
sebelum mulai.

---

# Bagian 1 — Menu "Pengelolaan IPL" + Tagihan Saya untuk pengurus

**Status: selesai dikerjakan (22 Sep 2026).** Backend (`rbac-data.ts`, `ipl.controller.ts`,
`ipl.service.ts`, `warga.service.ts`) dan frontend (`kelola-ipl/tagihan/page.jsx`, `nav.js`,
`Sidebar.jsx`, `Header.jsx`, `kelola-ipl/layout.jsx`) sudah diubah sesuai rancangan di bawah,
Opsi 2 dipilih untuk konfirmasi Ketua RT. `npx tsc --noEmit` (backend) dan `next build`
(frontend) lolos. **Sengaja tidak dikerjakan** (di luar cakupan minimum, boleh menyusul kalau
diminta): pemecahan `tagihan/page.jsx` (masih 1400-an baris, belum dipindah ke
`frontend/src/components/ipl/`) dan kartu "Tagihan saya bulan ini" di Beranda pengurus — kedua
item itu di rencana awal juga ditandai opsional. Tab "Tagihan Saya" diimplementasikan sebagai
tab internal di dalam `/dashboard/kelola-ipl/tagihan` (bukan `?tab=` di satu halaman gabungan
seperti draf awal), mengikuti pola routing yang sudah dipakai merge teman user untuk
Tagihan/Setoran — fungsinya sama, cuma bentuk routingnya beda dari draf.

**User wajib jalankan `npx prisma db seed` di folder `backend`** sebelum fitur ini kepakai di
data yang sudah ada (lihat catatan di judul file).

## Latar belakang

1. Pengurus (Ketua/Bendahara/Sekre RW & RT) tidak bisa membayar IPL rumahnya sendiri.
   Penyebab: satu user hanya punya satu `roleId`. `PengurusService.assign`
   (`backend/src/rbac/pengurus.service.ts:137`) menimpa role WARGA, sehingga permission
   `ipl.bayar` (scope OWN) hilang. Tampilan portal warga juga ditentukan `roleLevel === 3`
   (`frontend/src/lib/session.js:65`), jadi pengurus hanya melihat `AdminIuranView`.
2. Menu "Tagihan IPL" dan "Setoran IPL" satu alur (setoran diambil dari tagihan lunas,
   `getSiapSetor`) tetapi dipisah menjadi dua menu.

## Keputusan yang sudah disetujui user

- **Opsi A**: pengurus mendapat tab "Tagihan Saya" (tampilan `WargaIuranView`), tanpa mengubah
  skema role dan tanpa multi-role.
- **Aturan konfirmasi pembayaran IPL milik pengurus:**
  - Bendahara RT dikonfirmasi oleh **Ketua RT**.
  - Ketua RT dan Sekre RT dikonfirmasi oleh **Bendahara RT** masing-masing.
  - Pengurus RW (Ketua/Bendahara/Sekre RW) diperlakukan seperti warga biasa: dikonfirmasi oleh
    Bendahara RT di RT tempat rumahnya berada.
- **Gabung menu**: satu route `/dashboard/iuran`, pola tab seperti Data Warga
  (`db-section-toggle` di `frontend/src/app/dashboard/warga/page.jsx`).
  - Label menu "Pengelolaan IPL" untuk pengurus, "Tagihan IPL" untuk warga.

## Keputusan (dipilih user 22 Sep 2026)

Cara Ketua RT bisa mengonfirmasi pembayaran Bendahara RT: **Opsi 2**, permission baru
`ipl.konfirmasi_pengurus`.

- [ ] ~~Opsi 1 (simpel): beri Ketua RT `ipl.konfirmasi` scope AREA.~~ Tidak dipilih.
- [x] **Opsi 2 (dipilih):** permission baru `ipl.konfirmasi_pengurus`.
  - Pemegangnya hanya boleh mengonfirmasi pembayaran yang **pembayarnya berrole level < 3**
    (pakai `role.level`, bukan nama role), dan tidak boleh mengonfirmasi punya sendiri.
  - Bendahara RT memegang `ipl.konfirmasi` dan `ipl.konfirmasi_pengurus` (tetap tanpa
    konfirmasi punya sendiri). Ketua RT hanya `ipl.konfirmasi_pengurus`.
  - Notifikasi bukti baru: jika pembayar pengurus, kirim ke pemegang `ipl.konfirmasi_pengurus`
    di RT itu; jika warga biasa, tetap ke pemegang `ipl.konfirmasi`.
  - Aturan "tidak boleh konfirmasi milik sendiri" berlaku di dua jalur.

Prinsip yang tidak boleh dilanggar: **RBAC penuh di DB**. Jangan hardcode nama role
("BENDAHARA_RT", dsb.) di logika. Semua keputusan lewat permission + scope + `role.level`.

## Rancangan frontend

Satu halaman `/dashboard/iuran` dengan tab:

| Tab | Isi | Tampil jika |
|---|---|---|
| Tagihan Warga | `AdminIuranView` (generate, review bukti, rekap RT) | `scopeOf(u,"ipl.read")` bukan `"OWN"` |
| Setoran ke RW | isi `setoran/page.jsx` | `canAny(u, ["setoran.read","setoran.create"])` |
| Tagihan Saya | `WargaIuranView` | `can(u,"ipl.bayar")` **dan** punya rumah |

- Warga biasa: hanya satu tab tampil, jadi bar tab disembunyikan; tampilan sama seperti sekarang.
- Label menu di `frontend/src/lib/nav.js`: "Pengelolaan IPL" jika `scopeOf(u,"ipl.read")` bukan
  `"OWN"`, selain itu "Tagihan IPL". Berbasis permission, bukan `isWargaView`.
- `allow` menu Tagihan IPL: `canAny(u, ["ipl.read","ipl.bayar","setoran.read","setoran.create"])`.
- Hapus item nav "Setoran IPL". Halaman `/dashboard/setoran` diganti redirect ke
  `/dashboard/iuran?tab=setoran` (untuk bookmark lama; tidak ada notifikasi yang menautnya).
- Tab awal dibaca dari `?tab=` (`tagihan` | `setoran` | `saya`), default tab pertama yang tampil.
- Badge di tab (opsional): Setoran = jumlah tagihan siap disetor (RT) / setoran menunggu
  konfirmasi (RW); Tagihan Saya = titik merah bila ada tunggakan.
- **Pecah file dulu**: `iuran/page.jsx` sudah 1426 baris dan `setoran/page.jsx` 449 baris.
  Pindahkan `AdminIuranView`, `WargaIuranView`, dan isi setoran ke `frontend/src/components/ipl/`
  (pindah kode saja, logika tidak berubah). `page.jsx` hanya berisi tab + pemilihan view.
- Filter tiap tab berdiri sendiri (reset saat pindah tab), sama seperti Data Warga.
- Opsional: kartu "Tagihan saya bulan ini" di Beranda pengurus.

## Rancangan backend / RBAC

- `backend/prisma/rbac-data.ts`:
  - Beri `ipl.bayar` **scope OWN** ke KETUA_RW, BENDAHARA_RW, SEKRE_RW, KETUA_RT, BENDAHARA_RT,
    SEKRE_RT. Harus OWN: bila AREA, `uploadBuktiPembayaran` memakai `assertInArea` dan Pengurus RW
    (area `RW`) malah ditolak.
  - Tambahkan permission konfirmasi sesuai opsi yang dipilih (lihat di atas), termasuk
    deskripsi di `PERMISSIONS`.
- `backend/src/ipl/ipl.service.ts` (`konfirmasiPembayaran`, sekitar baris 428): tambah pengecekan
  konfirmator ≠ pembayar (`pembayaran.idUser !== ctx.user.sub`) dan, untuk Opsi 2, cek
  `role.level` pembayar. Pengecekan area yang ada (`assertInArea(ctx, rumah.rt)`) sudah cocok
  untuk kasus Pengurus RW: Bendahara RT berarea sama dengan `rumah.rt`.
- `WargaService.uploadBuktiPembayaran` sudah menolak rumah bukan milik sendiri untuk scope OWN;
  tidak perlu diubah selain penyesuaian notifikasi (Opsi 2).
- **Rumah milik sendiri selalu boleh dilihat, apa pun scope-nya.** Pengurus RT ber-scope AREA,
  sehingga pengurus RT 1 yang punya rumah lain di RT 3 tidak bisa melihat tagihan rumah RT 3-nya:
  `WargaService.getTagihanByRumah` (cabang non-OWN memakai `assertInArea(ctx, rumah.rt)`) dan
  `assertBolehLihatUser` menolaknya. Ubah agar `rumah.userId === ctx.user.sub` (atau
  `targetUserId === ctx.user.sub`) lolos di semua scope, sebelum cek area. Berlaku untuk
  `portal/rumah/:userId`, `portal/tagihan/user/:userId`, dan `portal/tagihan/:rumahId`.
  Pembayaran (`ipl.bayar` OWN) sudah aman karena mengecek pemilik rumah.
- Konfirmasi tagihan rumah RT 3 milik pengurus RT 1 tetap dikerjakan pengurus RT 3 (cek
  `assertInArea` memakai `rumah.rt`), jadi tidak perlu perubahan.
- Tab "Tagihan Saya" harus mendukung pemilihan rumah bila pengurus punya lebih dari satu rumah
  (`WargaIuranView` sudah memilih rumah; pastikan tetap begitu).
- **DB yang sudah berjalan tidak ikut berubah** karena `rbac-data.ts` hanya nilai awal seed.
  Sediakan cara memperbarui izin di DB (script upsert idempoten atau instruksi mengubah lewat
  menu Peran & Hak Akses) dan beri tahu user. Jangan reset DB sendiri.

## Kriteria selesai (uji manual per akun)

1. Ketua RT membayar IPL rumahnya lewat tab Tagihan Saya, status jadi Menunggu Konfirmasi,
   Bendahara RT bisa menerima/menolak, dan Ketua RT sendiri tidak bisa.
2. Bendahara RT membayar, hanya Ketua RT yang bisa mengonfirmasi (Bendahara tidak bisa
   mengonfirmasi miliknya).
3. Sekre RT membayar, Bendahara RT mengonfirmasi.
4. Ketua/Bendahara/Sekre RW membayar, Bendahara RT di RT rumahnya mengonfirmasi; Bendahara RT
   RT lain tidak bisa (terkena `assertInArea`).
5. Warga biasa: menu "Tagihan IPL", tanpa bar tab, tampilan sama seperti sebelumnya.
6. Sekre RT dan Sekre RW tidak melihat tab Setoran; Bendahara RT melihat tab Setoran dan
   pembayaran lunas milik pengurus ikut terhitung di "siap disetor".
7. `/dashboard/setoran` masuk ke tab Setoran; role baru buatan admin mendapat tab yang sesuai
   permission-nya tanpa mengubah kode.
8. Bendahara RT 1 yang punya rumah kedua di RT 3: tab Tagihan Saya menampilkan kedua rumah,
   dia bisa membayar keduanya; tagihan RT 1 dikonfirmasi Ketua RT 1, tagihan RT 3 dikonfirmasi
   Bendahara RT 3.
9. Frontend build dan backend build lolos, tidak ada regresi di halaman Data Warga dan Beranda.

## Sengaja tidak dikerjakan

- Multi-role per user (`user_role`).
- Akun ganda untuk satu orang.
- Item yang sudah ditunda di memori proyek (export Excel Pak Hambali, konten landing, dll.).

---

# Bagian 2 — Pengaduan: tujuan RW/RT, pengurus boleh mengadu, auto-teruskan 7 hari

**Status: selesai dikerjakan (22 Sep 2026).** Schema (`tujuan`, `diteruskanAt`,
`PENGADUAN_DITERUSKAN`), RBAC (`pengaduan.create_rw`/`create_rt`, scope RW read/respon jadi
AREA), service (`scopeWhere` berbasis `tujuan`, `getTujuanPilihan`, self-respond guard, job
`@Cron` auto-teruskan), dan frontend (tab Pengaduan Masuk/Saya, badge Tujuan, penanda
diteruskan, dropdown tujuan di form) sudah dikerjakan sesuai rancangan di bawah. Ditambah
dependency `@nestjs/schedule` (v5, cocok dengan Nest v11 yang dipakai project — bukan v4 seperti
kemungkinan versi default) — sudah di-`npm install`, sudah masuk `package.json`/lockfile.
`nest build` dan `next build` lolos.

Ditemukan sekaligus diperbaiki saat implementasi: `NotifikasiService.kirimKePermission` dengan
area `'RW'` punya shortcut "kirim ke SEMUA pemegang permission apa pun areanya" — kalau dipakai
apa adanya untuk pengaduan tujuan RW, notifikasinya bakal nyasar ke pengurus RT juga (persis bug
yang disebut di latar belakang di bawah). Ditambah method baru
`kirimKePermissionAreaPersis` (area selalu dicocokkan persis, termasuk RW) khusus dipakai
Pengaduan; `kirimKePermission` yang lama tidak diubah supaya Kegiatan/Pengumuman/Pengajuan tidak
kena regresi.

**User WAJIB menjalankan sebelum fitur ini kepakai di data yang sudah ada** (di folder `backend`):
1. `npx prisma migrate deploy` — menjalankan migration manual
   `prisma/migrations/20260922000000_add_pengaduan_tujuan/migration.sql` (ditulis tangan, bukan
   hasil `prisma migrate dev`, supaya bisa membackfill `tujuan` dari area pelapor sebelum kolom
   diwajibkan NOT NULL — aman untuk data yang sudah ada, sudah dicek strukturnya cocok dengan
   tabel `tb_pengaduan`/`tb_notifikasi` yang sebenarnya ada di DB lokal).
2. `npx prisma db seed` — sama seperti Bagian 1, upsert permission baru + menghapus
   `pengaduan.create` lama dari matriks (lihat perubahan di `seed.ts`, aman/idempotent).

**Sengaja tidak dikerjakan** (di luar cakupan minimum): badge/indikator jumlah pengaduan yang
akan segera lewat 7 hari (belum ditanggapi), dan endpoint manual "teruskan sekarang" oleh
pengurus RT (memang di luar cakupan Bagian 2, lihat "Sengaja tidak dikerjakan" di bawah).

## Latar belakang (kondisi kode sekarang)

- `tb_Pengaduan` tidak punya kolom tujuan. Visibilitas diturunkan dari `pelapor.area`
  (`PengaduanService.scopeWhere`, `backend/src/pengaduan/pengaduan.service.ts:26`).
- Role RW memegang `pengaduan.read`/`respon` scope **ALL**, jadi pengurus RW melihat semua
  pengaduan termasuk yang ditujukan ke RT.
- `pengaduan.create` hanya dipegang role WARGA, jadi pengurus tidak bisa mengadu.
- Halaman `frontend/src/app/dashboard/pengaduan/page.jsx` memilih tampilan lewat
  `isWargaView(user)`: pengurus hanya dapat `AdminPengaduanView` (masalah yang sama dengan
  Tagihan IPL di Bagian 1).
- `NotifikasiService.kirimKePermission` menganggap area `RW` sebagai "semua pemegang permission"
  (`seluruhRw`), sehingga notifikasi pengaduan ke RW ikut nyasar ke Ketua RT.
- Backend belum punya scheduler (tidak ada `@nestjs/schedule`, tidak ada `@Cron`).

## Aturan yang disetujui user

**Tujuan pengaduan** hanya dua: `RW` atau salah satu RT.

| Pelapor | Boleh mengadu ke |
|---|---|
| Warga | RW, atau RT mana pun tempat rumahnya berada (lihat contoh di bawah tabel) |
| Pengurus RT (Ketua/Bendahara/Sekre RT) | **RW**; plus RT lain tempat rumahnya berada bila ada (bukan RT tempat jabatannya) |
| Pengurus RW (Ketua/Bendahara/Sekre RW) | **RT tempat rumahnya berada** (sebagai warga RT itu); tidak ke RW |

**Pilihan tujuan selalu mengikuti rumah yang dimiliki pelapor.** Contoh: warga yang punya rumah di
RT 1 dan RT 3 punya **3 pilihan**: `RW`, `RT 1`, `RT 3`. Warga yang rumahnya hanya di RT 1 punya 2
pilihan: `RW`, `RT 1`. RT di luar rumah pelapor ditolak backend.

**Pengecualian untuk pengurus (keputusan user: opsi Y):** pengurus tidak boleh mengadu ke RT
tempat dia menjabat, karena pengaduannya jatuh ke dirinya sendiri.

- Ketua RT 1 yang rumahnya hanya di RT 1: pilihan `RW` saja.
- Ketua RT 1 yang punya rumah di RT 1 dan RT 3: pilihan `RW` dan `RT 3` (RT 1 dibuang).
  Di RT 3 dia hanya warga biasa.
- Pengurus RW yang rumahnya di RT 2: pilihan `RT 2` saja (bila rumahnya di dua RT, keduanya).
  `RW` tidak ditawarkan.
- Bendahara/Sekre RT tidak boleh mengadu ke RT jabatannya sendiri (tidak ke Ketua RT-nya lewat
  jalur ini); aturan ini sama dengan Ketua RT.

**Siapa yang melihat:**

- Tujuan RW: hanya pengurus RW. Pengurus RT tidak bisa melihat.
- Tujuan RT tertentu (mis. RT 1): hanya pengurus RT itu (RW dan RT lain tidak melihat),
  kecuali sudah diteruskan otomatis (lihat bawah).
- Pelapor **selalu** bisa melihat pengaduan miliknya sendiri, apa pun rolenya.

**Auto-teruskan:** pengaduan ke RT yang **tidak ditanggapi pengurus RT dalam 7 hari** otomatis
diteruskan ke pengurus RW, dan data pengaduannya diberi **pemberitahuan/penanda** bahwa pengaduan
ini tidak ditanggapi pengurus RT.

## Asumsi (diterima user sebagai default pada 21 Sep 2026; ubah bila keliru)

1. "Ditanggapi" = status keluar dari `MENUNGGU` (menjadi `DIPROSES`, `SELESAI`, atau `DITOLAK`).
2. 7 hari kalender dihitung dari `createdAt`.
3. Setelah diteruskan, pengurus RT **tetap** bisa melihat dan menanggapi; pengurus RW ikut melihat
   dan bisa menanggapi. Siapa pun yang menanggapi lebih dulu mengubah status.
4. Pengaduan ke RW tidak diteruskan ke mana pun (sudah di tingkat tertinggi).
5. Pelapor tidak boleh menanggapi pengaduannya sendiri (mis. Ketua RW mengadu ke RT lalu
   pengaduannya diteruskan ke RW: dia tidak boleh menanggapi punyanya).

## Rancangan backend

### Schema (`backend/prisma/schema.prisma`) + migration

- `Pengaduan.tujuan Area` (wajib; nilainya `RW` atau `RT_01..RT_04`).
- `Pengaduan.diteruskanAt DateTime?` (cap waktu auto-teruskan; `null` = belum diteruskan).
- Index: `@@index([tujuan, status])`, `@@index([status, createdAt])`.
- Backfill data lama di migration: `tujuan` = `pelapor.area` bila RT, selain itu `RW`.
- Tambah `PENGADUAN_DITERUSKAN` ke enum `TipeNotifikasi`.

### Permission (RBAC penuh di DB, jangan hardcode nama role)

Pecah `pengaduan.create` menjadi dua permission agar tujuan yang boleh dipilih diatur admin lewat
menu Peran & Hak Akses, bukan dikunci ke nama role:

- `pengaduan.create_rw`: "Buat pengaduan ke RW"
- `pengaduan.create_rt`: "Buat pengaduan ke RT"

Perubahan di `backend/prisma/rbac-data.ts` (nilai awal seed):

- WARGA: `create_rw` OWN, `create_rt` OWN, `read` OWN (tetap).
- KETUA_RT, BENDAHARA_RT, SEKRE_RT: tambah `create_rw` OWN (hanya ke RW).
- KETUA_RW, BENDAHARA_RW, SEKRE_RW: tambah `create_rt` OWN.
- KETUA_RW, SEKRE_RW: `pengaduan.read` dan `pengaduan.respon` dari **ALL** menjadi **AREA**.
  BENDAHARA_RW: `pengaduan.read` dari ALL menjadi AREA. Bila tetap ALL, mereka melihat pengaduan
  ke RT dan itu melanggar aturan. Pola ini sama dengan Catatan Rapat (area `RW`).
- Hapus `pengaduan.create` lama dari `PERMISSIONS` dan matriks. Endpoint create memeriksa "punya
  salah satu dari `create_rw`/`create_rt`" dan tujuan yang dipilih harus sesuai permission-nya
  (guard `RequirePermission` hanya menerima satu permission, jadi pengecekan tujuan dilakukan di
  service lewat `PermissionsService.scopeOf`).
- DB yang sudah berjalan **tidak ikut berubah**: sediakan script update izin yang idempoten
  (sekaligus menghapus `pengaduan.create` lama dari role yang memakainya), atau beri tahu user
  cara mengubahnya lewat menu. Jangan reset DB sendiri.

### Membuat pengaduan (`PengaduanService.create`)

- Terima `tujuan` (`RW` | `RT_0x`). Validasi:
  - `RW` butuh `pengaduan.create_rw`; RT butuh `pengaduan.create_rt`.
  - Untuk RT: nilainya harus salah satu RT dari **rumah miliknya**
    (`Rumah.userId = pelapor`, `isDelete = false`). Bila tidak punya rumah, jatuh ke `user.area`
    (hanya bila area itu RT); bila tetap tidak ada, tolak dengan pesan jelas.
  - Pengurus RW yang mengadu ke RT harus ke RT tempat rumahnya (area akunnya `RW`, jadi jangan
    memakai `user.area`).
  - Pengurus (`role.level < 3`) tidak boleh memilih RT yang sama dengan area jabatannya
    (`user.area`). Pakai `role.level`, bukan nama role. Endpoint yang menyediakan daftar
    pilihan tujuan untuk form (mis. `GET /pengaduan/tujuan`) harus memakai aturan yang sama
    dengan validasi ini, supaya form dan backend tidak berbeda.
- Simpan `tujuan`. Kirim notifikasi hanya ke pemegang `pengaduan.respon` di area tepat itu.

### Filter visibilitas (satu fungsi untuk list, detail, foto, tanggapi, hapus)

Ganti `scopeWhere` menjadi:

- `OWN`: `{ idUser: self }`.
- `AREA` selain area RW: `OR [{ tujuan: area }, { idUser: self }]`.
- `AREA` area `RW`: `OR [{ tujuan: 'RW' }, { diteruskanAt: { not: null } }, { idUser: self }]`.
- `ALL`: tanpa batasan (dipertahankan untuk role bikinan admin).

Pastikan endpoint detail dan tanggapi memakai filter yang sama (jangan hanya list), dan tambah
cek pelapor ≠ penanggap di `tanggapi`.

### Notifikasi (`notifikasi.service.ts`)

`kirimKePermission` dengan area `RW` mengirim ke semua pemegang permission. Untuk pengaduan buat
varian yang mencocokkan area **persis** (`area = tujuan`, ditambah pemegang scope ALL), tanpa
shortcut `seluruhRw`. Jangan mengubah perilaku lama fungsi ini untuk fitur lain tanpa menguji
Kegiatan, Pengumuman, dan Pengajuan.

### Auto-teruskan 7 hari

- Tambah dependency `@nestjs/schedule` dan `ScheduleModule.forRoot()` di `app.module.ts`
  (satu-satunya dependency baru di bagian ini; sudah disetujui user, tetap sebutkan di
  CHANGELOG agar `npm install` tidak terlewat).
- Konstanta tunggal `HARI_BATAS_TANGGAPAN = 7`.
- Job harian (mis. 01:00) di `PengaduanService`: cari pengaduan
  `tujuan != 'RW' AND status = 'MENUNGGU' AND diteruskanAt IS NULL AND isDelete = false AND
  createdAt <= now - 7 hari`; set `diteruskanAt = now`; kirim notifikasi `PENGADUAN_DITERUSKAN`
  ke pemegang `pengaduan.respon` di area RW, ke pengurus RT tujuan (info), dan ke pelapor.
- Idempotent: karena hanya memproses baris `diteruskanAt IS NULL`, job yang terlewat (backend
  mati) otomatis terkejar pada jalan berikutnya. Panggil juga sekali saat aplikasi start.
- Job hanya jalan selama proses backend hidup. Catat di README/CHANGELOG.

## Rancangan frontend

- `pengaduan/page.jsx`: ganti `isWargaView` dengan tab berbasis permission (pola sama seperti
  Bagian 1):
  - **Pengaduan Masuk** (`AdminPengaduanView`): tampil jika `scopeOf(u,"pengaduan.read")` bukan
    `"OWN"`.
  - **Pengaduan Saya** (`WargaPengaduanView`): tampil jika `can(u,"pengaduan.create_rw")` atau
    `can(u,"pengaduan.create_rt")` atau `scopeOf(u,"pengaduan.read") === "OWN"`.
  - Jika hanya satu tab tampil, sembunyikan bar tab (warga biasa tampil seperti sekarang).
- Form buat pengaduan: pilihan tujuan dibangun dari permission (radio "RW" / "RT saya"). Bila
  hanya satu pilihan, tampil sebagai teks tetap. Bila rumah pelapor di lebih dari satu RT,
  tampilkan dropdown RT.
- Badge **Tujuan** (RW / RT 1) di daftar dan detail.
- Penanda auto-teruskan di daftar dan detail (untuk RW, RT, dan pelapor): "Diteruskan ke RW:
  belum ditanggapi pengurus RT sejak {tanggal}" (turunan dari `diteruskanAt`).
- `frontend/src/lib/nav.js`: `allow` menu Pengaduan menjadi
  `canAny(u, ["pengaduan.read","pengaduan.create_rw","pengaduan.create_rt"])`.
- Sesuaikan tipe/ikon notifikasi untuk `PENGADUAN_DITERUSKAN` bila komponen lonceng memetakan
  tipe.

## Kriteria selesai (uji manual per akun)

1. Warga RT 1 mengadu ke RW: muncul di Pengaduan Masuk pengurus RW; **tidak** muncul di pengurus
   RT 1 maupun RT lain. Notifikasi tidak sampai ke Ketua RT.
2. Warga RT 1 mengadu ke RT: muncul di pengurus RT 1 saja; tidak di RW, tidak di RT 2-4.
3. Ketua RT 1 dengan rumah hanya di RT 1 melihat pilihan "RW" saja; pengaduannya muncul di
   pengurus RW dan di tab "Pengaduan Saya"-nya sendiri, bukan di pengurus RT lain.
   Bila dia punya rumah juga di RT 3, pilihannya "RW" dan "RT 3" (tanpa RT 1); memaksa
   `tujuan = RT_01` lewat API ditolak.
4. Pengurus RW hanya melihat pilihan "RT" (RT rumahnya); pengaduannya muncul di pengurus RT itu
   dan di "Pengaduan Saya"-nya.
5. Warga dengan rumah di RT 1 dan RT 3 melihat 3 pilihan (RW, RT 1, RT 3) dan pengaduan ke
   masing-masing muncul hanya di pengurus tujuannya. Memaksa `tujuan = RT_02` lewat API
   ditolak backend karena RT 2 bukan RT rumahnya.
6. Pengaduan ke RT berstatus `MENUNGGU` berumur > 7 hari: setelah job jalan, `diteruskanAt`
   terisi, muncul di pengurus RW dengan penanda, notifikasi terkirim; RT masih melihatnya.
   Pengaduan yang sudah `DIPROSES` sebelum 7 hari tidak diteruskan.
7. Menjalankan job dua kali tidak menggandakan notifikasi.
8. Panggilan API langsung (mis. `GET /pengaduan/:id` dengan akun RT lain) mengembalikan
   403/404, bukan datanya.
9. Kegiatan, Pengumuman, dan Pengajuan tetap mengirim notifikasi seperti sebelumnya (tidak
   regresi karena perubahan di `NotifikasiService`).

## Sengaja tidak dikerjakan

- Meneruskan pengaduan secara manual oleh pengurus RT ke RW (di luar auto-teruskan 7 hari).
- Eskalasi bertingkat lebih dari RT → RW.
- Notifikasi WhatsApp/email.
- Pemilik vs penghuni rumah (ditunda di memori proyek). Untuk saat ini "RT-nya" = RT dari rumah
  yang `userId`-nya pelapor.

---

# Bagian 3 — Registrasi mandiri warga (self-register)

**Status: selesai dikerjakan (22 Sep 2026).** Schema (`tb_PendaftaranWarga` baru,
`PENDAFTARAN_BARU`), RBAC (`warga.approve_registrasi` AREA untuk Ketua/Sekre RT), service
(`getRumahKosong`, `daftarMandiri`, `getPendaftaran`, `setujuiPendaftaran`,
`tolakPendaftaran` di `WargaService`; dua endpoint publik `@Public()` di `WargaController`),
dan frontend (`/register` + `/register/account-info` dipulihkan & disesuaikan dari
`origin/register`, tab "Pendaftaran Masuk" di halaman Data Warga, link "Daftar di sini" di
halaman login) sudah dikerjakan sesuai Opsi B (perlu persetujuan) dan keputusan lain yang
dipilih 22 Sep 2026. `nest build` dan `next build` lolos.

Beberapa penyesuaian teknis dari rancangan awal (fungsinya tetap sama):
- Endpoint publik ditaruh di `WargaController` (route `/warga/daftar`, `/warga/rumah-kosong`)
  memakai `@Public()`, bukan di `AuthController` — supaya tidak perlu impor silang
  `AuthModule ↔ WargaModule` (keduanya sudah saling terhubung lewat `AuthModule` yang
  `@Global()`, menambah `WargaModule` sebagai dependency `AuthModule` cuma buat 2 endpoint
  akan bikin siklus modul yang tidak perlu).
- Tidak ada notifikasi ke pendaftar saat disetujui/ditolak: sebelum disetujui, pendaftar belum
  punya baris `tb_User` sehingga tidak ada penerima yang valid untuk `tb_Notifikasi` (FK ke
  `idUser`), dan project belum punya infra email/SMS. Pendaftar cukup diberi tahu di layar
  setelah submit ("menunggu persetujuan"); status berikutnya disampaikan pengurus RT secara
  manual (WhatsApp dsb.), sama seperti proses pembuatan akun manual sekarang.
- Tab "Pendaftaran Masuk" digabung ke halaman Data Warga yang sudah ada (bukan menu baru),
  sesuai saran di rancangan asli.

**User WAJIB menjalankan (di folder `backend`, urutan sama seperti Bagian 1 & 2):**
1. `npx prisma migrate deploy` — sekarang menjalankan 2 migration baru sekaligus (Bagian 2 dan
   `20260922010000_add_pendaftaran_warga` punya Bagian 3 ini: tabel `tb_PendaftaranWarga` +
   enum notifikasi `PENDAFTARAN_BARU`). Tabel baru, tanpa backfill, aman untuk data yang sudah
   ada.
2. `npx prisma db seed` — upsert permission `warga.approve_registrasi` ke Ketua RT & Sekre RT.

**Sengaja tidak dikerjakan** (selain yang sudah tertulis di bagian "Sengaja tidak dikerjakan"
di bawah): opsi "blok belum ada di daftar" (tidak dipilih — user pilih dropdown dari Rumah
KOSONG saja), halaman status pendaftaran untuk pendaftar (tidak ada akun untuk login sebelum
disetujui, jadi tidak ada tempat menampilkannya).

## Latar belakang

Sekarang akun warga hanya dibuat pengurus RT lewat menu Data Warga (`WargaFormModal`,
`POST /warga` dengan `@RequirePermission('warga','create')`). Warga sendiri tidak bisa daftar
akun. User minta fitur supaya warga bisa mendaftar sendiri, dan UI-nya **dipakai lagi dari UI
registrasi yang lama**.

UI lama itu ditemukan di branch `origin/register` (branch lama, dari sebelum restrukturisasi
RBAC/skema sekarang — bukan cabang dari `ojan`). Isinya alur 2 langkah dengan stepper:

1. `frontend/src/app/register/page.jsx` — **Personal Data**: Full Name, Phone Number, RT
   (dropdown RT 01–04), Blok Rumah (teks bebas). Tombol Next simpan sementara ke
   `sessionStorage` lalu pindah ke langkah 2. Tombol Back menampilkan konfirmasi batal.
2. `frontend/src/app/register/account-info/page.jsx` — **Account Info**: Email, Password,
   Confirm Password. Tombol Finish menggabung data langkah 1 + 2, lalu `POST` langsung ke
   `http://localhost:3000/warga` (fetch manual, bukan `lib/api.js`, tanpa token), lalu redirect
   ke halaman login setelah sukses.
3. `frontend/src/components/auth/RegisterStepper.jsx` — indikator 2 langkah ("Personal Data" /
   "Account Info").
4. Keduanya dibungkus `AuthShell` (logo kiri + judul "Create Account" kanan) — komponen ini
   **masih ada** di codebase sekarang (`frontend/src/components/auth/AuthShell.jsx`, dipakai
   `login/page.jsx`), jadi tidak perlu dipulihkan.
5. CSS pendukungnya (`.auth-container`, `.auth-card`, `.register-content-split`, `.stepper-box`,
   `.form-box`, `.form-box-header`, `.form-box-body`, termasuk versi responsive-nya) **masih ada**
   di `frontend/src/app/globals.css` (sekitar baris 102–360 dan 2317–2360). Jadi tampilannya bisa
   dipakai lagi tanpa menulis ulang CSS — cukup pulihkan komponen halaman + sesuaikan logikanya.

**Yang tidak bisa dipakai apa adanya (skema & RBAC sudah berubah sejak branch itu dibuat):**

- `POST /warga` sekarang wajib permission `warga.create` (lihat
  `backend/src/warga/warga.controller.ts:31-32`) — dipanggil tanpa token dari form publik akan
  kena 401/403. Perlu endpoint baru yang memang publik (tanpa `RequirePermission`/JWT).
- `Rumah` sekarang adalah katalog yang sudah ada duluan, bukan dibuat bebas dari form:
  `@@unique([rt, blokRumah])` di `schema.prisma:206-226`, dengan `status` (`KOSONG`/terisi) dan
  relasi `userId` ke penghuni. Field "Blok Rumah" teks bebas di form lama akan tabrakan dengan
  constraint ini atau membuat blok siluman yang tidak match data RT/RW yang sebenarnya.
- Login sekarang pakai `username` (default diisi no HP), bukan email — lihat
  `schema.prisma:183` (`// login pakai username (default diisi no HP)`) dan komentar di
  `login/page.jsx:23`. Form lama cuma mengumpulkan email untuk akun, tidak eksplisit mengisi
  username. `email` sekarang opsional (`schema.prisma:184`).
- Warga yang dibuat pengurus lewat `WargaFormModal` melalui proses pengurus pilih rumah yang
  memang kosong dan tervalidasi; belum ada jalur "warga mendaftar sendiri lalu diverifikasi",
  jadi perlu diputuskan alurnya (lihat keputusan terbuka di bawah).

## Keputusan (dipilih/ditetapkan 22 Sep 2026)

1. **Alur setelah submit: Opsi B — perlu persetujuan pengurus RT.** Pendaftaran masuk status
   **Menunggu Persetujuan**. Pengurus RT di RT yang dipilih dapat notifikasi, buka daftar
   pendaftaran masuk, lalu Setuju (akun WARGA aktif + terhubung ke Rumah) atau Tolak (dengan
   alasan). Warga baru bisa login setelah disetujui.
   - Disimpan di **tabel terpisah `tb_PendaftaranWarga`** (bukan baris `tb_User` berstatus
     PENDING) — lebih bersih untuk audit, tidak perlu kolom status tambahan yang mempengaruhi
     query user lain. `tb_User` baru dibuat saat disetujui.
2. **Pemilihan rumah: dropdown dari `Rumah` berstatus `KOSONG`.** RT dipilih dulu, lalu dropdown
   Blok Rumah yang datanya sudah ada & belum ada penghuni. Tidak ada jalur teks bebas untuk blok
   yang belum terdaftar (kalau blok memang belum ada di data `Rumah`, itu ditangani lewat menu
   Data Warga oleh pengurus seperti sekarang, di luar cakupan form register).
3. **Username akun baru**: otomatis diisi dari nomor HP (konsisten dengan akun buatan pengurus),
   email tetap opsional. Aturan format/duplikasi nomor HP sama dengan `WargaFormModal` sekarang.
4. **Verifikasi kontak**: cukup validasi format + cek duplikat (tanpa OTP SMS/email — belum ada
   infra pengirim OTP di project ini, jangan tambah dependency baru untuk ini tanpa persetujuan
   user terpisah).
5. **Siapa yang approve**: permission baru `warga.approve_registrasi` scope `AREA`, diberi ke
   role yang sudah punya `warga.create` AREA sekarang yaitu **KETUA_RT** dan **SEKRE_RT** (lihat
   `rbac-data.ts` baris 137-175), supaya konsisten dengan **RBAC penuh di DB** — jangan hardcode
   nama role di logika, hanya di seed `rbac-data.ts`.

Prinsip yang tidak boleh dilanggar (sama seperti Bagian 1 & 2): **RBAC penuh di DB**, jangan
hardcode nama role di logika keputusan.

## Rancangan frontend (menunggu keputusan di atas, kerangka UI sudah jelas)

- Pulihkan `frontend/src/app/register/page.jsx`,
  `frontend/src/app/register/account-info/page.jsx`, dan
  `frontend/src/components/auth/RegisterStepper.jsx` dari `origin/register`
  (`git show origin/register:<path>`), lalu sesuaikan:
  - Ganti field "Blok Rumah" teks bebas menjadi dropdown terikat pilihan RT (hasil keputusan
    #2 di atas).
  - Ganti pemanggilan `fetch("http://localhost:3000/warga", ...)` manual jadi lewat
    `frontend/src/lib/api.js` (base URL terpusat, konsisten dengan bagian lain aplikasi) ke
    endpoint publik baru (bukan `POST /warga` yang butuh permission).
  - Tombol Back di langkah 1 mengarah ke landing page (`router.push("/")` sudah benar, tapi cek
    landing page sekarang masih di `/landingpage` atau tetap `/`).
  - Tambah link "Sudah punya akun? Masuk" ke `/login` (belum ada di versi lama, wajar karena
    dulu route login mungkin beda).
  - Kalau Opsi B (perlu persetujuan): halaman Finish menampilkan pesan "Menunggu persetujuan
    pengurus RT", bukan langsung "berhasil, silakan login".
- Tambah link "Daftar akun" di `frontend/src/app/login/page.jsx` mengarah ke `/register` (form
  lama tidak dilink dari mana pun setelah dihapus).
- Kalau Opsi B: halaman baru untuk pengurus RT melihat & menyetujui/menolak pendaftaran masuk
  (lokasi disarankan gabung ke tab yang sudah ada di menu Data Warga, pola tab sama seperti
  Bagian 1, bukan menu terpisah baru) + badge jumlah pending.
- Assets SVG yang ikut terhapus bareng branch lama (`RT1.svg`, `RT2.svg`, `bendahara.svg`, dll,
  lihat `git show origin/register:frontend/src/assets/`) **tidak perlu dipulihkan** kecuali
  dipakai di halaman register — dari isi 2 halaman di atas, assets itu tidak dipakai (cuma
  `/LogoTopaz.svg` yang dipakai, dan itu sudah ada di `public/` sekarang).

## Rancangan backend (menunggu keputusan di atas)

- Endpoint publik baru, mis. `POST /auth/register` (di `backend/src/auth/`, bukan
  `backend/src/warga/`, supaya jelas ini jalur tanpa autentikasi) — **tanpa**
  `@RequirePermission`. Beri rate-limit sederhana per IP kalau ada infra untuk itu di project ini
  (cek apakah sudah ada `@nestjs/throttler` atau sejenis; kalau belum ada, catat sebagai risiko,
  jangan tambah dependency baru tanpa persetujuan user — sama seperti aturan `@nestjs/schedule`
  di Bagian 2).
- Validasi di service: RT ada, blok ada & `status = KOSONG` di RT itu (atau jalur teks bebas dari
  keputusan #2), nomor HP & email (kalau diisi) belum dipakai user lain, password memenuhi
  aturan yang sama dengan buat user oleh pengurus.
- Kalau Opsi B: buat baris pending (tabel `tb_PendaftaranWarga` atau `tb_User` status `PENDING`
  sesuai keputusan #1), kirim notifikasi ke pemegang `warga.approve_registrasi` di RT itu
  (pola sama seperti `NotifikasiService.kirimKePermission` yang sudah dipakai fitur lain).
  Endpoint approve/tolak baru: set jadi `tb_User` aktif role `WARGA` + hubungkan ke `Rumah`
  (`status` jadi TERISI, `userId` diisi), atau hapus baris pending kalau ditolak.
- Kalau Opsi A: langsung buat `tb_User` role `WARGA` + hubungkan `Rumah` dalam satu transaksi
  (pola sama seperti `WargaService.create` yang sudah ada), tanpa status pending.
- Hash password dengan cara yang sama dengan `WargaService`/`AuthService` yang sudah ada (jangan
  buat implementasi hashing baru).
- **DB tidak diubah sendiri**: kalau butuh kolom/tabel baru (status pending, dll), tulis migration
  tapi jangan dijalankan ke DB user — beri tahu user cara menjalankannya sesuai
  [[reference-db-lokal-xampp]].

## Kriteria selesai (uji manual, tergantung opsi yang dipilih)

1. Warga baru bisa isi form 2 langkah, pilih RT + blok yang valid & kosong, dan berhasil daftar.
2. Blok yang sudah terisi/tidak ada tidak bisa dipilih (dropdown) atau ditolak backend (kalau
   jalur teks bebas).
3. Nomor HP/email yang sudah dipakai user lain ditolak dengan pesan jelas (409, bukan 500).
4. (Opsi B) Pengurus RT terkait dapat notifikasi pendaftaran baru, bisa menyetujui/menolak;
   pengurus RT lain tidak melihat pendaftaran RT lain.
5. Setelah disetujui (atau langsung, kalau Opsi A), warga bisa login pakai username (no HP) yang
   otomatis terbentuk, dan rumahnya muncul benar di tab Tagihan-nya.
6. Form register tidak bisa dipakai untuk membuat akun pengurus (role selalu WARGA, tidak
   dikirim dari frontend / diabaikan backend kalau dikirim).
7. Frontend build dan backend build lolos.

## Sengaja tidak dikerjakan

- Verifikasi OTP SMS/email (perlu keputusan #4 dulu; kalau mau, ini pekerjaan terpisah karena
  butuh integrasi pengirim pesan).
- Lupa password mandiri (belum ada di lingkup ini; sekarang reset password lewat pengurus,
  `warga.reset_password`).
- Login pakai Google/OAuth pihak ketiga.
- Multi-role / akun ganda satu orang (tetap sama seperti catatan di Bagian 1).

---

# Bagian 4 — Dokumen BAST + rincian harga per fitur (non-kode)

**Status: menunggu sinyal user.** Jangan mulai bagian ini sampai user bilang eksplisit
"kerjakan dokumen BAST" (atau kalimat sejenis) — dicatat di sini 22 Sep 2026 waktu obrolan
harga, bukan perintah mulai sekarang.

## Latar belakang

Sistem ini dibuat untuk RW 21 Topaz (bukan produk dijual umum). User sudah kasih tahu RW &
bendahara: ada biaya hosting (sewa VPS + domain) ±2 juta/tahun, ditanggung terpisah dari biaya
jasa pengembangan sistem. Untuk jasa sistemnya, user & aku diskusi angka **Rp 7.000.000** sebagai
harga yang wajar (di tengah range 5-15jt yang aku kasih sebagai patokan, mengingat kompleksitas
RBAC + IPL + pengaduan + kegiatan, tapi sistem belum 100% selesai — Bagian 1-3 di file ini masih
belum dikerjakan per tanggal ini).

Keputusan yang belum diambil user waktu diskusi (tanyakan ulang saat mulai bagian ini kalau
belum ada jawaban): apakah Rp 7jt itu untuk scope yang **sudah jalan sekarang** saja (data warga,
tagihan/setoran dasar, pengumuman, kegiatan, catatan rapat, login RBAC), dengan Bagian 1-3
dihitung sebagai pekerjaan tambahan terpisah nanti — atau **all-in** termasuk Bagian 1-3 yang
belum selesai.

## Yang perlu dikerjakan saat sinyal diberikan

1. **Rincian harga per fitur** — pecah Rp 7.000.000 (atau angka final yang disepakati saat itu,
   tanyakan ulang ke user, jangan asumsikan masih 7jt kalau sudah lama berlalu) ke daftar fitur
   yang sudah berjalan di aplikasi (bisa disurvei dari menu yang ada: Data Warga, Tagihan/Setoran
   IPL, Pengaduan, Kegiatan, Pengumuman, Catatan Rapat, RBAC/Peran & Hak Akses, Beranda/dashboard,
   dsb). Cara pecahnya bisa proporsional ke kompleksitas tiap modul (RBAC & IPL lebih besar
   porsinya daripada Pengumuman, misalnya), bukan dibagi rata.
2. **Dokumen BAST (Berita Acara Serah Tanda Terima)** — dokumen serah terima sistem dari
   developer (user) ke pihak RW, isinya standar BAST: pihak yang menyerahkan & menerima, tanggal,
   daftar yang diserahkan (aplikasi + source code / hosting akses, sesuai kesepakatan), nilai
   pekerjaan, dan tanda tangan kedua pihak.
3. Tanyakan ke user sebelum menyusun: siapa nama pihak yang menandatangani (Ketua RW /
   Bendahara), apakah source code ikut diserahkan atau hanya hak pakai, dan format keluaran yang
   diinginkan (dokumen ini kemungkinan lebih cocok dipublikasikan sebagai Artifact/dokumen,
   bukan file kode di repo — bukan bagian dari codebase aplikasi).

## Sengaja tidak dikerjakan (sampai ada sinyal)

- Menyusun draft BAST atau rincian harga sekarang. Ini murni catatan rencana.
