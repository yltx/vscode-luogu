import { getDistFilePath } from '@/utils/html';
import { getWebviewViewColumn } from '@/utils/workspaceUtils';
import { ProblemData } from 'luogu-api';
import * as vscode from 'vscode';
import useWebviewResponseHandle from '@/utils/webviewResponse';
import { checkCPH, sendCphMessage } from './cph';
import jumpToCphEventEmitter from './jumpToCphEventEmitter';
import { tagManager } from '@/utils/tagManager';

export default async function showProblemWebview(data: ProblemData) {
  const panel = vscode.window.createWebviewPanel(
    'luogu.problemPanel',
    `${data.problem.pid} ${data.problem.title ?? data.problem.content.name}`,
    getWebviewViewColumn(),
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [
        vscode.Uri.file(globalThis.resourcesPath),
        vscode.Uri.file(globalThis.distPath)
      ],
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
      })
  });
  const jumpToCphListener = jumpToCphEventEmitter.event(() => {
    if (panel.active) sendCphMessage(data);
  });
  panel.onDidDispose(() => jumpToCphListener.dispose());
  const tagsArray = Array.from((await tagManager.getAllTags()).values());
  panel.webview.html = `
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script type="application/json" id="lentille-context">${JSON.stringify(data)}</script>
    <script type="application/json" id="luogu-tags">${JSON.stringify(tagsArray)}</script>
    </head>
    <body>
    <script defer src=${getDistFilePath(panel.webview, 'webview-viewProblem.js')}></script>
    <div id="app"></div>
    </body>
    </html>
  `;
}
