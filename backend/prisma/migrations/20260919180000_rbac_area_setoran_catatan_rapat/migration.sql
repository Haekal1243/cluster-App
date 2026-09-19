-- RBAC berbasis database, area RW/RT, blok rumah bersatus, tagihan IPL + kas,
-- setoran RT ke RW, catatan rapat, dan alur pengajuan kegiatan/pengumuman.
--
-- PERHATIAN: migrasi ini MENGHAPUS DAN MEMBUAT ULANG tabel user, rumah, IPL, kegiatan,
-- pengumuman, pengaduan, dan notifikasi (rename ke prefix tb_ dan kolom wajib baru).
-- Seluruh isi tabel-tabel itu hilang. Sesuai keputusan: data yang ada hanya data
-- percobaan dan dibuat ulang lewat npx prisma db seed. Jangan jalankan di DB berisi
-- data asli.
--
-- Catatan: nama tabel lama tampil huruf kecil karena MySQL di Windows meng-lowercase
-- nama tabel, jadi Prisma membacanya sebagai tabel berbeda dari tb_User dst.

-- DropForeignKey
ALTER TABLE `notifikasi` DROP FOREIGN KEY `Notifikasi_idUser_fkey`;

-- DropForeignKey
ALTER TABLE `pengaduan` DROP FOREIGN KEY `Pengaduan_idUser_fkey`;

-- DropForeignKey
ALTER TABLE `tb_rumah` DROP FOREIGN KEY `tb_Rumah_id_user_fkey`;

-- DropForeignKey
ALTER TABLE `trx_ipl` DROP FOREIGN KEY `trx_IPL_Id_rumah_fkey`;

-- DropForeignKey
ALTER TABLE `trx_pembayaran_ipl` DROP FOREIGN KEY `trx_pembayaran_ipl_Id_IPL_fkey`;

-- DropForeignKey
ALTER TABLE `trx_pembayaran_ipl` DROP FOREIGN KEY `trx_pembayaran_ipl_id_user_fkey`;

-- Riwayat pembayaran lama mengacu ke user/tagihan yang ikut dihapus di bawah;
-- dibersihkan supaya foreign key baru bisa dipasang.
DELETE FROM `trx_pembayaran_ipl`;

-- AlterTable
ALTER TABLE `trx_kas` ADD COLUMN `area` ENUM('RW', 'RT_01', 'RT_02', 'RT_03', 'RT_04') NOT NULL DEFAULT 'RW';

-- DropTable
DROP TABLE `kegiatan`;

-- DropTable
DROP TABLE `notifikasi`;

-- DropTable
DROP TABLE `pengaduan`;

-- DropTable
DROP TABLE `tb_pengumuman`;

-- DropTable
DROP TABLE `tb_role_permission`;

-- DropTable
DROP TABLE `tb_rumah`;

-- DropTable
DROP TABLE `tb_user`;

-- DropTable
DROP TABLE `trx_ipl`;

