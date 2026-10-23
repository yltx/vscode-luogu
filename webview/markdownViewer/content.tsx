import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { Root } from 'hast';
import { CopyablePre } from './copyablePre';

export function markdownContent(tree: Root) {
  return toJsxRuntime(tree, {
    Fragment,
    jsx,
    jsxs,
    components: { pre: CopyablePre },
    elementAttributeNameCase: 'react',
    stylePropertyNameCase: 'dom',
    ignoreInvalidStyle: true
  });
}
