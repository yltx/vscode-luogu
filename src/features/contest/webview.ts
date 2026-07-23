import * as vscode from 'vscode';
import { getReactWebviewHtml } from '@/utils/html';
import { getWebviewViewColumn } from '@/utils/workspaceUtils';
import { ContestData } from 'luogu-api';
import useWebviewResponseHandle from '@/utils/webviewResponse';
import { getRanklist, searchContest, joinContest } from '@/utils/api';
import { ContestVisibilityTypes } from '@/utils/shared';
import { processAxiosError } from '@/utils/workspaceUtils';
import {
  setContestMonitor,
  clearContestMonitor,
  getContestMonitor
} from './contestMonitor';

export default function showContestWebview(data: ContestData) {
  const panel = vscode.window.createWebviewPanel(
    'luogu.contestPanel',
    `${data.contest.id} ${data.contest.name}`,
    getWebviewViewColumn(),
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.file(globalThis.distPath)],
      enableCommandUris: ['luogu.searchProblem']
    }
  );
  panel.webview.html = getReactWebviewHtml(
    panel.webview,
    'webview-contest.js',
    { 'lentille-context': data }
  );
  useWebviewResponseHandle(panel.webview, {
    ContestRanklist: ({ page }) =>
      getRanklist(data.contest.id, page).catch(e => {
        processAxiosError('获取排行榜')(e);
        throw e;
      }),
    ContestReload: async () => {
      try {
        const fresh = await searchContest(data.contest.id);
        return fresh;
      } catch (e) {
        processAxiosError('刷新比赛')(e);
        throw e;
      }
    },
    ContestJoin: async () => {
      const body: { code?: string; unrated?: boolean } = {};
      if (ContestVisibilityTypes[data.contest.visibility].invitation) {
        const code = await vscode.window.showInputBox({
          prompt: '请输入比赛邀请码',
          placeHolder: '邀请码'
        });
        if (code === undefined) return false;
        if (code) body.code = code;
      }
      if (
        data.contest.eloThreshold !== null &&
        data.contest.eloThreshold >= 0
      ) {
        const pick = await vscode.window.showQuickPick(['是', '否'], {
          placeHolder: '请选择是否参与等级分评定'
        });
        if (pick === undefined) return false;
        body.unrated = pick === '否';
      }
      try {
        await joinContest(data.contest.id, body);
        return true;
      } catch (e) {
        processAxiosError('报名比赛')(e);
        return false;
      }
    },
    ContestEnterContestMode: async () => {
      try {
        await setContestMonitor(data.contest.id);
        return true;
      } catch (e) {
        processAxiosError('进入比赛模式')(e);
        return false;
      }
    },
    ContestMonitorGet: async () => getContestMonitor(),
    ContestMonitorStop: async () => {
      try {
        await clearContestMonitor();
        return true;
      } catch {
        return false;
      }
    }
  });
}
