-- AlterTable
ALTER TABLE `tb_Notifikasi` ADD COLUMN `read_at` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `tb_Notifikasi_isRead_read_at_idx` ON `tb_Notifikasi`(`isRead`, `read_at`);
