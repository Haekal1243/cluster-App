/**
 * Cache memori sederhana untuk data publik yang dibaca banyak pengunjung tapi jarang berubah
 * (landing page). Hasil dipakai ulang selama `ttlMs`, dan permintaan yang datang bersamaan
 * saat cache kosong digabung jadi satu query (bukan satu query per pengunjung).
 * Data bisa terlambat paling lama `ttlMs` muncul setelah pengurus mengubahnya.
 */
export class TtlCache<T> {
  private entries = new Map<string, { at: number; value: Promise<T> }>();

  constructor(private readonly ttlMs: number) {}

  get(key: string, muat: () => Promise<T>): Promise<T> {
    const hit = this.entries.get(key);
    if (hit && Date.now() - hit.at < this.ttlMs) return hit.value;

    const value = muat().catch((err) => {
      // Jangan simpan kegagalan: percobaan berikutnya harus query ulang.
      this.entries.delete(key);
      throw err;
    });
    this.entries.set(key, { at: Date.now(), value });
    return value;
  }
}
