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

  const postSubmissionContext = () =>
    panel.webview.postMessage({
      type: 'submissionContextChanged',
      data: getSubmissionContext(selectedDocument, data.lastLanguage)
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
        const submissionContext = getSubmissionContext(
          selectedDocument,
          data.lastLanguage
        );
        const selectedLanguage = submissionContext.languages.find(
          option => option.label === language
        );
        if (!selectedLanguage)
          return vscode.commands.executeCommand<boolean>(
            'luogu.sumbitCode',
            problem
          );
        let submissionDocument = selectedDocument;
        if (!submissionDocument || submissionDocument.isClosed) {
          const selectedEditor = await selectOpenDocument();
          if (!selectedEditor) return false;
          submissionDocument = selectedEditor.document;
        }
        return submitDocument(problem, submissionDocument, selectedLanguage);
      }
    },
    dispose: () => {
      activeEditorListener.dispose();
      closeDocumentListener.dispose();
    }
  };
};
