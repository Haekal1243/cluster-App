# Rencana Perbaikan Keamanan (Cyber Security)

Status: **item #1–#6 sudah dikerjakan** (23 Sep 2026) — lihat catatan implementasi di bagian
"Prioritas pengerjaan" di bawah. Item #7 (cookie httpOnly) dan #8 (password policy) sengaja
belum dikerjakan karena eksplisit ditandai opsional/effort besar. Sumber: audit read-only
auth/RBAC backend (23 Sep 2026) + pengecekan lanjutan token storage & validasi input.

Kesimpulan umum: fondasi auth & RBAC-nya sudah rapi (bcrypt, role/permission direfetch dari DB
tiap request, scope OWN/AREA/ALL diterapkan konsisten di query Prisma lewat `assertInArea`/
`scopeWhere`, tidak ada raw query rawan SQL injection, `.env` tidak ke-commit). Sistem ini
**tidak gampang ditembus** untuk skala aplikasi cluster perumahan. Temuan di bawah sifatnya
hardening standar, bukan lubang fundamental.

## Temuan audit pertama (auth & RBAC)

1. **[SEDANG] Tidak ada rate limiting di login & registrasi mandiri**
   - File: `backend/src/auth/auth.controller.ts:38`, `backend/src/warga/warga.controller.ts:159`
   - Dampak: brute-force password tanpa batas percobaan; spam registrasi bisa membanjiri
     antrean persetujuan RT.
   - Saran: pasang `@nestjs/throttler`, batasi ±5x/menit per IP di dua endpoint ini minimal.

2. **[SEDANG] File bukti finansial diserve statis tanpa cek permission**
   - File: `backend/src/main.ts:29` (folder `uploads/bukti-bayar`, bukti setoran, bukti kas,
     pengumuman) — beda dengan `catatan-rapat` yang sudah diblok dan diserve lewat endpoint
     terautentikasi (`main.ts:24-26`).
   - Dampak: kalau link file bocor (misal share link chat), siapa saja bisa buka foto bukti
     transfer tanpa login. Nama file sudah random (`Date.now()-random9digit.ext`) tapi itu bukan
     kontrol akses.
   - Saran: samain pola dengan `catatan-rapat` — serve lewat endpoint yang cek scope user.

3. **[RENDAH] Belum ada `helmet()`, CORS tanpa whitelist origin**
   - File: `backend/src/main.ts:13`
   - Dampak: risiko CSRF rendah (auth pakai Bearer token, bukan cookie) tapi kurang
     best-practice untuk production.
   - Saran: tambah `helmet()`, whitelist origin frontend di `enableCors`.

## Temuan lanjutan (kategori serangan lain)

4. **[SEDANG] Token JWT disimpan di `localStorage`/`sessionStorage`, bisa dibaca JavaScript**
   - File: `frontend/src/lib/session.js:1-18`
   - Dampak: saat ini risiko rendah karena tidak ditemukan `dangerouslySetInnerHTML` di
     frontend (React/Next auto-escape JSX, jadi XSS klasik sulit terjadi). Tapi kalau suatu saat
     ada XSS (misal lewat library pihak ketiga atau input yang di-render tanpa sanitasi), token
     bisa dicuri langsung dari storage — beda dengan cookie `httpOnly` yang tidak bisa dibaca JS
     sama sekali. Ini gap *defense-in-depth*, bukan lubang aktif.
   - Saran (opsional, effort besar karena ubah arsitektur auth): pindah ke cookie `httpOnly` +
     `SameSite=Strict` untuk token. Kalau tidak worth effort-nya sekarang, minimal pastikan tidak
     ada dependency frontend baru yang render HTML mentah dari input user.

