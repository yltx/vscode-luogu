import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { remarkLuoguMarkdownExtensions } from './luoguMarkdownExtensions';

type TestNode = {
  type: string;
  name?: string;
  data?: Record<string, unknown>;
  children?: TestNode[];
  value?: string;
};

function transform(child: TestNode) {
  const tree: TestNode = { type: 'root', children: [child] };
  remarkLuoguMarkdownExtensions()(tree);
  return child;
}

function properties(node: TestNode) {
  return node.data?.hProperties as Record<string, unknown>;
}

describe('Markdown directive fallbacks', () => {
  it('renders anti-ai directives as explicit alerts, including empty ones', () => {
    const directive = transform({
      type: 'leafDirective',
      name: 'anti-ai',
      children: []
    });

    expect(directive.data?.hName).toBe('aside');
    expect(properties(directive)).toMatchObject({
      role: 'alert',
      className: expect.arrayContaining([
        'luogu-directive-fallback',
        'luogu-directive-fallback-block',
        'luogu-directive-fallback-anti-ai'
      ])
    });
    expect(directive.children?.[0]).toMatchObject({
      value: 'AI 使用限制（anti-ai 指令）：',
      data: {
        hName: 'div',
        hProperties: { className: ['luogu-directive-fallback-label'] }
      }
    });
  });

  it('keeps unknown block directive content inside a labelled note', () => {
    const content = {
      type: 'paragraph',
      children: [
        { type: 'text', value: 'Do not mistake this for normal prose.' }
      ]
    };
    const directive = transform({
      type: 'containerDirective',
      name: 'mystery',
      children: [content]
    });

    expect(directive.data?.hName).toBe('aside');
    expect(properties(directive)).toMatchObject({
      role: 'note',
      className: expect.arrayContaining(['luogu-directive-fallback-block'])
    });
    expect(directive.children?.[0]?.value).toBe(
      '未知 Markdown 指令（mystery）：'
    );
    expect(directive.children?.[1]).toBe(content);
  });

  it('labels unknown text directives without turning them into block content', () => {
    const content = { type: 'text', value: 'inline content' };
    const directive = transform({
      type: 'textDirective',
      name: 'mystery',
      children: [content]
    });

    expect(directive.data?.hName).toBe('span');
    expect(properties(directive).className).toEqual(
      expect.arrayContaining(['luogu-directive-fallback-inline'])
    );
    expect(directive.children?.[1]).toBe(content);
  });
});

describe('inline code styling', () => {
  it('uses the editor monospace font without targeting pre code', () => {
    const css = readFileSync(new URL('../common.css', import.meta.url), 'utf8');

    expect(css).toContain(':not(pre) > code {');
    expect(css).toContain(
      'font-family: var(--vscode-editor-font-family, monospace);'
    );
    expect(css).not.toMatch(/pre\s*>\s*code\s*{[^}]*font-family/s);
  });
});
