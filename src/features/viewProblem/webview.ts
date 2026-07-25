import { getReactWebviewHtml } from '@/utils/html';
import { getWebviewViewColumn } from '@/utils/workspaceUtils';
import { ProblemData } from 'luogu-api';
import * as vscode from 'vscode';
import useWebviewResponseHandle from '@/utils/webviewResponse';
import { checkCPH, sendCphMessage } from './cph';
import jumpToCphEventEmitter from './jumpToCphEventEmitter';
import { tagManager } from '@/utils/tagManager';
import {
  getSubmissionContext,
  selectOpenDocument,
  submitDocument
} from '@/features/submit';

export default async function showProblemWebview(data: ProblemData) {
  let selectedDocument = vscode.window.activeTextEditor?.document;
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
    getSubmissionContext: () =>
      getSubmissionContext(selectedDocument, data.lastLanguage),
    submitProblem: async ({ language }) => {
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
  });
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
  const jumpToCphListener = jumpToCphEventEmitter.event(() => {
    if (panel.active) sendCphMessage(data);
  });
  panel.onDidDispose(() => {
    jumpToCphListener.dispose();
    activeEditorListener.dispose();
    closeDocumentListener.dispose();
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
