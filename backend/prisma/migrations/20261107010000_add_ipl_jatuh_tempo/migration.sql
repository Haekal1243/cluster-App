-- Tanggal jatuh tempo per tagihan (diisi saat generate). Tagihan lama tetap NULL.
ALTER TABLE `trx_IPL` ADD COLUMN `jatuh_tempo` DATE NULL;
