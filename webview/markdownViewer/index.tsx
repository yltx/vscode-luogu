import React, { memo, useEffect, useRef, useState } from 'react';
import renderMarkdown from '@/utils/markdown';
import { installCodeCopyButtons } from './codeCopy';
import './markdown.css';
import 'katex/dist/katex.css';

type RenderState = {
  markdown: string;
  html?: string;
  error?: string;
};

const ArticleViewer = memo(function ArticleViewer({
  children: markdown
}: {
  children: string;
}) {
  const [state, setState] = useState<RenderState>();
  const article = useRef<HTMLElement>(null);
  useEffect(() => {
    let cancelled = false;
    renderMarkdown(markdown)
      .then(html => {
        if (!cancelled) setState({ markdown, html });
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

  useEffect(() => {
    if (article.current && state?.markdown === markdown && !state.error)
      return installCodeCopyButtons(article.current);
  }, [state, markdown]);

  if (!state || state.markdown !== markdown)
    return (
      <article className="luogu-markdown" aria-busy="true">
        <span role="status">正在渲染……</span>
      </article>
    );
  if (state.error)
    return (
      <article className="luogu-markdown">
        <p role="alert">渲染失败：{state.error}</p>
      </article>
    );
  return (
    <article
      ref={article}
      className="luogu-markdown"
      dangerouslySetInnerHTML={{ __html: state.html ?? '' }}
    />
  );
});

export default ArticleViewer;
