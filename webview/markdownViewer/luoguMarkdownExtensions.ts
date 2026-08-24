import type { Element, ElementContent, Root, RootContent } from 'hast';

type MdastNode = {
  type: string;
  name?: string;
  attributes?: Record<string, string>;
  data?: Record<string, unknown>;
  children?: MdastNode[];
  value?: string;
};

const calloutNames = ['info', 'success', 'warning', 'error'] as const;
const defaultCalloutTitles: Record<(typeof calloutNames)[number], string> = {
  info: '提示',
  success: '成功',
  warning: '警告',
  error: '错误'
};

const directiveNodeTypes = [
  'containerDirective',
  'leafDirective',
  'textDirective'
] as const;

function addMdastClass(node: MdastNode, ...classNames: string[]) {
  const data = (node.data ??= {});
  const properties = ((data.hProperties as Record<string, unknown>) ??= {});
  const current = properties.className;
  properties.className = [
    ...(Array.isArray(current)
      ? current
      : typeof current === 'string'
        ? [current]
        : []),
    ...classNames
  ];
}

function isDirectiveLabel(node: MdastNode | undefined) {
  return node?.type === 'paragraph' && node.data?.directiveLabel === true;
}

function transformUnknownDirective(node: MdastNode) {
  const isAntiAi = node.name === 'anti-ai';
  const isInline = node.type === 'textDirective';
  const label = isAntiAi
    ? 'AI 使用限制（anti-ai 指令）'
    : `未知 Markdown 指令（${node.name ?? '未命名'}）`;

  (node.data ??= {}).hName = isInline ? 'span' : 'aside';
  addMdastClass(
    node,
    'luogu-directive-fallback',
    isInline
      ? 'luogu-directive-fallback-inline'
      : 'luogu-directive-fallback-block',
    ...(isAntiAi ? ['luogu-directive-fallback-anti-ai'] : [])
  );
  const properties = ((node.data ??= {}).hProperties ??= {}) as Record<
    string,
    unknown
  >;
  properties.role = isAntiAi ? 'alert' : 'note';

  (node.children ??= []).unshift({
    type: 'text',
    value: `${label}：`,
    data: {
      hName: isInline ? 'span' : 'div',
      hProperties: { className: ['luogu-directive-fallback-label'] }
    }
  });
}

function transformDirective(node: MdastNode) {
  if (
    !directiveNodeTypes.includes(
      node.type as (typeof directiveNodeTypes)[number]
    )
  )
    return;

  if (node.type === 'containerDirective' && node.name === 'align') {
    const alignment = Object.hasOwn(node.attributes ?? {}, 'right')
      ? 'right'
      : 'center';
    (node.data ??= {}).hName = 'div';
    addMdastClass(node, 'luogu-align', `luogu-align-${alignment}`);
    return;
  }

  if (node.type === 'containerDirective' && node.name === 'epigraph') {
    (node.data ??= {}).hName = 'blockquote';
    addMdastClass(node, 'luogu-epigraph');
    const label = node.children?.find(isDirectiveLabel);
    if (label && node.children) {
      addMdastClass(node, 'luogu-epigraph-with-footer');
      node.children = node.children.filter(child => child !== label);
      (label.data ??= {}).hName = 'footer';
      node.children.push(label);
    }
    return;
  }

  if (
    node.type !== 'containerDirective' ||
    !calloutNames.includes(node.name as (typeof calloutNames)[number])
  ) {
    transformUnknownDirective(node);
    return;
  }
  const kind = node.name as (typeof calloutNames)[number];
  (node.data ??= {}).hName = 'details';
  addMdastClass(node, 'luogu-callout', `luogu-callout-${kind}`);
  const properties = ((node.data ??= {}).hProperties ??= {}) as Record<
    string,
    unknown
  >;
  if (Object.hasOwn(node.attributes ?? {}, 'open')) properties.open = true;

  const children = (node.children ??= []);
  let label = children.find(isDirectiveLabel);
  if (label) {
    node.children = children.filter(child => child !== label);
  } else {
    label = {
      type: 'paragraph',
      data: { directiveLabel: true },
      children: [{ type: 'text', value: defaultCalloutTitles[kind] }]
    };
  }
  (label.data ??= {}).hName = 'summary';
  node.children.unshift(label);
}

function transformMdastChildren(parent: MdastNode) {
  const children = parent.children;
  if (!children) return;

  for (let index = 0; index < children.length; index++) {
    const child = children[index];
    if (
      child.type === 'leafDirective' &&
      child.name === 'cute-table' &&
      Object.hasOwn(child.attributes ?? {}, 'tuack')
    ) {
      const table = children[index + 1];
      children.splice(index, 1);
      index--;
      if (table?.type === 'table') {
        addMdastClass(table, 'luogu-cute-table', 'luogu-cute-table-tuack');
      }
      continue;
    }

    transformDirective(child);
    transformMdastChildren(child);
  }
}

