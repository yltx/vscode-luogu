const { default: React, useEffect, useState } = await import('react');
const { VSCodeProgressRing, VSCodeButton, VSCodeCheckbox } = await import(
  '@vscode/webview-ui-toolkit/react'
);
const { FontAwesomeIcon } = await import('@fortawesome/react-fontawesome');
const { faRotateRight } = await import('@fortawesome/free-solid-svg-icons');
const { default: send } = await import('@w/webviewRequest');
const { UserName } = await import('@w/components');
const { default: Pagination } = await import('@w/components/pagination');
const { UserInfo } = await import('@/model/user');
const { formatTime, formatDate } = await import('@/utils/stringUtils');

import type {
  GetScoreboardResponse,
  Score,
  ProblemSummary,
  ProblemStatus,
  Maybe
} from 'luogu-api';
import './ranklist.css';
import { ColoredScore } from './scoreUtils';

export default function Ranklist({
  problems
}: {
  problems: {
    score: number;
    problem: ProblemSummary & Maybe<ProblemStatus> & { fullScore?: number };
  }[];
}) {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scoreboard, setScoreboard] = useState<GetScoreboardResponse | null>(
    null
  );
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  const refreshData = (isRefresh = false) => {
    let mounted = true;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    send('ContestRanklist', { page })
      .then(res => {
        if (!mounted) return;
        const data = res;
        if (data && data.scoreboard) {
          setScoreboard(data);
          const list = data.scoreboard;
          if (list && typeof list.count === 'number') {
            const result = list.result;
            const resultLen = Array.isArray(result)
              ? result.length
              : Object.keys(result).length;
            const per = list.perPage || resultLen || 1;
            setTotalPages(Math.max(1, Math.ceil(list.count / per)));
          }
        }
        setLastRefreshTime(new Date());
      })
      .finally(() => {
        if (!mounted) return;
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  };

  useEffect(() => refreshData(false), [page]);

  // 自动刷新逻辑
  useEffect(() => {
    let interval: number | null = null;

    if (autoRefresh) {
      // 立即刷新一次
      refreshData(true);
      // 然后每60秒刷新一次
      interval = window.setInterval(() => {
        refreshData(true);
      }, 60000);
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [autoRefresh, page]);

  const contestFullScore = problems.reduce(
    (a, b) => a + Math.floor((b.score / 100) * (b.problem.fullScore ?? 0)),
    0
  );

  return (
    <div className="cr">
      <div className="cr-table-wrapper">
        <div className="cr-table">
          <div className="cr-row cr-header" role="row">
            <div className="cr-col cr-col-rank">#</div>
            <div className="cr-col cr-col-user">用户</div>
            <div className="cr-col cr-col-score">总分</div>
            {problems.map((p, i) => (
              <div
                className="cr-col cr-col-score"
                key={i}
                title={p.problem.pid + ' ' + p.problem.title}
              >
                {String.fromCharCode(65 + i)}
              </div>
            ))}
          </div>
          {scoreboard &&
            scoreboard.scoreboard &&
            !loading &&
            Object.values(
              scoreboard.scoreboard.result satisfies { [index: number]: Score }
            ).map((s, i, items) => {
              const per = scoreboard.scoreboard.perPage || items.length;
              return (
                <div className="cr-row" role="row" key={i}>
                  <div className="cr-col cr-col-rank">
                    {(page - 1) * per + i + 1}
                  </div>
                  <div className="cr-col cr-col-user">
                    <UserName user={new UserInfo(s.user)} />
                  </div>
                  <div className="cr-col cr-col-score">
                    <ColoredScore
                      full={contestFullScore}
                      score={s.score ?? 0}
                    />
                    <span>({formatTime(s.runningTime)})</span>
                  </div>
                  {problems.map(p => {
                    const detail = (
                      s.details as {
                        [k: string]:
                          | { score: number; runningTime?: number | undefined }
                          | undefined;
                      }
                    )[p.problem.pid];
                    return (
                      <div className="cr-col cr-col-score" key={p.problem.pid}>
                        {detail !== undefined && (
                          <>
                            <ColoredScore
                              full={Math.floor(
                                (p.score / 100) * (p.problem.fullScore ?? 0)
                              )}
                              score={detail.score}
                            />
                            {detail.runningTime !== undefined && (
                              <span>({formatTime(detail.runningTime)})</span>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
        </div>
      </div>
      {loading && (
        <div className="cr-loading">
          <VSCodeProgressRing />
        </div>
      )}
      <div className="cr-options">
        <VSCodeButton
          appearance="icon"
          onClick={() => refreshData(true)}
          disabled={refreshing}
        >
          <FontAwesomeIcon icon={faRotateRight} spin={refreshing} />
          刷新
        </VSCodeButton>
        <VSCodeCheckbox
          checked={autoRefresh}
          onChange={e => setAutoRefresh((e.target as HTMLInputElement).checked)}
        >
          自动刷新
        </VSCodeCheckbox>
        {lastRefreshTime && (
          <span className="cr-last-refresh">
            上次刷新: {formatDate(lastRefreshTime.getTime())}
          </span>
        )}
        <Pagination
          className="cr-pagination"
          current={page}
          total={totalPages}
          onChange={p => setPage(p)}
        />
      </div>
    </div>
  );
}
