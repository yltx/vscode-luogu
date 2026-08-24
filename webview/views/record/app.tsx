const { default: React } = await import('react');
const { VSCodeButton, VSCodeProgressRing } = await import(
  '@vscode/webview-ui-toolkit/react'
);
import { SubtaskStatus, TestCaseStatus } from 'luogu-api';
import useRecordStatus from './data';

const { formatMemory, formatTime } = await import('@/utils/stringUtils');
const { ProblemNameWithDifficulty, Spinner } = await import('@w/components');
const { RecordStatus, getScoreColor, LanguageString, vscodeLanguageId } =
  await import('@/utils/shared');
const { default: Time } = await import('@w/components/time');
const { default: send } = await import('@w/webviewRequest');
await import('@w/copyablePreElement');

import '@w/common.css';
import './app.css';

export default function App() {
  const record = useRecordStatus();
  console.log(record);
  return (
    <>
      <h1>
        <a href={`https://www.luogu.com.cn/record/` + record.id}>
          R{record.id}
        </a>{' '}
        记录详情
      </h1>
      <div>
        <div>
          <span>所属题目</span>
          <a
            href={
              'command:luogu.searchProblem?' +
              encodeURIComponent(
                JSON.stringify([
                  { pid: record.problem.pid, cid: record.contest?.id }
                ])
              )
            }
          >
            <ProblemNameWithDifficulty
              {...record.problem}
              difficulty={record.problem?.difficulty || 0}
              contestId={record.contest?.id}
            />
          </a>
        </div>
        <div>
          <span>评测状态</span>
          <span
            style={{
              color: RecordStatus[record.status].color,
              fontWeight: 'bold'
            }}
          >
            {RecordStatus[record.status].name}
          </span>
        </div>
        {typeof record.score === 'number' && (
          <div>
            <span>评测分数</span>
            <span
              style={{ fontWeight: 'bold', color: getScoreColor(record.score) }}
            >
              {record.score}
            </span>
          </div>
        )}
        <div>
          <span>提交时间</span>
          <span>
            <Time time={record.submitTime * 1000} />
          </span>
        </div>
        <div>
          <span>语言</span>
          <span>
            {LanguageString[record.language]}
            {record.enableO2 && ' O2'}
          </span>
        </div>
        <div>
          <span>代码长度</span>
          <span>
            {record.sourceCodeLength < 2 ** 10
              ? record.sourceCodeLength + 'B'
              : (record.sourceCodeLength / 2 ** 10).toFixed(2) + 'KiB'}
          </span>
        </div>
        <div>
          <span>用时/内存</span>
          <span>
            {record.time !== null ? formatTime(record.time) : '-'} /{' '}
            {record.memory !== null
              ? formatMemory(record.memory * 2 ** 10)
              : '-'}
          </span>
        </div>
        {record.sourceCode !== undefined && (
          <div>
            <span>源代码</span>
            <a
              href={
                'command:luogu.openUntitledTextDocument?' +
                encodeURIComponent(
                  JSON.stringify({
                    content: record.sourceCode,
                    language: vscodeLanguageId[record.language]
                  })
                )
              }
            >
              在 vscode 中查看
            </a>
          </div>
        )}
      </div>
      <TestcaseDownload />
      {record.status !== 0 && record.status !== -1 && record.status !== 2 && (
        <>
          <hr />
          <div className="testCaseData">
            <h2>测试点信息</h2>
            {record.detail.judgeResult && (
              <TestCaseWarp>{record.detail.judgeResult.subtasks}</TestCaseWarp>
            )}
          </div>
        </>
      )}
      {record.detail.compileResult !== null && (
        <>
          <hr />
          <div>
            <h2>编译信息</h2>
            <p>
              {record.detail.compileResult.success ? '编译成功' : '编译失败'}
            </p>
            {record.detail.compileResult.message !== null && (
              <pre is="copyable-pre">{record.detail.compileResult.message}</pre>
            )}
          </div>
        </>
      )}
    </>
  );
}

function TestcaseDownload() {
  const [testcaseId, setTestcaseId] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [downloading, setDownloading] = React.useState(false);
  const [error, setError] = React.useState<string>();

  React.useEffect(() => {
    let active = true;
    send('QueryDownloadableTestcase', undefined)
      .then(id => active && setTestcaseId(id))
      .catch(error => active && setError(error.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading)
    return (
      <div className="testcase-download-status">
        <VSCodeProgressRing /> 正在查询可下载测试点
      </div>
    );
  if (error)
    return (
      <div className="testcase-download-error">查询测试点失败：{error}</div>
    );
  if (testcaseId === null) return null;

  return (
    <div className="testcase-download">
      <span>测试点 #{testcaseId} 可下载</span>
      <VSCodeButton
        appearance="secondary"
        disabled={downloading}
        onClick={async () => {
          setDownloading(true);
          setError(undefined);
          try {
            await send('DownloadTestcase', { testcaseId });
          } catch (error) {
            setError(error instanceof Error ? error.message : String(error));
          } finally {
            setDownloading(false);
          }
        }}
      >
        {downloading ? '正在下载...' : '下载输入与输出'}
      </VSCodeButton>
      {error && <span className="testcase-download-error">{error}</span>}
    </div>
  );
}

function TestCaseWarp({
  children: data
}: {
  children: { [group: number]: SubtaskStatus };
}) {
  return (
    <div>
      {Object.entries(data).map(([subtaskId, subtask]) => (
        <div key={subtaskId}>
          <h3>Subtask #{subtaskId}</h3>
          <div>
            {Object.entries(subtask.testCases).map(([testcase, data]) => (
              <TestCase key={testcase}>{data}</TestCase>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TestCase({ children: data }: { children: TestCaseStatus }) {
  return (
    <div>
      <div
        style={{
          backgroundColor: RecordStatus[data.status].color
        }}
      >
        <div>#{data.id + 1}</div>
        <div>
          {data.status !== 1 ? (
            RecordStatus[data.status].shortName
          ) : (
            <Spinner />
          )}
        </div>
        {data.status !== 1 && (
          <div>
            {formatTime(data.time)}/{formatMemory(data.memory * 2 ** 10)}
          </div>
        )}
      </div>
      <div>
        {[
          data.description ? data.description : undefined,
          data.signal ? 'Received signal ' + data.signal : undefined,
          data.score + ' points',
          'Exit with code ' + data.exitCode
        ]
          .filter(x => x !== undefined)
          .join('\n')}
      </div>
    </div>
  );
}
