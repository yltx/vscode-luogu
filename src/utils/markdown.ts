// @ts-ignore
import MarkdownIt from 'markdown-it';
// @ts-ignore
import markdownKatex from '@luogu-dev/markdown-it-katex';
// @ts-ignore
import markdownItHighlight from 'markdown-it-highlightjs';

const md = new MarkdownIt().use(markdownKatex).use(markdownItHighlight);

export default md
