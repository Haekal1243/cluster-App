-- Nomor kontak publik pengurus (opt-in, terpisah dari no_telp pribadi) untuk landing page.
-- Kolom nullable, tanpa backfill; NULL = tidak ditampilkan.

-- AlterTable
ALTER TABLE `tb_User` ADD COLUMN `kontak_publik` VARCHAR(191) NULL;
