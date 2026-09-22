-- Bagian 2 rencana perbaikan: tujuan pengaduan (RW / RT tertentu) + penanda auto-teruskan.
-- Ditulis manual (bukan hasil `prisma migrate dev`) supaya bisa membackfill data lama
-- sebelum kolom `tujuan` diwajibkan NOT NULL. Aman dijalankan di DB yang sudah berisi
-- data: kolom ditambah nullable dulu, dibackfill, baru diwajibkan.

-- AlterTable: tambah kolom nullable dulu
ALTER TABLE `tb_pengaduan`
  ADD COLUMN `tujuan` ENUM('RW', 'RT_01', 'RT_02', 'RT_03', 'RT_04') NULL,
  ADD COLUMN `diteruskanAt` DATETIME(3) NULL;

-- Backfill: tujuan = area pelapor kalau areanya RT, selain itu (RW/NULL) jatuh ke RW.
UPDATE `tb_pengaduan` p
JOIN `tb_user` u ON u.`id` = p.`idUser`
SET p.`tujuan` = CASE
  WHEN u.`area` IN ('RT_01', 'RT_02', 'RT_03', 'RT_04') THEN u.`area`
  ELSE 'RW'
END
WHERE p.`tujuan` IS NULL;

-- Wajibkan kolom setelah backfill
ALTER TABLE `tb_pengaduan`
  MODIFY COLUMN `tujuan` ENUM('RW', 'RT_01', 'RT_02', 'RT_03', 'RT_04') NOT NULL;

-- Index untuk filter visibilitas (lihat PengaduanService.scopeWhere) dan job auto-teruskan
CREATE INDEX `tb_pengaduan_tujuan_status_idx` ON `tb_pengaduan`(`tujuan`, `status`);
CREATE INDEX `tb_pengaduan_status_createdAt_idx` ON `tb_pengaduan`(`status`, `createdAt`);

-- Tambah PENGADUAN_DITERUSKAN ke enum TipeNotifikasi (tb_notifikasi.tipe)
ALTER TABLE `tb_notifikasi`
  MODIFY COLUMN `tipe` ENUM(
    'TAGIHAN_BARU',
    'PEMBAYARAN_DIKONFIRMASI',
    'PEMBAYARAN_DITOLAK',
    'PEMBAYARAN_MASUK',
    'PENGADUAN_BARU',
    'PENGADUAN_DITANGGAPI',
    'PENGADUAN_DITERUSKAN',
    'PENGUMUMAN_BARU',
    'KEGIATAN_BARU',
    'SETORAN_MASUK',
    'SETORAN_DIKONFIRMASI',
    'SETORAN_DITOLAK',
    'PENGAJUAN_MASUK',
    'PENGAJUAN_DISETUJUI',
    'PENGAJUAN_DITOLAK'
  ) NOT NULL;
