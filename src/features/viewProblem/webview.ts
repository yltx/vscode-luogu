import { getReactWebviewHtml } from '@/utils/html';
import { getWebviewViewColumn } from '@/utils/workspaceUtils';
import { ProblemData } from 'luogu-api';
import * as vscode from 'vscode';
import useWebviewResponseHandle from '@/utils/webviewResponse';
import { checkCPH, sendCphMessage } from './cph';
import jumpToCphEventEmitter from './jumpToCphEventEmitter';
import { tagManager } from '@/utils/tagManager';
import { getSubmissionContext, submitDocument } from '@/features/submit';

const isSupportedSubmissionDocument = (document: vscode.TextDocument) =>
  getSubmissionContext(document).languages.length > 0;

const findVisibleSubmissionDocument = () => {
  const activeDocument = vscode.window.activeTextEditor?.document;
  if (
    activeDocument &&
    !activeDocument.isClosed &&
    isSupportedSubmissionDocument(activeDocument)
  )
    return activeDocument;
  return vscode.window.visibleTextEditors
    .map(editor => editor.document)
    .find(
      document => !document.isClosed && isSupportedSubmissionDocument(document)
    );
};

export default async function showProblemWebview(data: ProblemData) {
  let selectedDocument = findVisibleSubmissionDocument();
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
    getSubmissionContext: () => {
      selectedDocument = findVisibleSubmissionDocument() ?? selectedDocument;
      return getSubmissionContext(selectedDocument);
    },
    submitProblem: ({ language }) => {
      if (!selectedDocument || selectedDocument.isClosed) {
        vscode.window.showErrorMessage('请选择要提交的代码文件。');
        return false;
      }
      const submissionContext = getSubmissionContext(selectedDocument);
      const selectedLanguage = submissionContext.languages.find(
        option => option.label === language
      );
      if (!selectedLanguage) {
        vscode.window.showErrorMessage('当前文件不支持所选的提交语言。');
        return false;
      }
      return submitDocument(
        {
          pid: data.problem.pid,
          cid: data.contest?.id
        },
        selectedDocument,
        selectedLanguage
      );
    }
  });
  const postSubmissionContext = () =>
    panel.webview.postMessage({
      type: 'submissionContextChanged',
      data: getSubmissionContext(selectedDocument)
    });
  const activeEditorListener = vscode.window.onDidChangeActiveTextEditor(
    editor => {
      if (!editor || !isSupportedSubmissionDocument(editor.document)) return;
      selectedDocument = editor.document;
      void postSubmissionContext();
    }
  );
  const visibleEditorsListener = vscode.window.onDidChangeVisibleTextEditors(
    () => {
      const visibleDocument = findVisibleSubmissionDocument();
      if (!visibleDocument || visibleDocument === selectedDocument) return;
      selectedDocument = visibleDocument;
      void postSubmissionContext();
    }
  );
  const closeDocumentListener = vscode.workspace.onDidCloseTextDocument(
    document => {
      if (document !== selectedDocument) return;
      selectedDocument = findVisibleSubmissionDocument();
      void postSubmissionContext();
    }
  );
  const jumpToCphListener = jumpToCphEventEmitter.event(() => {
    if (panel.active) sendCphMessage(data);
  });
  panel.onDidDispose(() => {
    jumpToCphListener.dispose();
    activeEditorListener.dispose();
    visibleEditorsListener.dispose();
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
