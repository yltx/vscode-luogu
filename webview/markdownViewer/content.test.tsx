import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderMarkdownTree } from '@/utils/markdown';
import { markdownContent } from './content';

describe('Markdown HTML to React integration', () => {
  it('preserves highlighted code and adds an accessible copy control', async () => {
    const tree = await renderMarkdownTree('```cpp\nint main() {}\n```');
    const html = renderToStaticMarkup(markdownContent(tree));
    expect(html).toContain('markdown-code');
    expect(html).toContain('aria-label="复制代码"');
    expect(html).toContain('--shiki-dark:');
    expect(html).toContain('tabindex="0"');
  });

  it('preserves formula markup, heading anchors and native folding', async () => {
    const tree = await renderMarkdownTree(
      '# 标题\n\n:::info[提示]{open}\n$x$\n:::'
    );
    const html = renderToStaticMarkup(markdownContent(tree));
    expect(html).toContain('heading-anchor');
    expect(html).toContain('viewBox="0 0 24 24"');
    expect(html).toContain('<details');
    expect(html).toContain('open=""');
    expect(html).toContain('<summary');
    expect(html).toContain('class="katex"');
  });
});
