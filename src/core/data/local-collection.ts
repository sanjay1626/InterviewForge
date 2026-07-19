import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Tiny AsyncStorage-backed collection used to give guest mode local CRUD that
 * mirrors the cloud repositories. One JSON array per storage key.
 */
export class LocalCollection<T extends { id: string }> {
  constructor(private readonly key: string) {}

  private async readAll(): Promise<T[]> {
    const raw = await AsyncStorage.getItem(this.key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  private async writeAll(items: T[]): Promise<void> {
    await AsyncStorage.setItem(this.key, JSON.stringify(items));
  }

  async list(): Promise<T[]> {
    return this.readAll();
  }

  async get(id: string): Promise<T | null> {
    const items = await this.readAll();
    return items.find((i) => i.id === id) ?? null;
  }

  async upsert(item: T): Promise<T> {
    const items = await this.readAll();
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) items[idx] = item;
    else items.unshift(item);
    await this.writeAll(items);
    return item;
  }

  async remove(id: string): Promise<void> {
    const items = await this.readAll();
    await this.writeAll(items.filter((i) => i.id !== id));
  }
}
