-- AlterEnum: tipe notifikasi untuk masukan warga pada kegiatan
ALTER TABLE `tb_Notifikasi` MODIFY COLUMN `tipe` ENUM('TAGIHAN_BARU', 'PEMBAYARAN_DIKONFIRMASI', 'PEMBAYARAN_DITOLAK', 'PEMBAYARAN_MASUK', 'PENGADUAN_BARU', 'PENGADUAN_DITANGGAPI', 'PENGADUAN_DITERUSKAN', 'PENDAFTARAN_BARU', 'PENGUMUMAN_BARU', 'KEGIATAN_BARU', 'SETORAN_MASUK', 'SETORAN_DIKONFIRMASI', 'SETORAN_DITOLAK', 'PENGAJUAN_MASUK', 'PENGAJUAN_DISETUJUI', 'PENGAJUAN_DITOLAK', 'PERUBAHAN_DATA', 'FEEDBACK_KEGIATAN') NOT NULL;

-- CreateTable
CREATE TABLE `tb_Kegiatan_Feedback` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kegiatan_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `rating` INTEGER NOT NULL,
    `komentar` TEXT NULL,
    `anonim` BOOLEAN NOT NULL DEFAULT false,
    `disembunyikan` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tb_Kegiatan_Feedback_user_id_idx`(`user_id`),
    UNIQUE INDEX `tb_Kegiatan_Feedback_kegiatan_id_user_id_key`(`kegiatan_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tb_Kegiatan_Feedback` ADD CONSTRAINT `tb_Kegiatan_Feedback_kegiatan_id_fkey` FOREIGN KEY (`kegiatan_id`) REFERENCES `tb_Kegiatan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `tb_Kegiatan_Feedback` ADD CONSTRAINT `tb_Kegiatan_Feedback_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `tb_User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
