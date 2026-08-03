import { getProblemData, searchContest } from '@/utils/api';
import { processAxiosError } from '@/utils/workspaceUtils';
import type { ContestProblemNavigation } from '@w/views/viewProblem/contestProblemNavigationTypes';
import type { ProblemData } from 'luogu-api';
import * as vscode from 'vscode';

export const createContestProblemNavigationHandlers = (
  panel: vscode.WebviewPanel,
  data: ProblemData
) => {
  let isOpeningProblem = false;

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
      if (isOpeningProblem) return null;
      isOpeningProblem = true;
      try {
        const problemData = await getProblemData(pid, data.contest?.id);
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

        Object.assign(data, problemData);
        panel.title = `${data.problem.pid} ${
          data.problem.title ?? data.problem.content.name
        }`;
        return problemData;
      } catch (error) {
        processAxiosError('查找题目')(error);
        throw error;
      } finally {
        isOpeningProblem = false;
      }
    }
  };
};
