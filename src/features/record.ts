import * as vscode from 'vscode';
import {
  downloadTestcase,
  fetchRecords,
  fetchResult,
  queryDownloadableTestcase
} from '@/utils/api';
import { getReactWebviewHtml } from '@/utils/html';
import { createWebsocket, WebsocketSchema } from '@/utils/websocket';
import {
  processAxiosError,
  getWebviewViewColumn
} from '@/utils/workspaceUtils';
import { RecordData } from 'luogu-api';
import { MessageTypes } from '@w/views/record/data';
import { getLatestRecordId } from './recordList';
import useWebviewResponseHandle from '@/utils/webviewResponse';
import { saveDownloadedTestcase } from './recordTestcaseDownload';

type RecordWebsocket = Awaited<
  ReturnType<typeof createWebsocket<WebsocketSchema.RecordTrack>>
>;

async function record(record: RecordData) {
  const panel = vscode.window.createWebviewPanel(
    'luogu.recordPanel',
    `R${record.record.id} 记录详情`,
    getWebviewViewColumn(),
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.file(globalThis.distPath)],
      enableCommandUris: [
        'luogu.searchProblem',
        'luogu.openUntitledTextDocument'
      ]
    }
  );
  panel.webview.html = getReactWebviewHtml(panel.webview, 'webview-record.js', {
    'lentille-context': record satisfies RecordData
  });
  useWebviewResponseHandle(panel.webview, {
    QueryDownloadableTestcase: () =>
      queryDownloadableTestcase(record.record.id),
    DownloadTestcase: async ({ testcaseId }) => {
      const downloadable = await queryDownloadableTestcase(record.record.id);
      if (downloadable !== testcaseId)
        throw new Error('该测试点已不可下载，请刷新记录后重试');
      const testcase = await downloadTestcase(record.record.id, testcaseId);
      return saveDownloadedTestcase(record.record.id, testcaseId, testcase);
    }
  });
  if (record.record.status === 0 || record.record.status === 1)
    connectWebsocket(record.record.id, panel);
}

function connectWebsocket(rid: number, panel: vscode.WebviewPanel) {
  let pending = true;
  let disposed = false;
  let connection: RecordWebsocket | undefined;
  const panelDisposable = panel.onDidDispose(() => {
    disposed = true;
    pending = false;
    connection?.dispose();
  });
  new Promise<void>((resolve, reject) =>
    createWebsocket<WebsocketSchema.RecordTrack>(
      'record.track',
      rid.toString()
    ).then(
      ws => {
        connection = ws;
        if (disposed) {
          ws.dispose();
          resolve();
          return;
        }
        panel.webview.postMessage({
          type: 'updateRecord',
          data: {
            ...ws.data.record,
            memory: +ws.data.record.memory,
            time: +ws.data.record.time,
            score: ws.data.record.score && +ws.data.record.score
          }
        } satisfies MessageTypes);
        if (ws.data.status !== 0 && ws.data.status !== 1) {
          resolve();
          pending = false;
          ws.dispose();
          return;
        }
        ws.event.event(e => {
          if (!pending) return;
          if (e.type === 'error') {
            ws.dispose();
            pending = false;
            reject(e.data);
          } else if (e.type === 'close') {
            pending = false;
            reject(new Error('连接意外关闭'));
          } else if (e.data.type === 'status_push') {
            panel.webview.postMessage({
              type: 'updateRecord',
              data: e.data.record
            } satisfies MessageTypes);
            if (e.data.record.status === 2)
              fetchResult(rid).then(x => {
                if (!disposed)
                  panel.webview.postMessage({
                    type: 'updateRecord',
                    data: x.record
                  } satisfies MessageTypes);
              });
            if (e.data.record.status !== 0 && e.data.record.status !== 1) {
              pending = false;
              resolve();
              ws.dispose();
            }
          }
        });
      },
      e => reject(e)
    )
  )
    .then(() => (disposed ? undefined : fetchResult(rid)))
    .then(x => {
      if (x && !disposed)
        return panel.webview.postMessage({
          type: 'updateRecord',
          data: x.record
        } satisfies MessageTypes);
    })
    .catch(e => {
      if (disposed) return;
      console.error('获取记录时 WebSocket 连接失败', e);
      vscode.window
        .showErrorMessage(
          `获取记录时 WebSocket 连接失败` +
            (e instanceof Error ? `：${e.message}` : ''),
          '重试'
        )
        .then(s => s === '重试' && !disposed && connectWebsocket(rid, panel));
    })
    .finally(() => panelDisposable.dispose());
}

export default function registerRecord(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('luogu.record', rid => {
      if (typeof rid !== 'number') throw new TypeError('rid must be a number');
      fetchResult(rid)
        .then(record => {
          if (!record.showStatus) record.record.status = -1;
          return record;
        })
        .then(record, processAxiosError('获取记录'));
    }),
    vscode.commands.registerCommand('luogu.lastRecord', async () => {
      const records = await fetchRecords().catch(
        processAxiosError('获取上次提交记录')
      );
      if (records === undefined) return;
      const rid = getLatestRecordId(records.result);
      if (rid === undefined) {
        vscode.window.showInformationMessage('暂无提交记录');
        return false;
      }
      await vscode.commands.executeCommand('luogu.record', rid);
      return true;
    })
  );
}