export function remarkLuoguMarkdownExtensions() {
  return (tree: MdastNode) => transformMdastChildren(tree);
}

function getClassNames(element: Element) {
  const value = element.properties.className;
  if (Array.isArray(value)) return value.map(String);
  return typeof value === 'string' ? [value] : [];
}

function addHastClass(element: Element, ...classNames: string[]) {
  element.properties.className = [...getClassNames(element), ...classNames];
}

function textContent(node: RootContent): string {
  if (node.type === 'text') return node.value;
  if ('children' in node) return node.children.map(textContent).join('');
  return '';
}

function collectTableRows(node: Element): Element[] {
  const rows: Element[] = [];
  const walk = (current: ElementContent) => {
    if (current.type !== 'element') return;
    if (current.tagName === 'tr') {
      rows.push(current);
      return;
    }
    current.children.forEach(walk);
  };
  node.children.forEach(walk);
  return rows;
}

function mergeTableCells(table: Element) {
  const rows = collectTableRows(table);
  const grid: Array<Array<Element | undefined>> = [];

  rows.forEach((row, rowIndex) => {
    const cells = row.children.filter(
      (child): child is Element =>
        child.type === 'element' &&
        (child.tagName === 'td' || child.tagName === 'th')
    );
    const mergedUpThisRow = new Set<Element>();
    grid[rowIndex] = [];

    cells.forEach((cell, columnIndex) => {
      const marker = textContent(cell).trim();
      if (marker === '^') {
        const target = grid[rowIndex - 1]?.[columnIndex];
        if (target) {
          if (!mergedUpThisRow.has(target)) {
            const rowSpan = Number(target.properties.rowSpan ?? 1);
            target.properties.rowSpan = rowSpan + 1;
            mergedUpThisRow.add(target);
          }
          grid[rowIndex][columnIndex] = target;
          row.children = row.children.filter(child => child !== cell);
          return;
        }
      } else if (marker === '<') {
        const target = grid[rowIndex][columnIndex - 1];
        if (target) {
          const colSpan = Number(target.properties.colSpan ?? 1);
          target.properties.colSpan = colSpan + 1;
          grid[rowIndex][columnIndex] = target;
          row.children = row.children.filter(child => child !== cell);
          return;
        }
      }
      grid[rowIndex][columnIndex] = cell;
    });
  });
}

function splitNodesIntoLines(nodes: ElementContent[]): ElementContent[][] {
  const lines: ElementContent[][] = [[]];

  for (const node of nodes) {
    if (node.type === 'text') {
      const parts = node.value.split('\n');
      parts.forEach((part, index) => {
        if (part) lines.at(-1)?.push({ ...node, value: part });
        if (index < parts.length - 1) lines.push([]);
      });
      continue;
    }

    if (node.type === 'element') {
      const elementLines = splitNodesIntoLines(node.children);
      elementLines.forEach((children, index) => {
        if (children.length) lines.at(-1)?.push({ ...node, children });
        if (index < elementLines.length - 1) lines.push([]);
      });
      continue;
    }

    lines.at(-1)?.push(node);
  }

  return lines;
}

function enhanceCodeBlock(pre: Element) {
  const code = pre.children.find(
    (child): child is Element =>
      child.type === 'element' && child.tagName === 'code'
  );
  if (!code) return;
  const codeData = code.data as Record<string, unknown> | undefined;
  const meta = typeof codeData?.meta === 'string' ? codeData.meta : '';
  const showLineNumbers = /(?:^|\s)line-numbers(?:\s|$)/.test(meta);
  const lineRange = meta.match(/(?:^|\s)lines=(\d+)-(\d+)(?:\s|$)/);
  if (!showLineNumbers && !lineRange) return;

  let lines = splitNodesIntoLines(code.children);
  if (lines.length > 1 && lines.at(-1)?.length === 0)
    lines = lines.slice(0, -1);
  const rangeStart = lineRange ? Number(lineRange[1]) : -1;
  const rangeEnd = lineRange ? Number(lineRange[2]) : -1;
  code.children = lines.map((children, index): Element => {
    const lineNumber = index + 1;
    const line: Element = {
      type: 'element',
      tagName: 'span',
      properties: { className: ['luogu-code-line'] },
      children
    };
    if (lineNumber >= rangeStart && lineNumber <= rangeEnd) {
      addHastClass(line, 'luogu-code-line-highlighted');
    }
    return line;
  });
  addHastClass(pre, 'luogu-code-enhanced');
  if (showLineNumbers) addHastClass(pre, 'luogu-code-line-numbers');
}

export function rehypeLuoguMarkdownExtensions() {
  return (tree: Root) => {
    const walk = (node: RootContent) => {
      if (node.type !== 'element') return;
      if (node.tagName === 'table') mergeTableCells(node);
      if (node.tagName === 'pre') enhanceCodeBlock(node);
      node.children.forEach(walk);
    };
    tree.children.forEach(walk);
  };
}