-- CreateTable
CREATE TABLE `tb_Role` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(50) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `level` INTEGER NOT NULL,
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `create_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tb_Role_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_Permission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kode` VARCHAR(100) NOT NULL,
    `menu` VARCHAR(50) NOT NULL,
    `aksi` VARCHAR(50) NOT NULL,
    `keterangan` VARCHAR(191) NULL,

    UNIQUE INDEX `tb_Permission_kode_key`(`kode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_Role_permission` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_id` INTEGER NOT NULL,
    `permission_id` INTEGER NOT NULL,
    `scope` ENUM('ALL', 'AREA', 'OWN') NOT NULL DEFAULT 'AREA',
    `create_by` VARCHAR(191) NULL,
    `create_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tb_Role_permission_permission_id_idx`(`permission_id`),
    UNIQUE INDEX `tb_Role_permission_role_id_permission_id_key`(`role_id`, `permission_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_AuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_user` INTEGER NULL,
    `aksi` VARCHAR(100) NOT NULL,
    `target` VARCHAR(100) NULL,
    `target_id` INTEGER NULL,
    `keterangan` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tb_AuditLog_aksi_idx`(`aksi`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama_user` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `no_telp` VARCHAR(191) NULL,
    `role_id` INTEGER NOT NULL,
    `area` ENUM('RW', 'RT_01', 'RT_02', 'RT_03', 'RT_04') NULL,
    `wajib_ganti_password` BOOLEAN NOT NULL DEFAULT false,
    `create_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tb_User_username_key`(`username`),
    UNIQUE INDEX `tb_User_email_key`(`email`),
    INDEX `tb_User_role_id_idx`(`role_id`),
    INDEX `tb_User_area_idx`(`area`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_Rumah` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `RT` ENUM('RT_01', 'RT_02', 'RT_03', 'RT_04') NOT NULL,
    `block_rumah` VARCHAR(191) NOT NULL,
    `status` ENUM('KOSONG', 'DIHUNI_KONTRAK', 'DIHUNI_TETAP') NOT NULL DEFAULT 'KOSONG',
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `create_by` VARCHAR(191) NULL,
    `create_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_by` VARCHAR(191) NULL,
    `update_date` DATETIME(3) NULL,
    `id_user` INTEGER NULL,

    UNIQUE INDEX `tb_Rumah_RT_block_rumah_key`(`RT`, `block_rumah`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trx_IPL` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `Id_rumah` INTEGER NOT NULL,
    `bulan_periode` VARCHAR(191) NOT NULL,
    `tahun_periode` VARCHAR(191) NOT NULL,
    `nominal_ipl` INTEGER NOT NULL,
    `nominal_kas` INTEGER NOT NULL DEFAULT 0,
    `status_pembayaran` ENUM('LUNAS', 'BELUM_LUNAS', 'MENUNGGU_KONFIRMASI') NOT NULL DEFAULT 'BELUM_LUNAS',
    `setoran_id` INTEGER NULL,

    INDEX `trx_IPL_setoran_id_idx`(`setoran_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trx_setoran_ipl` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `area` ENUM('RW', 'RT_01', 'RT_02', 'RT_03', 'RT_04') NOT NULL,
    `total_ipl` INTEGER NOT NULL,
    `jumlah_tagihan` INTEGER NOT NULL,
    `bukti_transaksi` VARCHAR(191) NULL,
    `status` ENUM('MENUNGGU_KONFIRMASI', 'DIKONFIRMASI', 'DITOLAK') NOT NULL DEFAULT 'MENUNGGU_KONFIRMASI',
    `catatan` TEXT NULL,
    `create_by` VARCHAR(191) NULL,
    `create_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `konfirmasi_by` VARCHAR(191) NULL,
    `tanggal_konfirmasi` DATETIME(3) NULL,

    INDEX `trx_setoran_ipl_area_idx`(`area`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_Kegiatan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `judul` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NOT NULL,
    `gambarUrl` VARCHAR(191) NOT NULL,
    `tanggalAcara` DATETIME(3) NOT NULL,
    `status` ENUM('active', 'unactived') NOT NULL DEFAULT 'active',
    `area` ENUM('RW', 'RT_01', 'RT_02', 'RT_03', 'RT_04') NOT NULL DEFAULT 'RW',
    `status_pengajuan` ENUM('TIDAK', 'DIAJUKAN', 'DISETUJUI', 'DITOLAK') NOT NULL DEFAULT 'TIDAK',
    `alasan_tolak` TEXT NULL,
    `tampil_sampai` DATETIME(3) NULL,
    `tampil_di_landing` BOOLEAN NOT NULL DEFAULT false,
    `createBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updateBy` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NULL,
    `isDelete` BOOLEAN NOT NULL DEFAULT false,

    INDEX `tb_Kegiatan_area_idx`(`area`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_Pengumuman` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `judul_pengumuman` VARCHAR(191) NOT NULL,
    `file_pengumuman` VARCHAR(191) NULL,
    `keterangan_pengumuman` TEXT NULL,
    `status` ENUM('active', 'unactived') NOT NULL DEFAULT 'active',
    `area` ENUM('RW', 'RT_01', 'RT_02', 'RT_03', 'RT_04') NOT NULL DEFAULT 'RW',
    `status_pengajuan` ENUM('TIDAK', 'DIAJUKAN', 'DISETUJUI', 'DITOLAK') NOT NULL DEFAULT 'TIDAK',
    `alasan_tolak` TEXT NULL,
    `tampil_sampai` DATETIME(3) NULL,
    `create_by` VARCHAR(191) NULL,
    `create_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_by` VARCHAR(191) NULL,
    `update_date` DATETIME(3) NULL,
    `is_delete` BOOLEAN NOT NULL DEFAULT false,

    INDEX `tb_Pengumuman_area_idx`(`area`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_CatatanRapat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `area` ENUM('RW', 'RT_01', 'RT_02', 'RT_03', 'RT_04') NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `isi_notulen` TEXT NOT NULL,
    `file_notulen` VARCHAR(191) NULL,
    `is_delete` BOOLEAN NOT NULL DEFAULT false,
    `create_by` VARCHAR(191) NULL,
    `create_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `update_by` VARCHAR(191) NULL,
    `update_date` DATETIME(3) NULL,

    INDEX `tb_CatatanRapat_area_idx`(`area`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_Pengaduan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idUser` INTEGER NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `kategori` ENUM('KEBERSIHAN', 'KEAMANAN', 'INFRASTRUKTUR', 'LAINNYA') NOT NULL,
    `deskripsi` TEXT NOT NULL,
    `fotoUrl` VARCHAR(191) NULL,
    `status` ENUM('MENUNGGU', 'DIPROSES', 'SELESAI', 'DITOLAK') NOT NULL DEFAULT 'MENUNGGU',
    `tanggapan` TEXT NULL,
    `tanggapanBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NULL,
    `isDelete` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tb_Notifikasi` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idUser` INTEGER NOT NULL,
    `tipe` ENUM('TAGIHAN_BARU', 'PEMBAYARAN_DIKONFIRMASI', 'PEMBAYARAN_DITOLAK', 'PEMBAYARAN_MASUK', 'PENGADUAN_BARU', 'PENGADUAN_DITANGGAPI', 'PENGUMUMAN_BARU', 'KEGIATAN_BARU', 'SETORAN_MASUK', 'SETORAN_DIKONFIRMASI', 'SETORAN_DITOLAK', 'PENGAJUAN_MASUK', 'PENGAJUAN_DISETUJUI', 'PENGAJUAN_DITOLAK') NOT NULL,
    `judul` VARCHAR(191) NOT NULL,
    `pesan` TEXT NOT NULL,
    `link` VARCHAR(191) NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `trx_kas_area_idx` ON `trx_kas`(`area`);

-- AddForeignKey
ALTER TABLE `tb_Role_permission` ADD CONSTRAINT `tb_Role_permission_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `tb_Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tb_Role_permission` ADD CONSTRAINT `tb_Role_permission_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `tb_Permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tb_User` ADD CONSTRAINT `tb_User_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `tb_Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tb_Rumah` ADD CONSTRAINT `tb_Rumah_id_user_fkey` FOREIGN KEY (`id_user`) REFERENCES `tb_User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trx_IPL` ADD CONSTRAINT `trx_IPL_Id_rumah_fkey` FOREIGN KEY (`Id_rumah`) REFERENCES `tb_Rumah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trx_IPL` ADD CONSTRAINT `trx_IPL_setoran_id_fkey` FOREIGN KEY (`setoran_id`) REFERENCES `trx_setoran_ipl`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trx_pembayaran_ipl` ADD CONSTRAINT `trx_pembayaran_ipl_id_user_fkey` FOREIGN KEY (`id_user`) REFERENCES `tb_User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trx_pembayaran_ipl` ADD CONSTRAINT `trx_pembayaran_ipl_Id_IPL_fkey` FOREIGN KEY (`Id_IPL`) REFERENCES `trx_IPL`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tb_Pengaduan` ADD CONSTRAINT `tb_Pengaduan_idUser_fkey` FOREIGN KEY (`idUser`) REFERENCES `tb_User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tb_Notifikasi` ADD CONSTRAINT `tb_Notifikasi_idUser_fkey` FOREIGN KEY (`idUser`) REFERENCES `tb_User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

