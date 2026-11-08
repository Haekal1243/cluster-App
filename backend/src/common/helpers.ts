import { randomInt } from 'crypto';

export const LEVEL_ADMIN = 0;
export const LEVEL_WARGA = 3;

export const BLOK_RUMAH_REGEX = /^E\d{1,2}\/\d{1,2}$/;
export const BLOK_RUMAH_MESSAGE = 'Format blok rumah harus seperti E7/15';

const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generatePassword(length = 8): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

export function withTotal<T extends { nominalIpl: number; nominalKas: number }>(
  t: T,
): T & { nominal: number } {
  return { ...t, nominal: t.nominalIpl + t.nominalKas };
}

export const totalTagihan = (t: { nominalIpl: number; nominalKas: number }) =>
  t.nominalIpl + t.nominalKas;
