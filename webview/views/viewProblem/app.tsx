const { default: React, useEffect, useState } = await import('react');
const { VSCodeButton } = await import('@vscode/webview-ui-toolkit/react');
const { FontAwesomeIcon } = await import('@fortawesome/react-fontawesome');
const { faChevronDown, faBook } = await import(
  '@fortawesome/free-solid-svg-icons'
);
const { ProblemDifficultyTag } = await import('@w/components');
const { default: Markdown } = await import('@w/markdownViewer');
const { ProblemTag } = await import('@w/components');
const { default: send } = await import('@w/webviewRequest');
const { formatTime, formatMemory } = await import('@/utils/stringUtils');
import '@w/utils/tags';

import { ProblemData } from 'luogu-api';

import CphIcon from './cphIcon';
import ContestProblemNavigation from './contestProblemNavigation';
import '@w/common.css';
import './app.css';
import SubmissionControls from './submissionControls';
import { VSCodeDropdown, VSCodeOption } from '@vscode/webview-ui-toolkit/react';

function formatTimeLimit(timeLimit: number[]) {
  const mintime = Math.min(...timeLimit),
    maxtime = Math.max(...timeLimit);
  const mintimestr = formatTime(mintime),
    maxtimestr = formatTime(maxtime);
  return mintimestr == maxtimestr ? mintimestr : `${mintimestr}~${maxtimestr}`;
}

function formatMemoryLimit(memoryLimit: number[]) {
  const minmemory = Math.min(...memoryLimit) * 2 ** 10,
    maxmemory = Math.max(...memoryLimit) * 2 ** 10;
  const minmemorystr = formatMemory(minmemory),
    maxmemorystr = formatMemory(maxmemory);
  return minmemorystr == maxmemorystr
    ? minmemorystr
    : `${minmemorystr}~${maxmemorystr}`;
}

export default function Problem({
  children: initialData
}: {
  children: ProblemData;
}) {
  const [data, setData] = useState(initialData);
  const languagesList = Object.keys(data.translations);
  const [cphType, setCphType] = useState(false);
  const [choosedLanguage, setChoosedLanguage] = useState(
    'zh-CN' in data.translations ? 'zh-CN' : languagesList[0]
  );
  useEffect(
    () => void send('checkCph', undefined).then(res => setCphType(res)),
    []
  );
  useEffect(() => {
    setChoosedLanguage(
      'zh-CN' in data.translations ? 'zh-CN' : Object.keys(data.translations)[0]
    );
  }, [data.problem.pid]);
  const problemContent =
    data.translations[choosedLanguage] || data.problem.content;
  return (
    <>
      <header className={data.contest ? 'withContestNavigation' : ''}>
        <div>
          <h1>
            <a
              href={
                'https://www.luogu.com.cn/problem/' +
                data.problem.pid +
                (data.contest ? '?contestId=' + data.contest.id : '')
              }
            >
              {data.problem.pid}
            </a>{' '}
            {data.problem.title ?? data.problem.content.name}
          </h1>
          <div>
            {languagesList.length > 1 && (
              <VSCodeDropdown
                ariaLabelledby="选择语言"
                value={choosedLanguage}
                onChange={e => setChoosedLanguage(e.target.value)}
              >
                {languagesList.map(s => (
                  <VSCodeOption value={s} key={s}>
                    {s}
                  </VSCodeOption>
                ))}
              </VSCodeDropdown>
            )}
            {cphType && (
              <VSCodeButton
                onClick={() => send('jumpToCph', undefined)}
                appearance="primary"
              >
                <div>
                  <CphIcon /> 传送至 CPH
                </div>
              </VSCodeButton>
            )}
            <SubmissionControls key={data.problem.pid} />
            {data.problem.type !== 'T' &&
              data.problem.type !== 'U' &&
              !data.contest && (
                <a
                  href={`command:luogu.solution?${encodeURIComponent(JSON.stringify([data.problem.pid]))}`}
                >
                  <VSCodeButton appearance="primary">
                    <div>
                      <FontAwesomeIcon icon={faBook} /> 查看题解
                    </div>
                  </VSCodeButton>
                </a>
              )}
          </div>
        </div>
        <div>
          <div>
            <div>时间限制</div>
            <div>{formatTimeLimit(data.problem.limits.time)}</div>
          </div>
          <div>
            <div>内存限制</div>
            <div>{formatMemoryLimit(data.problem.limits.memory)}</div>
          </div>
          <div>
            <div>题目难度</div>
            <div>
              <ProblemDifficultyTag difficulty={data.problem.difficulty || 0} />
            </div>
          </div>
          <div className={data.problem.tags.length ? 'haveTag' : undefined}>
            <div>题目标签</div>
            <div>
              {data.problem.tags.length ? (
                <FontAwesomeIcon icon={faChevronDown} />
              ) : (
                '暂无标签'
              )}
            </div>
            {data.problem.tags.length ? (
              <div>
                <div>
                  {data.problem.tags.map((x, i) => (
                    <ProblemTag key={i} tag={x} />
                  ))}
                </div>
              </div>
            ) : undefined}
          </div>
        </div>
      </header>
      <ContestProblemNavigation data={data} onProblemChange={setData} />
      <div>
        {problemContent.background && (
          <div>
            <h2>题目背景</h2>
            <Markdown>{problemContent.background}</Markdown>
          </div>
        )}
        {problemContent.description && (
          <div>
            <h2>题目描述</h2>
            <Markdown>{problemContent.description}</Markdown>
          </div>
        )}
        {problemContent.formatI && (
          <div>
            <h2>输入格式</h2>
            <Markdown>{problemContent.formatI}</Markdown>
          </div>
        )}
        {problemContent.formatO && (
          <div>
            <h2>输出格式</h2>
            <Markdown>{problemContent.formatO}</Markdown>
          </div>
        )}
        {data.problem.translation &&
          Object.keys(data.translations).length === 1 &&
          Object.keys(data.translations)[0] !== 'zh-CN' && (
            <div>
              <h2>题意翻译</h2>
              <Markdown>{data.problem.translation}</Markdown>
            </div>
          )}
        {data.problem.samples && (
          <div>
            <h2>输入输出样例</h2>
            <div className="problemSamples">
              {data.problem.samples.map(([input, output], id) => (
                <div key={id}>
                  <div>
                    <h3>输入#{id + 1}</h3>
                    <pre is="copyable-pre">
                      <code>{input}</code>
                    </pre>
                  </div>
                  <div>
                    <h3>输出#{id + 1}</h3>
                    <pre is="copyable-pre">
                      <code>{output}</code>
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {problemContent.hint && (
          <div>
            <h2>说明/提示</h2>
            <Markdown>{problemContent.hint}</Markdown>
          </div>
        )}
      </div>
    </>
  );
}
