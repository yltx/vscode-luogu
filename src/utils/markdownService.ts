import { createHash } from 'crypto';

type Renderer = Pick<
  typeof import('./markdown'),
  'default' | 'renderInlineMarkdown'
>;

/** One lazy renderer and a bounded HTML cache per extension host. */
export class MarkdownService {
  private renderer: Promise<Renderer> | undefined;
  private readonly pending = new Map<string, Promise<string>>();
  private readonly cache = new Map<string, { html: string; bytes: number }>();
  private cacheBytes = 0;
  private generation = 0;

  constructor(
    private readonly load: () => Promise<Renderer> = () => import('./markdown'),
    private readonly maxEntries = 32,
    private readonly maxBytes = 8 * 1024 * 1024
  ) {}

  render(markdown: string, inline = false): Promise<string> {
    if (!markdown) return Promise.resolve('');
    const key = createHash('sha256')
      .update(inline ? 'inline\0' : 'block\0')
      .update(markdown)
      .digest('hex');
    const cached = this.cache.get(key);
    if (cached) {
      this.cache.delete(key);
      this.cache.set(key, cached);
      return Promise.resolve(cached.html);
    }
    const pending = this.pending.get(key);
    if (pending) return pending;

    const generation = this.generation;
    this.renderer ??= this.load().catch(error => {
      this.renderer = undefined;
      throw error;
    });
    const task = this.renderer
      .then(renderer =>
        inline
          ? renderer.renderInlineMarkdown(markdown)
          : renderer.default(markdown)
      )
      .then(html => {
        // The upstream package can also report a render failure as HTML.
        if (generation === this.generation && !html.startsWith('<p>渲染失败：'))
          this.remember(key, html);
        return html;
      })
      .finally(() => {
        if (this.pending.get(key) === task) this.pending.delete(key);
      });
    this.pending.set(key, task);
    return task;
  }

  clear() {
    this.generation++;
    this.cache.clear();
    this.pending.clear();
    this.cacheBytes = 0;
  }

  private remember(key: string, html: string) {
    // Budget UTF-16 text storage, including the hashed key; object overhead is extra.
    const bytes = (key.length + html.length) * 2;
    if (this.maxEntries < 1 || bytes > this.maxBytes) return;
    while (
      this.cache.size >= this.maxEntries ||
      this.cacheBytes + bytes > this.maxBytes
    ) {
      const oldest = this.cache.entries().next().value;
      if (!oldest) break;
      this.cache.delete(oldest[0]);
      this.cacheBytes -= oldest[1].bytes;
    }
    this.cache.set(key, { html, bytes });
    this.cacheBytes += bytes;
  }
}

const markdownService = new MarkdownService();
export default markdownService;

export const renderInlineMarkdown = (markdown: string) =>
  markdownService.render(markdown, true);
