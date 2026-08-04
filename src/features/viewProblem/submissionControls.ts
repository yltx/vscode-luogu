import {
  getSubmissionContext,
  selectOpenDocument,
  submitDocument
} from '@/features/submit';
import type { ProblemData } from 'luogu-api';
import * as vscode from 'vscode';

export const createSubmissionControls = (
  panel: vscode.WebviewPanel,
  data: ProblemData
) => {
  let selectedDocument = vscode.window.activeTextEditor?.document;

  const postSubmissionContext = (
    context = getSubmissionContext(selectedDocument, data.lastLanguage)
  ) =>
    panel.webview.postMessage({
      type: 'submissionContextChanged',
      data: context
    });
  const activeEditorListener = vscode.window.onDidChangeActiveTextEditor(
    editor => {
      if (!editor) return;
      selectedDocument = editor.document;
      void postSubmissionContext();
    }
  );
  const closeDocumentListener = vscode.workspace.onDidCloseTextDocument(
    document => {
      if (document !== selectedDocument) return;
      selectedDocument = undefined;
      void postSubmissionContext();
    }
  );

  return {
    handlers: {
      getSubmissionContext: () =>
        getSubmissionContext(selectedDocument, data.lastLanguage),
      submitProblem: async ({ language }: { language: string }) => {
        const problem = {
          pid: data.problem.pid,
          cid: data.contest?.id
        };
        let submissionDocument = selectedDocument;
        if (!submissionDocument || submissionDocument.isClosed) {
          const selectedEditor = await selectOpenDocument();
          if (!selectedEditor) return false;
          submissionDocument = selectedEditor.document;
        }
        const submissionContext = getSubmissionContext(
          submissionDocument,
          data.lastLanguage
        );
        const selectedLanguage =
          submissionContext.languages.find(
            option => option.label === language
          ) ??
          submissionContext.languages.find(
            option => option.label === submissionContext.defaultLanguage
          ) ??
          submissionContext.languages[0];
        if (!selectedLanguage)
          return vscode.commands.executeCommand<boolean>(
            'luogu.sumbitCode',
            problem
          );

        selectedDocument = submissionDocument;
        void postSubmissionContext({
          ...submissionContext,
          defaultLanguage: selectedLanguage.label
        });
        return submitDocument(problem, submissionDocument, selectedLanguage);
      }
    },
    dispose: () => {
      activeEditorListener.dispose();
      closeDocumentListener.dispose();
    }
  };
};
