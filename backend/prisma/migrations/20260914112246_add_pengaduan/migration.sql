-- CreateTable
CREATE TABLE `Pengaduan` (
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

-- AddForeignKey
ALTER TABLE `Pengaduan` ADD CONSTRAINT `Pengaduan_idUser_fkey` FOREIGN KEY (`idUser`) REFERENCES `tb_User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
