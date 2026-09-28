-- Foto pengurus (tampil di landing page). Kolom nullable, tanpa backfill; aman untuk DB berisi data.

-- AlterTable
ALTER TABLE `tb_User` ADD COLUMN `foto` VARCHAR(191) NULL;
