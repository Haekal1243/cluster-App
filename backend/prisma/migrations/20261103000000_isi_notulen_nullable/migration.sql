-- Notulen boleh kosong bila catatan rapat hanya berisi lampiran file (sesuai schema.prisma: String?)
ALTER TABLE `tb_CatatanRapat` MODIFY COLUMN `isi_notulen` TEXT NULL;
