-- Pengajuan hapus akun warga (sekre RT mengajukan, RW menyetujui). Ditulis manual:
-- tabel baru tanpa backfill, aman dijalankan di DB yang sudah berisi data.

-- CreateTable
CREATE TABLE `tb_PengajuanHapusWarga` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `namaUser` VARCHAR(191) NOT NULL,
    `rt` ENUM('RW', 'RT_01', 'RT_02', 'RT_03', 'RT_04') NOT NULL,
    `alasan` TEXT NOT NULL,
    `status` ENUM('MENUNGGU', 'DISETUJUI', 'DITOLAK') NOT NULL DEFAULT 'MENUNGGU',
    `diajukanOleh` VARCHAR(191) NOT NULL,
    `diajukanOlehId` INTEGER NOT NULL,
    `alasanTolak` TEXT NULL,
    `diprosesOleh` VARCHAR(191) NULL,
    `diprosesAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tb_PengajuanHapusWarga_status_rt_idx`(`status`, `rt`),
    INDEX `tb_PengajuanHapusWarga_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Sekretaris RT tidak lagi boleh menghapus akun warga langsung (harus lewat pengajuan ke RW).
-- Dijalankan sekali di sini, bukan di seed, supaya admin tetap bisa memberi izin itu lagi lewat
-- menu Peran & Hak Akses tanpa tertimpa tiap seed.
DELETE rp FROM `tb_Role_permission` rp
  JOIN `tb_Role` r ON r.`id` = rp.`role_id`
  JOIN `tb_Permission` p ON p.`id` = rp.`permission_id`
  WHERE r.`kode` = 'SEKRE_RT' AND p.`kode` = 'warga.delete';

-- Pengingat harian tagihan IPL (warga) dan setoran IPL ke RW (pengurus RT).
ALTER TABLE `tb_Notifikasi` MODIFY COLUMN `tipe` ENUM('TAGIHAN_BARU', 'PEMBAYARAN_DIKONFIRMASI', 'PEMBAYARAN_DITOLAK', 'PEMBAYARAN_MASUK', 'PENGADUAN_BARU', 'PENGADUAN_DITANGGAPI', 'PENGADUAN_DITERUSKAN', 'PENDAFTARAN_BARU', 'PENGUMUMAN_BARU', 'KEGIATAN_BARU', 'SETORAN_MASUK', 'SETORAN_DIKONFIRMASI', 'SETORAN_DITOLAK', 'PENGAJUAN_MASUK', 'PENGAJUAN_DISETUJUI', 'PENGAJUAN_DITOLAK', 'PERUBAHAN_DATA', 'FEEDBACK_KEGIATAN', 'PENGINGAT_IPL') NOT NULL;
