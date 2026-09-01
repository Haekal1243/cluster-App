-- CreateTable
CREATE TABLE `tb_Pengumuman` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `judul_pengumuman` VARCHAR(191) NOT NULL,
    `file_pengumuman` VARCHAR(191) NULL,
    `keterangan_pengumuman` TEXT NULL,
    `status` ENUM('active', 'unactived') NOT NULL DEFAULT 'active',
    `create_by` VARCHAR(191) NULL,
    `create_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_by` VARCHAR(191) NULL,
    `update_date` DATETIME(3) NULL,
    `is_delete` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
