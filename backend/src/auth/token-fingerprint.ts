import { createHash } from 'node:crypto';

/**
 * Sidik jari pendek dari hash sandi, ditanam di JWT (klaim `pv`). Saat sandi diganti atau di-reset
 * hash-nya berubah, sehingga semua token lama otomatis tidak cocok lagi di JwtAuthGuard.
 * Hash bcrypt sendiri tidak pernah keluar dari server; yang masuk token hanya digest SHA-256 terpotong.
 */
export const sidikJariSandi = (passwordHash: string) =>
  createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
