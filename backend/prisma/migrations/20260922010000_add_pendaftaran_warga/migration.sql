-- Bagian 3 rencana perbaikan: registrasi mandiri warga (self-register), butuh persetujuan
-- pengurus RT. Ditulis manual (bukan hasil `prisma migrate dev`) — tabel baru, tanpa backfill,
-- aman dijalankan di DB yang sudah berisi data.

-- CreateTable
CREATE TABLE `tb_PendaftaranWarga` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `namaUser` VARCHAR(191) NOT NULL,
    `noTelp` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `rt` ENUM('RT_01', 'RT_02', 'RT_03', 'RT_04') NOT NULL,
    `rumahId` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'DISETUJUI', 'DITOLAK') NOT NULL DEFAULT 'PENDING',
    `alasanTolak` VARCHAR(191) NULL,
    `diprosesOleh` VARCHAR(191) NULL,
    `diprosesAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tb_PendaftaranWarga_rt_status_idx`(`rt`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tb_PendaftaranWarga` ADD CONSTRAINT `tb_PendaftaranWarga_rumahId_fkey` FOREIGN KEY (`rumahId`) REFERENCES `tb_Rumah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Tambah PENDAFTARAN_BARU ke enum TipeNotifikasi (tb_notifikasi.tipe)
ALTER TABLE `tb_notifikasi`
  MODIFY COLUMN `tipe` ENUM(
    'TAGIHAN_BARU',
    'PEMBAYARAN_DIKONFIRMASI',
    'PEMBAYARAN_DITOLAK',
    'PEMBAYARAN_MASUK',
    'PENGADUAN_BARU',
    'PENGADUAN_DITANGGAPI',
    'PENGADUAN_DITERUSKAN',
    'PENDAFTARAN_BARU',
    'PENGUMUMAN_BARU',
    'KEGIATAN_BARU',
    'SETORAN_MASUK',
    'SETORAN_DIKONFIRMASI',
    'SETORAN_DITOLAK',
    'PENGAJUAN_MASUK',
    'PENGAJUAN_DISETUJUI',
    'PENGAJUAN_DITOLAK'
  ) NOT NULL;
