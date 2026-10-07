-- CreateTable
CREATE TABLE `tb_PushSubscription` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idUser` INTEGER NOT NULL,
    `endpoint` VARCHAR(512) NOT NULL,
    `p256dh` VARCHAR(255) NOT NULL,
    `auth` VARCHAR(255) NOT NULL,
    `user_agent` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tb_PushSubscription_idUser_endpoint_key`(`idUser`, `endpoint`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tb_PushSubscription` ADD CONSTRAINT `tb_PushSubscription_idUser_fkey` FOREIGN KEY (`idUser`) REFERENCES `tb_User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
