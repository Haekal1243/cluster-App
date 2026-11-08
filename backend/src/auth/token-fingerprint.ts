import { createHash } from 'node:crypto';

export const sidikJariSandi = (passwordHash: string) =>
  createHash('sha256').update(passwordHash).digest('hex').slice(0, 16);
