import { getReactWebviewHtml } from '@/utils/html';
import { getWebviewViewColumn } from '@/utils/workspaceUtils';
import { ProblemData } from 'luogu-api';
import * as vscode from 'vscode';
import useWebviewResponseHandle from '@/utils/webviewResponse';
import { checkCPH, sendCphMessage } from './cph';
import jumpToCphEventEmitter from './jumpToCphEventEmitter';
import { tagManager } from '@/utils/tagManager';
import { searchContest } from '@/utils/api';

export default async function showProblemWebview(data: ProblemData) {
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
    openContestProblem: ({ pid }) =>
      vscode.commands.executeCommand<boolean>('luogu.searchProblem', {
        pid,
        cid: data.contest?.id
      })
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
