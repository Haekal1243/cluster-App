-- Penyewa (kontrak) pada rumah: akun kedua selain pemilik. Semua kolom opsional, tidak mengubah data lama.
ALTER TABLE `tb_Rumah`
  ADD COLUMN `id_penyewa` INTEGER NULL,
  ADD COLUMN `kontrak_mulai` DATETIME(3) NULL;

CREATE INDEX `tb_Rumah_id_penyewa_idx` ON `tb_Rumah`(`id_penyewa`);

ALTER TABLE `tb_Rumah`
  ADD CONSTRAINT `tb_Rumah_id_penyewa_fkey` FOREIGN KEY (`id_penyewa`) REFERENCES `tb_User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Penyewa saat tagihan terbit (null = tagihan atas nama pemilik).
ALTER TABLE `trx_IPL` ADD COLUMN `id_penyewa` INTEGER NULL;
CREATE INDEX `trx_IPL_id_penyewa_idx` ON `trx_IPL`(`id_penyewa`);
