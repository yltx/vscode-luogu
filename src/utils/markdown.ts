import renderLuoguMarkdown from '@luogu-saver-next/markdown-renderer';
import { fromHtml } from 'hast-util-from-html';
import { toHtml } from 'hast-util-to-html';
import type { Element, Root } from 'hast';

const luoguOrigin = 'https://www.luogu.com.cn';

function hasClass(element: Element, name: string) {
  const classes = element.properties.className;
  return Array.isArray(classes)
    ? classes.includes(name)
    : typeof classes === 'string' && classes.split(/\s+/).includes(name);
}

function adaptEmbed(element: Element) {
  const source = element.properties.src;
  let href: string | undefined;
  let label = '在浏览器中打开嵌入内容';
  if (typeof source === 'string') {
    try {
      const url = new URL(source, luoguOrigin);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        href = url.href;
        if (
          url.hostname === 'player.bilibili.com' &&
          url.pathname === '/player.html'
        ) {
          const bvid = url.searchParams.get('bvid');
          const aid = url.searchParams.get('aid');
          const videoId = bvid || (aid && `av${aid}`);
          if (videoId) {
            const video = new URL(
              `/video/${encodeURIComponent(videoId)}`,
              'https://www.bilibili.com'
            );
            video.searchParams.set('p', url.searchParams.get('page') || '1');
            video.searchParams.set('t', url.searchParams.get('t') || '0');
            href = video.href;
            label = `在 bilibili 中打开视频 ${videoId}`;
          }
        }
      }
    } catch {
      // Invalid embedded URLs should not prevent the rest of an article rendering.
    }
  }
  element.tagName = href ? 'a' : 'span';
  element.properties = href ? { href } : {};
  element.children = [{ type: 'text', value: href ? label : '嵌入内容不可用' }];
}

function adaptCallout(element: Element) {
  const title = element.children.find(
    (child): child is Element =>
      child.type === 'element' && hasClass(child, 'md-block-title')
  );
  const body = element.children.find(
    (child): child is Element =>
      child.type === 'element' && hasClass(child, 'md-block-body')
  );
  if (!title || !body) return;

  element.tagName = 'details';
  element.properties.open = body.properties.style !== 'display:none';
  title.tagName = 'summary';
  title.children = title.children.filter(
    child => !(child.type === 'element' && hasClass(child, 'toggle-btn'))
  );
  delete body.properties.style;
}

/** Adapt the renderer's sanitized output to VS Code, without parsing Markdown here. */
export async function renderMarkdownTree(markdown: string): Promise<Root> {
  const tree = fromHtml(await renderLuoguMarkdown(markdown), {
    fragment: true
  });
  const walk = (element: Element) => {
    if (element.tagName === 'iframe') adaptEmbed(element);
    if (hasClass(element, 'md-block')) adaptCallout(element);
    if (
      element.tagName === 'a' &&
      typeof element.properties.href === 'string'
    ) {
      const href = element.properties.href;
      if (href.startsWith('/'))
        element.properties.href = new URL(href, luoguOrigin).href;
    }
    element.children.forEach(child => {
      if (child.type === 'element') walk(child);
    });
  };
  tree.children.forEach(child => {
    if (child.type === 'element') walk(child);
  });
  return tree;
}

export default async function renderMarkdown(
  markdown: string
): Promise<string> {
  return toHtml(await renderMarkdownTree(markdown));
}

export async function renderInlineMarkdown(markdown: string): Promise<string> {
  const tree = await renderMarkdownTree(markdown);
  tree.children = tree.children.flatMap(child =>
    child.type === 'element' && child.tagName === 'p' ? child.children : [child]
  );
  return toHtml(tree);
}
