import { describe, expect, it } from 'vitest';
import renderMarkdown, { renderInlineMarkdown } from './markdown';

describe('shared Luogu Markdown rendering', () => {
  it('renders formulas and highlighted code with both editor themes', async () => {
    const html = await renderMarkdown('$x^2$\n\n```cpp\nint main() {}\n```');
    expect(html).toContain('class="katex"');
    expect(html).toContain('class="shiki');
    expect(html).toContain('--shiki-light:');
    expect(html).toContain('--shiki-dark:');
    expect(html).not.toContain('渲染失败');
  });

  it('keeps callout labels and makes folding work without page scripts', async () => {
    const html = await renderMarkdown(
      ':::info[**提示**]{open}\n正文\n:::\n\n:::warning[警告]\n注意\n:::'
    );
    expect(html).toContain('<details class="md-block info" open>');
    expect(html).toContain(
      '<summary class="md-block-title"><span><strong>提示'
    );
    expect(html).toContain('<details class="md-block warning">');
    expect(html).not.toContain('display:none');
    expect(html).not.toContain('toggle-btn');
  });

  it.each(['BV1xx411c7mD', 'av123456', '123456'])(
    'opens embedded Bilibili video %s externally with its page and timestamp',
    async id => {
      const html = await renderMarkdown(`![视频](bilibili:${id}?page=2&t=30)`);
      expect(html).toContain(
        `href="https://www.bilibili.com/video/${id.startsWith('BV') || id.startsWith('av') ? id : `av${id}`}?p=2&#x26;t=30"`
      );
      expect(html).not.toContain('<iframe');
    }
  );

  it('resolves Luogu paths while preserving anchors and external hosts', async () => {
    const html = await renderMarkdown(
      '[题目](/problem/P1000) [站外](https://example.com/) [锚点](#test) [图片站](//example.com/image)'
    );
    expect(html).toContain('href="https://www.luogu.com.cn/problem/P1000"');
    expect(html).toContain('href="https://example.com/"');
    expect(html).toContain('href="#test"');
    expect(html).toContain('href="https://example.com/image"');
  });

  it('does not reinterpret links or embed syntax inside code', async () => {
    const html = await renderMarkdown(
      '```text\n[题目](/problem/P1000)\n![视频](bilibili:av123)\n```'
    );
    expect(html).not.toContain('<a');
    expect(html).not.toContain('<iframe');
    expect(html).toContain('bilibili:av123');
  });

  it('uses the package HTML cleaning before displaying user content', async () => {
    const html = await renderMarkdown(
      '<script>alert(1)</script><img src="https://example.com/a.png" onerror="alert(2)">\n\n[bad](javascript:alert)'
    );
    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('src="https://example.com/a.png"');
  });

  it('renders formatted training titles without nesting paragraph elements in links', async () => {
    const html = await renderInlineMarkdown('**标题** $x$');
    expect(html).toContain('<strong>标题</strong>');
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('<p>');
  });

  it('supports empty content', async () => {
    expect(await renderMarkdown('')).toBe('');
    expect(await renderInlineMarkdown('')).toBe('');
  });
});
