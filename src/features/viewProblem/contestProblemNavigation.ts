import { getProblemData, searchContest } from '@/utils/api';
import { processAxiosError } from '@/utils/workspaceUtils';
import type { ProblemData } from 'luogu-api';
import * as vscode from 'vscode';

export type ContestProblemNavigation = {
  contestName: string;
  problems: {
    pid: string;
    title: string;
  }[];
};

export const createContestProblemNavigationHandlers = (
  panel: vscode.WebviewPanel,
  data: ProblemData
) => ({
  getContestProblemNavigation: async () => {
    if (!data.contest) return null;
    try {
      const contestData = await searchContest(data.contest.id);
      if (!contestData.contestProblems) return null;
      return {
        contestName: contestData.contest.name,
        problems: contestData.contestProblems.map(({ problem }) => ({
          pid: problem.pid,
          title: problem.title
        }))
      } satisfies ContestProblemNavigation;
    } catch {
      return null;
    }
  },
  openContestProblem: async ({ pid }: { pid: string }) => {
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
    }
  }
});
