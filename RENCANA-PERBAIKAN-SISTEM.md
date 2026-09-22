# Rencana Perbaikan Sistem

Status: **belum dikerjakan** (hasil brainstorming 21 Sep 2026). File ini dipakai sebagai perintah
kerja. Jangan ubah kode di luar cakupan di bawah, dan jangan menjalankan reset/seed DB sendiri:
minta user yang menjalankannya.

Isi:

1. **Bagian 1**: menu Pengelolaan IPL + Tagihan Saya untuk pengurus (gabung Tagihan & Setoran).
2. **Bagian 2**: Pengaduan dengan tujuan RW/RT, pengurus boleh mengadu, auto-teruskan 7 hari.

Kedua bagian bisa dikerjakan terpisah. Keduanya sama-sama memakai pola "tab Saya" untuk pengurus
dan sama-sama mengubah matriks permission di `rbac-data.ts`, jadi kerjakan berurutan agar tidak
bentrok.

---

# Bagian 1 — Menu "Pengelolaan IPL" + Tagihan Saya untuk pengurus

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

## Keputusan yang masih terbuka (pilih satu sebelum mulai)

Cara Ketua RT bisa mengonfirmasi pembayaran Bendahara RT:

- [ ] **Opsi 1 (simpel):** beri Ketua RT `ipl.konfirmasi` scope AREA. Tambah aturan umum di
  `IplService.konfirmasiPembayaran`: konfirmator tidak boleh sama dengan pembayar.
  Kekurangan: Ketua RT ikut bisa mengonfirmasi bayar warga biasa. Notifikasi "Bukti Pembayaran
  Baru" juga ikut masuk ke Ketua RT untuk semua warga, karena
  `WargaService.uploadBuktiPembayaran` memanggil `kirimKePermission('ipl.konfirmasi', ...)`.
- [ ] **Opsi 2 (disarankan):** permission baru `ipl.konfirmasi_pengurus`.
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
