-- CreateTable
CREATE TABLE `trx_kas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipe` ENUM('PEMASUKAN', 'PENGELUARAN') NOT NULL,
    `kategori` VARCHAR(191) NOT NULL,
    `nominal` INTEGER NOT NULL,
    `tanggal` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `keterangan` TEXT NULL,
    `bukti_file` VARCHAR(191) NULL,
    `create_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
