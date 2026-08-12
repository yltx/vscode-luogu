import { getReactWebviewHtml } from '@/utils/html';
import { createContestProblemNavigationHandlers } from './contestProblemNavigation';
import { getWebviewViewColumn } from '@/utils/workspaceUtils';
import { ProblemData } from 'luogu-api';
import * as vscode from 'vscode';
import useWebviewResponseHandle from '@/utils/webviewResponse';
import { checkCPH, sendCphMessage } from './cph';
import jumpToCphEventEmitter from './jumpToCphEventEmitter';
import { tagManager } from '@/utils/tagManager';
import { createSubmissionControls } from './submissionControls';

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
  const submissionControls = createSubmissionControls(panel, data);
  useWebviewResponseHandle(panel.webview, {
    ...createContestProblemNavigationHandlers(panel, data),
    checkCph: checkCPH,
    jumpToCph: () => sendCphMessage(data),
    ...submissionControls.handlers
  });
  const jumpToCphListener = jumpToCphEventEmitter.event(() => {
    if (panel.active) sendCphMessage(data);
  });
  panel.onDidDispose(() => {
    jumpToCphListener.dispose();
    submissionControls.dispose();
  });
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
