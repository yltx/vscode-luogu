import { getReactWebviewHtml } from '@/utils/html';
import { getWebviewViewColumn } from '@/utils/workspaceUtils';
import { ProblemData } from 'luogu-api';
import * as vscode from 'vscode';
import useWebviewResponseHandle from '@/utils/webviewResponse';
import { checkCPH, sendCphMessage } from './cph';
import jumpToCphEventEmitter from './jumpToCphEventEmitter';
import { tagManager } from '@/utils/tagManager';
import { getProblemData, searchContest } from '@/utils/api';
import { processAxiosError } from '@/utils/workspaceUtils';

export default async function showProblemWebview(initialData: ProblemData) {
  let data = initialData;
  const panel = vscode.window.createWebviewPanel(
    'luogu.problemPanel',
    `${data.problem.pid} ${data.problem.title ?? data.problem.content.name}`,
    getWebviewViewColumn(),
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.file(globalThis.distPath)],
      enableCommandUris: ['luogu.solution']
    }
  );
  useWebviewResponseHandle(panel.webview, {
    checkCph: checkCPH,
    jumpToCph: () => sendCphMessage(data),
    submitProblem: () =>
      vscode.commands.executeCommand<boolean>('luogu.sumbitCode', {
        pid: data.problem.pid,
        cid: data.contest?.id
      }),
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
        };
      } catch {
        return null;
      }
    },
    openContestProblem: async ({ pid }) => {
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
          title:
            problemData.problem.title ?? problemData.problem.content.name
        });
        data = problemData;
        panel.title = `${data.problem.pid} ${
          data.problem.title ?? data.problem.content.name
        }`;
        return data;
      } catch (error) {
        processAxiosError('查找题目')(error);
        throw error;
      }
    }
  });
  const jumpToCphListener = jumpToCphEventEmitter.event(() => {
    if (panel.active) sendCphMessage(data);
  });
  panel.onDidDispose(() => jumpToCphListener.dispose());
  const tagsArray = Array.from((await tagManager.getAllTags()).values());
  panel.webview.html = getReactWebviewHtml(
    panel.webview,
    'webview-viewProblem.js',
    {
      'lentille-context': data,
      'luogu-tags': tagsArray
    }
  );
}
