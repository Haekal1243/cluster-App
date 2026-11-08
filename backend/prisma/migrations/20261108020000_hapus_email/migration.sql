-- Email tidak dipakai lagi (login dan kontak lewat nama pengguna / no. HP).
ALTER TABLE `tb_User` DROP COLUMN `email`;
ALTER TABLE `tb_PendaftaranWarga` DROP COLUMN `email`;
