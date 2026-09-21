import {
  RecordData,
  RecordStatus,
  SubtaskStatus,
  ClientboundUpdateRecordStatusMessageData
} from 'luogu-api';

import send from '@w/webviewRequest';

const { default: React } = await import('react');

const context = JSON.parse(
  document.getElementById('lentille-context')!.innerText
) as RecordData;

export const sortById = <T extends { id: number }>(
  values: T[] | { [id: number]: T }
) => Object.values(values).sort((a, b) => a.id - b.id);

export function getCompileResult(status: number, detail: RecordStatus) {
  const result = detail.compileResult;
  if (status === 0 || !result || typeof result.success !== 'boolean')
    return null;
  return result;
}

export function processTestcaseData(
  { status, detail }: { status: number; detail: RecordStatus },
  context: Pick<RecordData, 'record' | 'testCaseGroup'>
): RecordStatus {
  const isLuoguProblem = ['P', 'B', 'T', 'U'].includes(
    context.record.problem.type
  );
  if (!isLuoguProblem || status !== 1) return detail;

  const subtasks: { [id: number]: SubtaskStatus } = Object.fromEntries(
    Object.entries(context.testCaseGroup).map(([subtask, testcase]) => [
      subtask,
      {
        id: +subtask,
        score: 0,
        status: 1,
        testCases: Object.fromEntries(
          testcase.map(id => [
            id,
            {
              id,
              status: 1,
              time: NaN,
              memory: NaN,
              score: 0,
              signal: null,
              exitCode: NaN,
              description: 0,
              subtaskID: +subtask
            }
          ])
        ),
        judger: '',
        time: NaN,
        memory: NaN
      }
    ])
  );

  for (const subtask of Object.values(detail.judgeResult?.subtasks ?? {})) {
    subtasks[subtask.id] = {
      ...subtask,
      testCases: {
        ...subtasks[subtask.id]?.testCases,
        ...Object.fromEntries(
          Object.values(subtask.testCases).map(testcase => [
            testcase.id,
            testcase
          ])
        )
      }
    };
  }

  return {
    ...detail,
    judgeResult: {
      finishedCaseCount: 0,
      status: 0,
      time: 0,
      memory: 0,
      score: 0,
      ...detail.judgeResult,
      subtasks
    }
  };
}

export default function useRecordStatus() {
  const [recordStatus, setRecordStatus] = React.useState<UpdateRecordData>(
    () => ({
      ...context.record,
      detail: processTestcaseData(context.record, context)
    })
  );
  React.useEffect(() => {
    const onMessage = ({ data }: MessageEvent<MessageTypes>) => {
      if (data.type === 'updateRecord') {
        setRecordStatus({
          ...data.data,
          detail: processTestcaseData(data.data, context)
        });
      }
    };
    window.addEventListener('message', onMessage);
    void send('RecordReady', undefined).catch(error =>
      console.error('启动评测记录更新失败', error)
    );
    return () => window.removeEventListener('message', onMessage);
  }, []);
  return { ...context.record, ...recordStatus };
}

type UpdateRecordData = Omit<
  ClientboundUpdateRecordStatusMessageData['record'],
  'score' | 'memory' | 'time'
> & {
  score?: number | null;
  memory: number | null;
  time: number | null;
};

export type MessageTypes = {
  type: 'updateRecord';
  data: UpdateRecordData;
};
