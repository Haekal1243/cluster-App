-- File upload disimpan di database (LONGBLOB), menggantikan folder uploads/.
-- Tabel baru, tanpa backfill. Kolom rujukan lama (gambarUrl, buktiTransaksi, dst) tidak berubah
-- bentuk; isinya kini id baris tb_File.

-- CreateTable
CREATE TABLE `tb_File` (
    `id` VARCHAR(36) NOT NULL,
    `nama_asli` VARCHAR(191) NOT NULL,
    `mime_type` VARCHAR(191) NOT NULL,
    `ukuran` INTEGER NOT NULL,
    `publik` BOOLEAN NOT NULL DEFAULT false,
    `data` LONGBLOB NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
