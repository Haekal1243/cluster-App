-- Daftar notifikasi tiap pengguna (diurut terbaru) dipanggil berkala oleh setiap browser.
CREATE INDEX `tb_Notifikasi_idUser_createdAt_idx` ON `tb_Notifikasi`(`idUser`, `createdAt`);