5. **[SEDANG] `ValidationPipe` belum `whitelist: true` / `forbidNonWhitelisted: true`**
   - File: `backend/src/main.ts:19` — saat ini `new ValidationPipe({ transform: true, ... })`
   - Dampak: potensi *mass assignment* — kalau ada service yang nge-spread `req.body` langsung
     ke `prisma.create()`/`update()` tanpa DTO ketat, field yang tidak dimaksud (misal
     `roleId`, `isVerified`) bisa ikut kekirim dan diterima backend. Perlu dicek satu-satu
     apakah semua service memang selalu pakai DTO eksplisit (bukan spread body mentah) — kalau
     iya, risikonya kecil; `whitelist: true` tetap layer pertahanan tambahan yang murah.
   - Saran: tambah `whitelist: true, forbidNonWhitelisted: true` di `ValidationPipe` (cek dulu
     tidak ada request yang sengaja kirim field ekstra yang dibutuhkan, baru aktifkan).

6. **[SEDANG] Dependency vulnerabilities — `npm audit` belum pernah dijalankan**
   - Backend: 8 vulnerability (6 high, 2 moderate). Paket utama: `multer` (via
     `@nestjs/platform-express`) — high, "Denial of Service via oversized array index in field
     names" (GHSA-535w-7cp7-47q4) + low "file size limit bypass"; `qs` — moderate, DoS via
     `isBuffer` (GHSA-4mjr-xmp4-gh2g). Semua sudah ada `fixAvailable: true`.
   - Frontend: 4 vulnerability (3 high, 1 moderate). Paket: `js-yaml` — high, quadratic CPU
     consumption / ReDoS-like (GHSA-52cp-r559-cp3m, GHSA-2883-xcg3-v3hh); `browserslist` — high,
     "uncaught crash / prototype write via untrusted stats" (GHSA-73wf-gq98-2v4g). Semua devDependency
     (build tooling), bukan kode yang jalan di production runtime.
   - Dampak: `multer` yang high itu paling relevan karena dipakai di endpoint upload bukti
     bayar/setoran yang menerima file dari user — request upload dengan field name yang di-craft
     bisa bikin server DoS.
   - Saran: `npm audit fix` di `backend` (aman, ada fix tersedia), lalu `npm audit fix` di
     `frontend` untuk devDependency-nya. Verifikasi `nest build`/`next build` tetap lolos setelah
     update.

7. **[AMAN — sudah diverifikasi] Account enumeration di login**
   - File: `backend/src/auth/auth.service.ts:27-36`
   - Ketiga kondisi gagal (field kosong, user tidak ditemukan, password salah) sama-sama
     melempar `UnauthorizedException(INVALID_CREDENTIALS_MSG)` — satu pesan generik yang sama,
     jadi attacker tidak bisa membedakan akun valid vs tidak dari respons login. Tidak perlu
     tindakan.

8. **[RENDAH] Password policy hanya `MinLength(6)`, tanpa syarat kompleksitas**
   - File: `backend/src/auth/auth.controller.ts:29`, `backend/src/warga/dto/daftar-mandiri.dto.ts:23`,
     `backend/src/warga/dto/create-warga.dto.ts:51` — semua konsisten pakai `@MinLength(6)`.
   - Dampak: user bisa set password lemah seperti `"123456"` — minimal ada panjang minimum
     (bukan tanpa validasi sama sekali), tapi tidak ada syarat kombinasi huruf/angka. Risiko
     rendah karena tetap dilindungi rate limiting yang direncanakan di #1, dan ini aplikasi
     internal cluster (bukan publik luas).
   - Saran (opsional): naikkan ke `MinLength(8)` + custom validator kombinasi huruf-angka kalau
     mau lebih ketat, tapi bukan prioritas dibanding temuan lain.

9. **[AMAN — sudah diverifikasi] Sensitive data di log**
   - Dicek semua penggunaan `console.log/error`, `Logger.log/error`, dan tidak ditemukan log
     yang mencetak `password`, `token`, atau `req.body` mentah. `backend/src/audit/audit.service.ts:19`
     cuma log pesan gagal audit + error object (bukan payload sensitif), global exception filter
     (`backend/src/common/pesan-indonesia.ts:146`) cuma log `exception.stack`/`message`. Tidak
     perlu tindakan.
   - Catatan operasional (bukan bug kode): HTTPS/TLS saat deploy tetap jadi tanggung jawab
     konfigurasi server/hosting, di luar cakupan audit kode ini.

