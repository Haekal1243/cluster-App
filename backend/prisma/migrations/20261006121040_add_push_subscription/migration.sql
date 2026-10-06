/*
  Warnings:

  - Made the column `keterangan_pengumuman` on table `tb_pengumuman` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `tb_catatanrapat` MODIFY `isi_notulen` TEXT NULL;

-- AlterTable
ALTER TABLE `tb_pengumuman` MODIFY `keterangan_pengumuman` TEXT NOT NULL;

-- CreateTable
CREATE TABLE `tb_PushSubscription` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idUser` INTEGER NOT NULL,
    `endpoint` VARCHAR(512) NOT NULL,
    `p256dh` VARCHAR(255) NOT NULL,
    `auth` VARCHAR(255) NOT NULL,
    `user_agent` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tb_PushSubscription_idUser_endpoint_key`(`idUser`, `endpoint`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tb_PushSubscription` ADD CONSTRAINT `tb_PushSubscription_idUser_fkey` FOREIGN KEY (`idUser`) REFERENCES `tb_User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RedefineIndex (urutan ditukar: MySQL menganggap nama index case-insensitive,
-- jadi index lama harus di-drop dulu sebelum index baru dengan nama "sama" dibuat)
DROP INDEX `tb_pengaduan_status_createdAt_idx` ON `tb_pengaduan`;
CREATE INDEX `tb_Pengaduan_status_createdAt_idx` ON `tb_Pengaduan`(`status`, `createdAt`);

-- RedefineIndex
DROP INDEX `tb_pengaduan_tujuan_status_idx` ON `tb_pengaduan`;
CREATE INDEX `tb_Pengaduan_tujuan_status_idx` ON `tb_Pengaduan`(`tujuan`, `status`);
