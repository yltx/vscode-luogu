import { getProblemData } from '@/utils/api';
import {
  askForPid,
  guessProblemId,
  processAxiosError
} from '@/utils/workspaceUtils';
import * as vscode from 'vscode';
import showProblemWebview from './webview';
import jumpToCphEventEmitter from './jumpToCphEventEmitter';

export default function registerViewProblem(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'luogu.searchProblem',
      async (id?: { pid: string; cid?: number }) => {
        if (!id) {
          const guessed =
            vscode.window.activeTextEditor &&
            guessProblemId(vscode.window.activeTextEditor.document.fileName);
          if (
            guessed &&
            vscode.workspace
              .getConfiguration('luogu')
              .get('guessProblemID', false)
          )
            id = guessed;
          else if (!(id = await askForPid(guessed))) return false;
        }
        return await getProblemData(id.pid, id.cid)
          .then(async problemData => {
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
            showProblemWebview(problemData);
            return true;
          })
          .catch((e: unknown) => {
            processAxiosError('查找题目')(e);
            return false;
          });
      }
    ),
    vscode.commands.registerCommand('luogu.jumpToCph', () =>
      jumpToCphEventEmitter.fire()
    ),
    jumpToCphEventEmitter
  );
}
