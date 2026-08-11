/*
  Warnings:

  - You are about to drop the `ipl` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rumah` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `ipl` DROP FOREIGN KEY `Ipl_rumahId_fkey`;

-- DropForeignKey
ALTER TABLE `rumah` DROP FOREIGN KEY `Rumah_userId_fkey`;

-- DropTable
DROP TABLE `ipl`;

-- DropTable
DROP TABLE `rumah`;

-- DropTable
DROP TABLE `user`;

-- CreateTable
CREATE TABLE `tb_Role_permission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role` ENUM('ADMIN', 'WARGA', 'PENGURUS') NOT NULL,
    `permission_id` INTEGER NOT NULL,
    `create_by` VARCHAR(191) NULL,
    `create_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama_user` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `no_telp` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'WARGA', 'PENGURUS') NOT NULL DEFAULT 'WARGA',
    `create_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tb_User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_Rumah` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `RT` ENUM('RT_01', 'RT_02', 'RT_03', 'RT_04') NOT NULL,
    `block_rumah` VARCHAR(191) NOT NULL,
    `id_user` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trx_IPL` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `Id_rumah` INTEGER NOT NULL,
    `bulan_periode` VARCHAR(191) NOT NULL,
    `tahun_periode` VARCHAR(191) NOT NULL,
    `nominal` INTEGER NOT NULL,
    `status_pembayaran` ENUM('LUNAS', 'BELUM_LUNAS', 'MENUNGGU_KONFIRMASI') NOT NULL DEFAULT 'BELUM_LUNAS',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trx_pembayaran_ipl` (
    `id_pembayaran` INTEGER NOT NULL AUTO_INCREMENT,
    `id_user` INTEGER NOT NULL,
    `Id_IPL` INTEGER NOT NULL,
    `tanggal_bayar` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `bukti_transaksi` VARCHAR(191) NULL,
    `Nominal` INTEGER NOT NULL,

    PRIMARY KEY (`id_pembayaran`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tb_Rumah` ADD CONSTRAINT `tb_Rumah_id_user_fkey` FOREIGN KEY (`id_user`) REFERENCES `tb_User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trx_IPL` ADD CONSTRAINT `trx_IPL_Id_rumah_fkey` FOREIGN KEY (`Id_rumah`) REFERENCES `tb_Rumah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trx_pembayaran_ipl` ADD CONSTRAINT `trx_pembayaran_ipl_id_user_fkey` FOREIGN KEY (`id_user`) REFERENCES `tb_User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trx_pembayaran_ipl` ADD CONSTRAINT `trx_pembayaran_ipl_Id_IPL_fkey` FOREIGN KEY (`Id_IPL`) REFERENCES `trx_IPL`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
