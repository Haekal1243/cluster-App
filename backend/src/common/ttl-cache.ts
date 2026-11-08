export class TtlCache<T> {
  private entries = new Map<string, { at: number; value: Promise<T> }>();

  constructor(private readonly ttlMs: number) {}

  get(key: string, muat: () => Promise<T>): Promise<T> {
    const hit = this.entries.get(key);
    if (hit && Date.now() - hit.at < this.ttlMs) return hit.value;

    const value = muat().catch((err) => {
      this.entries.delete(key);
      throw err;
    });
    this.entries.set(key, { at: Date.now(), value });
    return value;
  }
}
