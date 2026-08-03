import { getProblemData, searchContest } from '@/utils/api';
import { processAxiosError } from '@/utils/workspaceUtils';
import type { ContestProblemNavigation } from '@w/views/viewProblem/contestProblemNavigationTypes';
import type { ProblemData } from 'luogu-api';
import * as vscode from 'vscode';

export const createContestProblemNavigationHandlers = (
  panel: vscode.WebviewPanel,
  data: ProblemData
) => {
  let latestOpenRequest = 0;

  return {
    getContestProblemNavigation: async () => {
      if (!data.contest) return null;
      try {
        const contestData = await searchContest(data.contest.id);
        if (!contestData.contestProblems) return null;
        return {
          contestName: contestData.contest.name,
          problems: contestData.contestProblems.map(({ problem }) => {
            const title =
              ('name' in problem && typeof problem.name === 'string'
                ? problem.name
                : problem.title) || problem.pid;
            return {
              pid: problem.pid,
              title
            };
          })
        } satisfies ContestProblemNavigation;
      } catch {
        return null;
      }
    },
    openContestProblem: async ({ pid }: { pid: string }) => {
      const requestId = ++latestOpenRequest;
      try {
        const problemData = await getProblemData(pid, data.contest?.id);
        if (requestId !== latestOpenRequest) return null;

        Object.assign(data, problemData);
        panel.title = `${data.problem.pid} ${
          data.problem.title ?? data.problem.content.name
        }`;
        await globalThis.luogu.historyTreeviewProvider.addItem({
          type: 'problem',
          pid: problemData.problem.pid,
          contest: problemData.contest
            ? {
                contestId: problemData.contest.id,
                title: problemData.contest.name
              }
            : undefined,
          title: problemData.problem.title ?? problemData.problem.content.name
        });
        return requestId === latestOpenRequest ? problemData : null;
      } catch (error) {
        if (requestId === latestOpenRequest)
          processAxiosError('查找题目')(error);
        throw error;
      }
    }
  };
};
