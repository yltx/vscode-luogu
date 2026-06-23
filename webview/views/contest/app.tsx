const { default: React } = await import('react');
const { Tag } = await import('@w/components');
const { ContestRuleTypes, ContestVisibilityTypes } = await import(
  '@/utils/shared'
);
const { default: Time } = await import('@w/components/time');
const { UserName } = await import('@w/components');
const { default: ColorPalette } = await import('@/utils/color');
const { UserInfo } = await import('@/model/user');

const { default: ArticleViewer } = await import('@w/markdownViewer');
const { default: Navbar } = await import('@w/components/navbar');
const { default: send } = await import('@w/webviewRequest');

import Ranklist from './ranklist';
import { FormatScore } from './scoreUtils';
const { FontAwesomeIcon } = await import('@fortawesome/react-fontawesome');
const { faCheck } = await import('@fortawesome/free-solid-svg-icons');
const { VSCodeButton } = await import('@vscode/webview-ui-toolkit/react');
import type { ContestData } from 'luogu-api';
const { default: ReloadButton } = await import('@w/components/reload');

import '@w/common.css';
import './app.css';

export default function App({
  children: contestData
}: {
  children: ContestData;
}) {
  const [tab, setTab] = React.useState<'detail' | 'ranklist'>('detail');
  const [data, setData] = React.useState<ContestData>(contestData);
  const [reloading, setReloading] = React.useState(false);
  const [monitoring, setMonitoring] = React.useState(false);
  const [joinState, setJoinState] = React.useState<
    'notJoined' | 'joining' | 'joined'
  >('notJoined');
  React.useEffect(() => {
    setJoinState(data.joined ? 'joined' : 'notJoined');
  }, [data]);
  async function reloadPage() {
    setReloading(true);
    try {
      const fresh = await send('ContestReload', undefined);
      setData(fresh);
    } finally {
      setReloading(false);
    }
  }
  React.useEffect(() => {
    let mounted = true;
    const interval = setInterval(async () => {
      const cur = await send('ContestMonitorGet', undefined);
      if (!mounted) return;
      setMonitoring(cur === data.contest.id);
    }, 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [data.contest.id]);
  return (
    <>
      <ContestTimeline
        start={data.contest.startTime}
        end={data.contest.endTime}
        onStart={reloadPage}
        onEnd={reloadPage}
      />
      <header>
        <h1>{data.contest.name}</h1>
        <div>
          <div>
            比赛 ID：
            <a href={`https://www.luogu.com.cn/contest/${data.contest.id}`}>
              {data.contest.id}
            </a>{' '}
            <Tag>{ContestRuleTypes[data.contest.method]}</Tag>
            <Tag>{ContestVisibilityTypes[data.contest.visibility]}</Tag>
            {data.contest.rated && <Tag color={ColorPalette['cyan-3']}>咕</Tag>}
            {data.contest.eloThreshold !== null &&
              data.contest.eloThreshold >= 0 && (
                <Tag
                  color={
                    ColorPalette[
                      data.contest.eloThreshold <= 1200
                        ? 'blue-3'
                        : data.contest.eloThreshold <= 1600
                          ? 'green-3'
                          : data.contest.eloThreshold <= 2000
                            ? 'orange-3'
                            : 'red-3'
                    ]
                  }
                >
                  ELO
                  {data.contest.eloThreshold < 9999 &&
                    ' for ≤' + data.contest.eloThreshold}
                </Tag>
              )}
          </div>
          <div>
            比赛时间：
            <Time time={data.contest.startTime * 1000} withoutSecond /> ~{' '}
            <Time time={data.contest.endTime * 1000} withoutSecond /> (
            <ContestDuringTime
              start={data.contest.startTime}
              end={data.contest.endTime}
            />
            )
          </div>
          <div>
            举办者：
            {'uid' in data.contest.host ? (
              <UserName user={new UserInfo(data.contest.host)} />
            ) : (
              <a href={'https://www.luogu.com.cn/team/' + data.contest.host.id}>
                {data.contest.host.name}
              </a>
            )}
          </div>
          <div>
            共 {data.contest.problemCount} 题 · {data.contest.totalParticipants}{' '}
            人报名
          </div>
        </div>
        <div className="header-actions">
          <VSCodeButton
            appearance="secondary"
            onClick={async () => {
              if (monitoring) {
                const ok = await send('ContestMonitorStop', undefined);
                if (ok) setMonitoring(false);
              } else {
                const ok = await send('ContestEnterContestMode', undefined);
                if (ok) setMonitoring(true);
              }
            }}
          >
            {monitoring ? '已在比赛模式' : '进入比赛模式'}
          </VSCodeButton>
          <VSCodeButton
            appearance="primary"
            disabled={joinState !== 'notJoined'}
            onClick={async () => {
              setJoinState('joining');
              if (await send('ContestJoin', undefined)) reloadPage();
              else setJoinState('notJoined');
            }}
          >
            {joinState === 'joined' ? '已报名' : '报名比赛'}
          </VSCodeButton>
        </div>
      </header>
      {data.contestProblems && (
        <>
          <hr />
          <div className="contest-problems">
            <div className="cp-table">
              <div className="cp-row cp-header" role="row">
                <div className="cp-col cp-col-index">#</div>
                <div className="cp-col cp-col-maxscore">倍率(%)</div>
                <div className="cp-col cp-col-title">题目名称</div>
                <div className="cp-col cp-col-submitted">已提交</div>
              </div>
              {data.contestProblems.map((p, i) => (
                <div className="cp-row" role="row" key={p.problem.pid}>
                  <div className="cp-col cp-col-index">
                    {String.fromCharCode(65 + i)}
                  </div>
                  <div className="cp-col cp-col-maxscore">
                    <FormatScore score={p.score} />
                  </div>
                  <div className="cp-col cp-col-title" title={p.problem.title}>
                    <a
                      href={
                        'command:luogu.searchProblem?' +
                        encodeURIComponent(
                          JSON.stringify({
                            pid: p.problem.pid,
                            cid: data.contest.id
                          })
                        )
                      }
                    >
                      {p.problem.title}
                    </a>
                  </div>
                  <div className="cp-col cp-col-submitted">
                    {p.problem.submitted && (
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="submitted-icon"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      <Navbar
        actions={[
          {
            id: 'detail',
            label: '比赛详情',
            checked: tab === 'detail',
            onClick: () => setTab('detail')
          },
          {
            id: 'rank',
            label: '排行榜',
            checked: tab === 'ranklist',
            onClick: () => setTab('ranklist')
          }
        ]}
      />
      {tab === 'detail' && (
        <ArticleViewer>{data.contest.description}</ArticleViewer>
      )}
      {tab === 'ranklist' && data.contestProblems && (
        <Ranklist problems={data.contestProblems} />
      )}
      <ReloadButton disabled={reloading} onClick={reloadPage} />
    </>
  );
}

function ContestDuringTime({ start, end }: { start: number; end: number }) {
  let d = end - start;
  const ds = Math.floor((d /= 1)) % 60;
  const dm = Math.floor((d /= 60)) % 60;
  const dh = Math.floor((d /= 60)) % 24;
  const dd = Math.floor((d /= 24));
  return (
    <time dateTime={`${dd}d ${dh}h ${dm}m ${ds}s`}>
      {dd > 0 && String(dd).padStart(2, '0') + ':'}
      {String(dh).padStart(2, '0')}:{String(dm).padStart(2, '0')}:
      {String(ds).padStart(2, '0')}
    </time>
  );
}

function ContestTimeline({
  start,
  end,
  onStart,
  onEnd
}: {
  start: number;
  end: number;
  onStart?: () => void;
  onEnd?: () => void;
}) {
  const [nowSecond, setNowSecond] = React.useState(
    Math.floor(Date.now() / 1000)
  );
  React.useEffect(() => {
    let cancel = false;
    // 组件挂载后已经超过时间就不再运行了
    const mountTimeSeconds = Date.now() / 1000;
    let calledOnStart = mountTimeSeconds >= start;
    let calledOnEnd = mountTimeSeconds >= end;
    function tick() {
      if (cancel) return;
      setNowSecond(prevNowSecond => {
        const newNowSecond = Math.floor(Date.now() / 1000);
        if (prevNowSecond !== newNowSecond) {
          if (!calledOnStart && onStart && newNowSecond >= start) {
            onStart();
            calledOnStart = true;
          }
          if (!calledOnEnd && onEnd && newNowSecond >= end) {
            onEnd();
            calledOnEnd = true;
          }
        }
        if (newNowSecond <= end) requestAnimationFrame(tick);
        return newNowSecond;
      });
    }
    tick();
    return () => {
      cancel = true;
    };
  }, [start, end, onStart, onEnd]);
  return (
    nowSecond >= start &&
    nowSecond <= end && (
      <div className="contest-timeline">
        <div
          className="contest-timeline-line"
          style={{ width: `${((nowSecond - start) / (end - start)) * 100}%` }}
        ></div>
        <div className="contest-timeline-time">
          <ContestDuringTime start={nowSecond} end={end} />
        </div>
      </div>
    )
  );
}
