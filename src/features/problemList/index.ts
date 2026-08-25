import { getReactWebviewHtml } from '@/utils/html';
import { tagManager } from '@/utils/tagManager';
import useWebviewResponseHandle from '@/utils/webviewResponse';
import { getWebviewViewColumn } from '@/utils/workspaceUtils';
import * as vscode from 'vscode';
import { getProblemList } from '@/utils/api';
import type { ProblemListFilters } from './types';

const initialFilters: ProblemListFilters = {
  page: 1,
  keyword: '',
  type: '',
  difficulty: null,
  tags: []
};

export default async function showProblemList() {
  const [problems, tags] = await Promise.all([
    getProblemList(initialFilters),
    tagManager.getAllTags()
  ]);
  const panel = vscode.window.createWebviewPanel(
    'luogu.problemListPanel',
    '洛谷题库',
    getWebviewViewColumn(),
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.file(globalThis.distPath)]
    }
  );

  useWebviewResponseHandle(panel.webview, {
    ProblemListSearch: getProblemList,
    OpenProblemFromList: async ({ pid }) => {
      await vscode.commands.executeCommand('luogu.searchProblem', { pid });
    }
  });
  panel.webview.html = getReactWebviewHtml(
    panel.webview,
    'webview-problemList.js',
    {
      'lentille-context': { problems, filters: initialFilters },
      'luogu-tags': Array.from(tags.values())
    }
  );
}
