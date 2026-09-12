-- AlterTable
ALTER TABLE `kegiatan` ADD COLUMN `createBy` VARCHAR(191) NULL,
    ADD COLUMN `isDelete` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `status` ENUM('active', 'unactived') NOT NULL DEFAULT 'active',
    ADD COLUMN `updateBy` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NULL;
