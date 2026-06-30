export interface StorageAdapter {
  getItem<T>(key: string, defaultValue: T): Promise<T>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class BrowserStorageAdapter implements StorageAdapter {
  async getItem<T>(key: string, defaultValue: T): Promise<T> {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    try {
      return JSON.parse(item) as T;
    } catch {
      return defaultValue;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}

export class MemoryAdapter implements StorageAdapter {
  private cache = new Map<string, string>();

  async getItem<T>(key: string, defaultValue: T): Promise<T> {
    const val = this.cache.get(key);
    if (val === undefined) {
      this.cache.set(key, JSON.stringify(defaultValue));
      return defaultValue;
    }
    try {
      return JSON.parse(val) as T;
    } catch {
      return defaultValue;
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    this.cache.set(key, JSON.stringify(value));
  }

  async removeItem(key: string): Promise<void> {
    this.cache.delete(key);
  }
}
