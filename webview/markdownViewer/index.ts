const { memo } = await import('react');
const props = await import('react/jsx-runtime');
const { default: getLuoguProcessor } = await import('lg-markdown-processor');
const { fromHtml: hastUtilFromHtml } = await import('hast-util-from-html');
const { default: rehypeReact } = await import('rehype-react');
const { visit, SKIP } = await import('unist-util-visit');
const { faBilibili } = await import('@fortawesome/free-brands-svg-icons');
const { icon } = await import('@fortawesome/fontawesome-svg-core');
const { default: rehypeHighlight } = await import('rehype-highlight');
const { default: remarkDirective } = await import('remark-directive');
const { remarkLuoguMarkdownExtensions, rehypeLuoguMarkdownExtensions } =
  await import('./luoguMarkdownExtensions');
await import('../copyablePreElement');
import './hljsTheme';
import './luoguMarkdownExtensions.css';
import 'katex/dist/katex.css';

const bilibiliIconHastElement = hastUtilFromHtml(icon(faBilibili).html[0], {
  fragment: true
}).children[0] as import('hast').Element;

const rehypeReactConfig: import('hast-util-to-jsx-runtime').Options = {
  Fragment: 'article',
  // @ts-expect-error
  jsx: props.jsx,
  // @ts-expect-error
  jsxs: props.jsxs
};

const processor = getLuoguProcessor({
  remarkPlugins: [remarkDirective, remarkLuoguMarkdownExtensions],
  rehypePlugins: [
    rehypeHighlight,
    rehypeLuoguMarkdownExtensions,
    // vscode 里没法放 bilibili 的 iframe，拿链接顶一下
    () => (tree: import('hast').Root) =>
      visit(tree, 'element', function (e) {
        if (e.tagName === 'code') return SKIP;
        let className = e.properties['className'];
        if (typeof className === 'string') className = [className];
        if (
          Array.isArray(className) &&
          (className.includes('katex') || className.includes('katex-display'))
        )
          return SKIP;
        if ('div' !== e.tagName || !e.properties) return;
        const t = e.properties.src;
        if ('string' != typeof t) return;
        if (!t.startsWith('bilibili:')) return;
        const parsedUrl = new URL(t);
        if ('bilibili:' !== parsedUrl.protocol) return;
        const query = Object.fromEntries(parsedUrl.searchParams);
        const args: { p?: string; t?: string } = {},
          pathname = parsedUrl.pathname.slice(1);
        let videoId: string;
        const aidMatch = pathname.match(/^(av)?(\d+)$/);
        let page: number, time: number;
        aidMatch
          ? (videoId = 'av' + aidMatch[2])
          : 'bv' !== pathname.substring(0, 2).toLowerCase()
            ? (videoId = 'bv' + pathname)
            : (videoId = pathname);
        (page = Number(query.page || '')) && (args.p = String(page));
        (time = Number(query.t || '')) && (args.t = String(time));
        e.tagName = 'div';
        e.properties.style = '';
        e.children = [
          {
            type: 'element',
            tagName: 'a',
            properties: {
              href: `https://www.bilibili.com/video/${videoId}?`.concat(
                Object.entries(args)
                  .filter(s => s[1] !== undefined)
                  .map(e =>
                    e
                      .map(e => encodeURIComponent(String(e)))
                      .join('=')
                      .replace(/=$/, '')
                  )
                  .join('&')
              )
            },
            children: [
              bilibiliIconHastElement,
              {
                type: 'text',
                value: ` 在 bilibili 中打开视频 ${videoId}`
              }
            ]
          }
        ];
      }),
    () => (tree: import('hast').Root) =>
      visit(tree, 'element', function (e) {
        if (e.tagName === 'code') return SKIP;
        let className = e.properties['className'];
        if (typeof className === 'string') className = [className];
        if (
          Array.isArray(className) &&
          (className.includes('katex') || className.includes('katex-display'))
        )
          return SKIP;
        if (e.tagName !== 'a') return;
        if (
          typeof e.properties.href === 'string' &&
          e.properties.href.length >= 1 &&
          e.properties.href[0] === '/'
        )
          e.properties.href = 'https://www.luogu.com.cn' + e.properties.href;
      })
  ]
})
  .use(
    () => (tree: import('hast').Root) =>
      visit(tree, 'element', function (e) {
        if (e.tagName === 'pre') {
          e.properties['is'] = 'copyable-pre';
          return SKIP;
        }
        let className = e.properties['className'];
        if (typeof className === 'string') className = [className];
        if (
          Array.isArray(className) &&
          (className.includes('katex') || className.includes('katex-display'))
        )
          return SKIP;
      })
  )
  .use(rehypeReact, rehypeReactConfig)
  .freeze();

const ArticleViewer = memo(function ({
  children: markdown
}: {
  children: string;
}) {
  return processor.processSync(markdown).result;
});
export default ArticleViewer;
