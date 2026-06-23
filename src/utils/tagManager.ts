import { fetchLuoguTags } from './api';
import ColorPalette, { isColorKey } from './color';

interface Tag {
  id: number;
  name: string;
  color: string;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000;

class TagManager {
  private tags: Map<number, Tag> = new Map();
  private types: Map<number, string> = new Map();
  private lastFetch = 0;
  private fetchPromise: Promise<void> | null = null;

  private loadFromCache(): boolean {
    const cached = globalThis.__luoguTagsCache;
    const cacheTime = globalThis.__luoguTagsCacheTime;
    if (cached && cacheTime && Date.now() - cacheTime < CACHE_DURATION) {
      this.tags = new Map(
        Object.entries(cached).map(([k, v]) => [Number(k), v as Tag])
      );
      return true;
    }
    return false;
  }

  private persistCache(): void {
    globalThis.__luoguTagsCache = Object.fromEntries(this.tags);
    globalThis.__luoguTagsCacheTime = Date.now();
  }

  async fetchTags(): Promise<void> {
    if (this.fetchPromise) return this.fetchPromise;
    this.fetchPromise = (async () => {
      try {
        const res = await fetchLuoguTags();
        const typeColors = new Map(
          res.types.map(t => [
            t.id,
            isColorKey(t.color) ? ColorPalette[t.color] : '#000000'
          ])
        );
        this.tags.clear();
        this.types = typeColors;
        for (const tag of res.tags) {
          this.tags.set(tag.id, {
            id: tag.id,
            name: tag.name,
            color: typeColors.get(tag.type) ?? '#000000'
          });
        }
        this.lastFetch = Date.now();
        this.persistCache();
      } finally {
        this.fetchPromise = null;
      }
    })();
    return this.fetchPromise;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.tags.size > 0 && Date.now() - this.lastFetch < CACHE_DURATION)
      return;
    if (!this.loadFromCache()) await this.fetchTags();
  }

  async getTag(id: number): Promise<Tag | undefined> {
    await this.ensureLoaded();
    return this.tags.get(id);
  }

  async getTags(ids: number[]): Promise<(Tag | undefined)[]> {
    await this.ensureLoaded();
    return ids.map(id => this.tags.get(id));
  }

  async getAllTags(): Promise<Map<number, Tag>> {
    await this.ensureLoaded();
    return this.tags;
  }

  clearCache(): void {
    this.tags.clear();
    this.types.clear();
    this.lastFetch = 0;
    delete globalThis.__luoguTagsCache;
    delete globalThis.__luoguTagsCacheTime;
  }
}

export const tagManager = new TagManager();
