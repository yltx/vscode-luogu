import { resolveSubmissionProblem, submitCode } from '@/utils/api';
import { getContestMonitor } from './contest/contestMonitor';
import {
  askForLanguage,
  askForPid,
  guessProblemId,
  processAxiosError
} from '@/utils/workspaceUtils';
import {
  defaultLanguageVersion,
  fileExtToLanguage,
  languageFamily
} from '@/utils/shared';
import type { ProblemSubmissionContext } from '@w/views/viewProblem/submissionTypes';
import * as vscode from 'vscode';
import path from 'path';

type SubmissionProblem =
  | import('@/features/history/historyItem').ProblemHistoryItem
  | { pid: string; cid?: number };
type SubmissionLanguage = { id: number; O2?: true };
type SubmissionLanguageOption = ProblemSubmissionContext['languages'][number];

const getLanguageOptions = (
  languageName: keyof typeof languageFamily
): SubmissionLanguageOption[] => {
  const languageData = languageFamily[languageName];
  return 'id' in languageData
    ? [{ label: languageName, id: languageData.id }]
    : Object.entries(languageData).map(([label, value]) => ({
        label,
        id: value.id,
        ...('O2' in value && value.O2 ? { O2: true as const } : {})
      }));
};

export default function registerSubmitFeature(
  context: vscode.ExtensionContext
) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'luogu.sumbitCode',
      async (problem?: SubmissionProblem) => {
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
        return submitDocument(problem, editor.document, lang);
      }
    )
  );
}

export function getSubmissionContext(
  document?: vscode.TextDocument,
  lastLanguage?: number
): ProblemSubmissionContext {
  if (!document || document.isClosed) {
    const languages = (
      Object.keys(languageFamily) as (keyof typeof languageFamily)[]
    ).flatMap(getLanguageOptions);
    const defaultLanguage =
      languages.find(language => language.id === lastLanguage && language.O2)
        ?.label ??
      languages.find(language => language.id === lastLanguage)?.label;
    return {
      languages,
      defaultLanguage
    };
  }

  const fileName = path.basename(document.fileName);
  const extension = path.extname(fileName).slice(1).toLowerCase();
  const languageName =
    extension in fileExtToLanguage
      ? fileExtToLanguage[extension as keyof typeof fileExtToLanguage]
      : undefined;
  if (!languageName)
    return {
      fileName,
      filePath: document.fileName,
      languages: []
    };

  const languages = getLanguageOptions(languageName);
  const configuredDefault = vscode.workspace
    .getConfiguration('luogu')
    .get<Record<string, string>>('defaultLanguageVersion', {})[languageName];
  const builtInDefault = (
    defaultLanguageVersion as Partial<Record<typeof languageName, string>>
  )[languageName];
  const preferredLanguage = configuredDefault ?? builtInDefault;
  const defaultLanguage = languages.some(
    language => language.label === preferredLanguage
  )
    ? preferredLanguage
    : languages[0]?.label;

  return {
    fileName,
    filePath: document.fileName,
    languages,
    defaultLanguage
  };
}

export async function submitDocument(
  problem: SubmissionProblem,
  document: vscode.TextDocument,
  language: SubmissionLanguage
) {
  if ('type' in problem)
    problem = { pid: problem.pid, cid: problem.contest?.contestId };
  problem = resolveSubmissionProblem(problem, getContestMonitor());
  vscode.window.showInformationMessage('正在提交……');
  try {
    const rid = await submitCode(
      problem,
      document.getText(),
      language.id,
      language.O2
    );
    vscode.commands.executeCommand('luogu.record', rid);
    return true;
  } catch (e) {
    processAxiosError('提交代码')(e);
    return false;
  }
}

export async function selectOpenDocument(): Promise<
  vscode.TextEditor | undefined
> {
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
