const { default: React, useState, useEffect } = await import('react');
const { VSCodeButton, VSCodeProgressRing } = await import(
  '@vscode/webview-ui-toolkit/react'
);
const { FontAwesomeIcon } = await import('@fortawesome/react-fontawesome');
const { faThumbsDown, faThumbsUp } = await import(
  '@fortawesome/free-solid-svg-icons'
);
const { default: send } = await import('@w/webviewRequest');
const { UserIcon, UserName } = await import('@w/components');
const { default: Md } = await import('@w/markdownViewer');
import '@w/common.css';
import './app.css';
const { default: Time } = await import('@w/components/time');
import type ArticleData from '@/model/article';

export default function App({ total }: { total: number }) {
  const [index, setIndex] = useState(0);
  if (total === 0)
    return <div className="solution-empty">当前题目暂无题解。</div>;
  return <SolutionPage index={index} setIndex={setIndex} total={total} />;
}

function SolutionPage({
  index,
  setIndex,
  total
}: {
  index: number;
  setIndex: (index: number) => void;
  total: number;
}) {
  const [article, setArticle] = useState<ArticleData | undefined | false>(
    undefined
  );
  function fetchData(ignore: () => boolean) {
    setArticle(undefined);
    send('getSolutionDetails', { index }).then(
      v => {
        if (ignore()) return;
        setArticle(v);
      },
      () => setArticle(false)
    );
  }
  useEffect(() => {
    let ignore = false;
    fetchData(() => ignore);
    return () => void (ignore = true);
  }, [index]);
  return (
    <div className="solution-page">
      {typeof article === 'object' ? (
        <main className="solution-scroll">
          <article className="solution-article">
            <header className="solution-meta">
              <span className="solution-author">
                <UserIcon url={article.author.icon} uid={article.author.uid} />
                <UserName user={article.author} />
                {'@ '}
                <Time time={article.createTime} />
              </span>
              <span className="solution-id">
                文章 ID：
                <a href={'https://www.luogu.com/article/' + article.lid}>
                  {article.lid}
                </a>
              </span>
            </header>
            {article.adminNote && (
              <aside className="solution-admin-note" role="note">
                <div className="solution-admin-note-title">管理员提示：</div>
                <div className="solution-admin-note-content">
                  <Md>{article.adminNote}</Md>
                </div>
              </aside>
            )}
            <div className="solution-content">
              <Md>{article.content}</Md>
            </div>
          </article>
        </main>
      ) : (
        <main className="solution-state">
          {article === undefined ? (
            <>
              <VSCodeProgressRing />
              <span>正在加载题解...</span>
            </>
          ) : (
            <>
              <VSCodeButton
                appearance="primary"
                onClick={() => fetchData(() => false)}
              >
                重试
              </VSCodeButton>
            </>
          )}
        </main>
      )}
      <ControlBar
        index={index}
        setIndex={setIndex}
        total={total}
        vote={
          article
            ? {
                ...article.vote,
                update: type =>
                  send('voteArticle', { lid: article.lid, type }).then(res =>
                    setArticle({ ...article, vote: res })
                  )
              }
            : undefined
        }
      />
    </div>
  );
}

function ControlBar({
  index,
  setIndex,
  total,
  vote
}: {
  index: number;
  setIndex: (index: number) => void;
  total: number;
  vote?: {
    upvotes: number;
    voted: -1 | 0 | 1;
    update: (type: -1 | 0 | 1) => void;
  };
}) {
  return (
    <footer className="solution-controls">
      {vote && (
        <div className="vote">
          <VSCodeButton
            appearance="icon"
            className={vote.voted === 1 ? 'vote-selected' : undefined}
            onClick={() => vote.update(vote.voted === 1 ? 0 : 1)}
          >
            <FontAwesomeIcon icon={faThumbsUp} />
            {vote.upvotes}
          </VSCodeButton>
          <VSCodeButton
            appearance="icon"
            className={vote.voted === -1 ? 'vote-selected' : undefined}
            onClick={() => vote.update(vote.voted === -1 ? 0 : -1)}
          >
            <FontAwesomeIcon icon={faThumbsDown} />
          </VSCodeButton>
        </div>
      )}
      <div className="pageShow">
        第 {index + 1}/{total} 篇
      </div>
      <div className="pageControl">
        <VSCodeButton
          appearance="secondary"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          上一篇
        </VSCodeButton>
        <VSCodeButton
          appearance="primary"
          disabled={total === 0 || index + 1 === total}
          onClick={() => setIndex(index + 1)}
        >
          下一篇
        </VSCodeButton>
      </div>
    </footer>
  );
}
