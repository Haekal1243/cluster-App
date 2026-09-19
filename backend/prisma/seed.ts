import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

// ============================================================
// Konfigurasi akun admin yang ingin dibuat
// Ubah data di bawah sesuai kebutuhan sebelum menjalankan seed
// ============================================================
const ADMINS_TO_SEED = [
  {
    namaUser: 'Admin',
    email: 'admin@gmail.com',
    password: 'admin1234', // Password plain text, akan di-hash otomatis
    noTelp: null,
    role: Role.ADMIN,
  },
  // Tambah admin lain jika perlu:
  // {
  //   namaUser: 'Pengurus RT01',
  //   email: 'pengurus@cluster.com',
  //   password: 'Pengurus@1234',
  //   noTelp: '08987654321',
  //   role: Role.PENGURUS,
  // },
];

async function main() {
  console.log('🌱 Memulai proses seed akun admin...\n');

  for (const adminData of ADMINS_TO_SEED) {
    // Cek apakah email sudah ada
    const existing = await prisma.user.findUnique({
      where: { email: adminData.email },
    });

    if (existing) {
      console.log(
        `⚠️  Akun dengan email "${adminData.email}" sudah ada (ID: ${existing.id}). Dilewati.`,
      );
      continue;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminData.password, SALT_ROUNDS);

    // Buat user admin — TANPA membuat data rumah
    const newAdmin = await prisma.user.create({
      data: {
        namaUser: adminData.namaUser,
        email: adminData.email,
        password: hashedPassword,
        noTelp: adminData.noTelp,
        role: adminData.role,
        // Sengaja tidak menyertakan `rumah: { create: ... }`
        // agar admin tidak terhubung ke data rumah/warga
      },
    });

    console.log(
      `✅ Akun berhasil dibuat:\n` +
        `   Nama  : ${newAdmin.namaUser}\n` +
        `   Email : ${newAdmin.email}\n` +
        `   Role  : ${newAdmin.role}\n` +
        `   ID    : ${newAdmin.id}\n`,
    );
  }

  console.log('✨ Seed selesai!');
}

main()
  .catch((e) => {
    console.error('❌ Seed gagal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
