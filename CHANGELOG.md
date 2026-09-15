# Changelog — Sesi Perubahan (2026-09-14)

## ⚠️ Wajib dilakukan setelah pull/merge
1. `cd backend && npm install` (ada dependency baru)
2. Tambahin ke `backend/.env` (gak ke-push, di-gitignore):
   ```
   JWT_SECRET="clu2t3rT0P4ZP3RM4T4c1m4ngg12RWsi#901238jn"
   JWT_EXPIRES_IN=1d
   ```
3. `cd backend && npx prisma migrate dev` (ada 3 migration baru)
4. Restart backend & frontend

## Daftar fitur/perubahan
1. Autentikasi JWT (login pakai token, bukan cuma objek user mentah)
2. Auto-logout kalau idle 15 menit
3. Checkbox "Ingat saya" di login (beneran fungsi)
4. Gabung dashboard admin & warga jadi satu (`/dashboard`), hapus `/portal`
5. Fitur baru: Pengaduan Lingkungan (warga lapor → admin tanggapi)
6. Fitur baru: Notifikasi (lonceng di header, real-time-ish via polling)
7. Validasi format Blok Rumah (`E7/15`)
8. Fix sidebar ikut ke-scroll
9. Hapus dropdown logout di nama user header (cukup di sidebar)
10. Responsif mobile (welcome banner, stat card, grid kegiatan, spacing)
11. Fix stat card gak stretch penuh (bug `auto-fill` → `auto-fit`)
12. Fix ikon + tanggal gak sejajar di card kegiatan/pengumuman
13. Fix placeholder "Pilih RT" kepotong
14. Terjemahan sisa teks UI ke Bahasa Indonesia
15. Fix bug build `catatan` field (Prisma Client belum di-generate)

## Migration Prisma baru
1. `add_catatan_to_pembayaran_ipl`
2. `add_pengaduan`
3. `add_notifikasi`

## File yang dihapus
- `frontend/src/app/portal/` (semua isinya)
- `frontend/src/components/layout/PortalShell.jsx`
- `frontend/src/components/layout/PortalSidebar.jsx`
- `frontend/src/components/layout/PortalHeader.jsx`

## Belum dikerjain (flagged)
- Password masih plaintext (belum di-hash)
- Ownership check belum lengkap di endpoint lama `warga/portal/*`
- Duplikat `wargaApi` (`lib/api.js` vs `lib/warga.api.js`)
