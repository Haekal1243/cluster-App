-- Izin baru: kelola kontrak penyewa pada rumah (mulai/akhiri). Diberikan ke Sekretaris RT (area) dan Admin.
-- Lewat migrasi (bukan seed) supaya admin tetap bisa mengatur ulang lewat menu Peran & Hak Akses.
INSERT INTO `tb_Permission` (`kode`, `menu`, `aksi`, `keterangan`)
SELECT 'rumah.kontrak', 'rumah', 'kontrak', 'Kelola kontrak penyewa rumah (mulai/akhiri)'
WHERE NOT EXISTS (SELECT 1 FROM `tb_Permission` WHERE `kode` = 'rumah.kontrak');

INSERT INTO `tb_Role_permission` (`role_id`, `permission_id`, `scope`, `create_by`)
SELECT r.`id`, p.`id`, IF(r.`kode` = 'SEKRE_RT', 'AREA', 'ALL'), 'migrasi'
FROM `tb_Role` r
JOIN `tb_Permission` p ON p.`kode` = 'rumah.kontrak'
WHERE r.`kode` IN ('SEKRE_RT', 'ADMIN')
  AND NOT EXISTS (SELECT 1 FROM `tb_Role_permission` rp WHERE rp.`role_id` = r.`id` AND rp.`permission_id` = p.`id`);
