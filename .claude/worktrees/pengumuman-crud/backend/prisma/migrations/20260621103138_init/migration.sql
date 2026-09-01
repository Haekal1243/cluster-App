-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `noHp` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'WARGA', 'PENGURUS') NOT NULL DEFAULT 'WARGA',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Rumah` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `blok` VARCHAR(191) NOT NULL,
    `nomor` VARCHAR(191) NOT NULL,
    `userId` INTEGER NULL,

    UNIQUE INDEX `Rumah_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Ipl` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bulan` VARCHAR(191) NOT NULL,
    `tahun` INTEGER NOT NULL,
    `nominal` INTEGER NOT NULL,
    `status` ENUM('LUNAS', 'BELUM_LUNAS', 'MENUNGGU_KONFIRMASI') NOT NULL DEFAULT 'BELUM_LUNAS',
    `buktiTransfer` VARCHAR(191) NULL,
    `rumahId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Kegiatan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `judul` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NOT NULL,
    `gambarUrl` VARCHAR(191) NOT NULL,
    `tanggalAcara` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Rumah` ADD CONSTRAINT `Rumah_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Ipl` ADD CONSTRAINT `Ipl_rumahId_fkey` FOREIGN KEY (`rumahId`) REFERENCES `Rumah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