## Prioritas pengerjaan (usulan urutan)

1. Rate limiting login & registrasi mandiri (#1) — paling murah, paling kepake buat serangan nyata.
2. `npm audit fix` di backend, khususnya `multer` (high, relevan langsung ke endpoint upload
   bukti bayar) (#6).
3. Proteksi file upload finansial lewat endpoint terautentikasi (#2).
4. `whitelist`/`forbidNonWhitelisted` di ValidationPipe (#5) — cek dulu tidak ada yang kebobol
   butuh field ekstra.
5. `helmet()` + whitelist CORS origin (#3).
6. `npm audit fix` di frontend untuk devDependency (`js-yaml`, `browserslist`) (#6) — tidak
   mendesak karena bukan kode runtime production, tapi murah untuk dibereskan sekalian.
7. Opsional/jangka panjang: pindah token ke cookie `httpOnly` (#4) — effort besar, evaluasi
   dulu apakah sepadan untuk skala aplikasi ini.
8. Opsional: perketat password policy ke `MinLength(8)` + kompleksitas (#8) — bukan prioritas.

Item #7 (nomor 4 di daftar temuan) sengaja ditaruh paling akhir/opsional karena mengubah
arsitektur auth (frontend & backend sama-sama kena), bukan sekadar tambal config. Temuan #7
(account enumeration) dan #9 (sensitive data di log) sudah aman, tidak perlu tindakan — dicatat
di sini sebagai bukti sudah dicek.

## Catatan implementasi (23 Sep 2026)

1. **Rate limiting** — `@nestjs/throttler` dipasang (5x/menit per IP), diterapkan lewat
   `@UseGuards(ThrottlerGuard)` di `POST /auth/login` dan `POST /warga/daftar`.
2. **`npm audit fix` backend** — 0 vulnerability (sebelumnya 8, termasuk `multer` high).
3. **Proteksi file finansial** — folder `uploads/bukti-bayar`, `uploads/setoran`,
   `uploads/keuangan` diblokir dari static serving di `main.ts` (pola sama seperti
   `catatan-rapat`). Endpoint baru: `GET /ipl/pembayaran/:id/bukti`, `GET /setoran/:id/bukti`,
   `GET /keuangan/:id/bukti` — semua cek login + scope (OWN/AREA/ALL) sebelum kirim file.
   Frontend diubah dari `<img src>` URL statis ke `<ProtectedImage>` (fetch blob dengan
   Authorization header) via `components/ui/ProtectedImage.jsx`, dan link "Lihat Bukti" jadi
   tombol yang panggil `openProtectedFile()`. Folder `uploads/pengumuman`, `kegiatan`,
   `pengaduan` sengaja dibiarkan publik karena memang ada endpoint publik terkait
   (`pengumuman/active`, dst).
4. **`ValidationPipe` whitelist** — `whitelist: true, forbidNonWhitelisted: true` diaktifkan
   di `main.ts` setelah audit manual semua DTO create/update vs payload yang dikirim frontend
   (tidak ada field ekstra yang dibutuhkan).
5. **`helmet()` + CORS whitelist** — dipasang dengan `crossOriginResourcePolicy: cross-origin`
   (supaya file publik di `/uploads` tetap bisa di-load dari origin frontend yang beda
   port/host). Origin CORS diambil dari env `CORS_ORIGINS` (default localhost:3000 + LAN IP
   dev saat ini), bukan hardcode, karena IP LAN dev sudah pernah berubah sebelumnya.
6. **`npm audit fix` frontend** — sudah 0 vulnerability saat dicek (tidak ada aksi diperlukan).

Build backend (`nest build`) dan frontend (`next build`) lolos setelah semua perubahan di atas;
backend juga sudah di-boot-test (routes baru terdaftar, tidak ada error wiring — satu-satunya
error saat boot adalah database lokal belum dinyalakan, di luar cakupan perubahan ini).
