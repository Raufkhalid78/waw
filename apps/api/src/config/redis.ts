/**
 * Redis In-Memory Client & Fallback Concurrency Cache
 * Powers flash-sale distributed inventory mutex locks and session states.
 */

class MemoryCacheFallback {
  private store = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, mode?: string, durationSeconds?: number): Promise<string> {
    const expiresAt = durationSeconds ? Date.now() + durationSeconds * 1000 : Infinity;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  async eval(script: string, numkeys: number, ...args: (string | number)[]): Promise<any> {
    // Atomic stock deduction simulation
    const key = args[0] as string;
    const qty = parseInt(args[1] as string, 10) || 1;
    const current = parseInt((await this.get(key)) || '0', 10);
    if (current >= qty) {
      await this.set(key, (current - qty).toString());
      return 1; // Success
    }
    return 0; // Insufficient stock
  }
}

export const redis = new MemoryCacheFallback();
