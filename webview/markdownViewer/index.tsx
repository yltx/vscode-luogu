import React, { memo, useEffect, useState } from 'react';
import { renderMarkdownTree } from '@/utils/markdown';
import { markdownContent } from './content';
import './markdown.css';
import 'katex/dist/katex.css';

type RenderState = {
  markdown: string;
  content?: React.ReactNode;
  error?: string;
};

const ArticleViewer = memo(function ArticleViewer({
  children: markdown
}: {
  children: string;
}) {
  const [state, setState] = useState<RenderState>();
  useEffect(() => {
    let cancelled = false;
    renderMarkdownTree(markdown)
      .then(tree => {
        const content = markdownContent(tree);
        if (!cancelled) setState({ markdown, content });
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setState({
            markdown,
            error: error instanceof Error ? error.message : '未知错误'
          });
      });
    return () => {
      cancelled = true;
    };
  }, [markdown]);

  if (!state || state.markdown !== markdown)
    return (
      <article className="luogu-markdown" aria-busy="true">
        <span role="status">正在渲染……</span>
      </article>
    );
  return (
    <article className="luogu-markdown">
      {state.error ? (
        <p role="alert">渲染失败：{state.error}</p>
      ) : (
        state.content
      )}
    </article>
  );
});

export default ArticleViewer;
