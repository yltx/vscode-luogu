import { resolveSubmissionProblem, submitCode } from '@/utils/api';
import { getContestMonitor } from './contest/contestMonitor';
import {
  askForLanguage,
  askForPid,
  guessProblemId,
  processAxiosError
} from '@/utils/workspaceUtils';
import * as vscode from 'vscode';

export default function registerSubmitFeature(
  context: vscode.ExtensionContext
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'luogu.sumbitCode',
      async (
        problem?:
          | import('@/features/history/historyItem').ProblemHistoryItem
          | { pid: string; cid?: number }
      ) => {
        let editor: vscode.TextEditor | undefined =
          vscode.window.activeTextEditor;

        if (!editor) {
          const selectedDocument = await selectOpenDocument();
          if (!selectedDocument) {
            vscode.window.showErrorMessage(
              '您没有选择任何文件，请选择一个文件后重试'
            );
            return false;
          }
          editor = selectedDocument;
        }
        if (!problem) {
          const guessed = guessProblemId(editor.document.fileName);
          if (
            guessed &&
            vscode.workspace
              .getConfiguration('luogu')
              .get('guessProblemID', false)
          )
            problem = guessed;
          else if (
            !(problem = await askForPid(
              guessProblemId(editor.document.fileName)
            ))
          )
            return false;
        }
        if ('type' in problem)
          problem = { pid: problem.pid, cid: problem.contest?.contestId };
        problem = resolveSubmissionProblem(problem, getContestMonitor());
        const lang = await askForLanguage(
          editor.document.fileName.split('.').pop()!
        );
        if (lang === undefined) return false;
        vscode.window.showInformationMessage('正在提交……');
        try {
          const rid = await submitCode(
            problem,
            editor.document.getText(),
            lang.id,
            lang.O2
          );
          vscode.commands.executeCommand('luogu.record', rid);
          return true;
        } catch (e) {
          processAxiosError('提交代码')(e);
          return false;
        }
      }
    )
  );
}

async function selectOpenDocument(): Promise<vscode.TextEditor | undefined> {
  const res = await vscode.window.showOpenDialog({
    canSelectFiles: true,
    canSelectMany: false,
    canSelectFolders: false,
    title: '选择要提交的文件'
  });
  if (res && res.length > 0) {
    const document = await vscode.workspace.openTextDocument(res[0]);
    return await vscode.window.showTextDocument(document);
  }
  return undefined;
}
