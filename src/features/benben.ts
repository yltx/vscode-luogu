import {
  searchUser,
  fetchFollowedBenben,
  fetchUserBenben,
  postBenben,
  deleteBenben
} from '@/utils/api';
import { getReactWebviewHtml } from '@/utils/html';
import * as vscode from 'vscode';
import type BenbenData from '@/model/benben';
import { getUsernameColor, getWebviewViewColumn } from '@/utils/workspaceUtils';
import useWebviewResponseHandle from '@/utils/webviewResponse';
import { Activity, UserSummary } from 'luogu-api';
import { needLogin } from '@/utils/uiUtils';

function isError(x: unknown): x is Error {
  return (
    typeof x === 'object' &&
    x !== null &&
    'message' in x &&
    'name' in x &&
    typeof x.message === 'string' &&
    typeof x.name === 'string'
  );
}

async function getFollowedBenben(
  page = 1,
  userinfoCache?: Map<number, UserSummary>
) {
  const res = await fetchFollowedBenben(page);
  res.data = res.data.filter(x => x.type === 1);
  const users = await Promise.all(
    res.data.map(async x => {
      const d =
        userinfoCache?.get(x.uid) ||
        (await searchUser(x.uid.toString())).users[0];
      if (!d) throw new Error('Load userinfo failed.');
      return d;
    })
  );
  return Array.from<unknown, BenbenData>(
    { length: res.data.length },
    (_, i) => ({
      user: {
        icon: users[i].avatar,
        uid: users[i].uid,
        name: users[i].name,
        ccfLevel: users[i].ccfLevel,
        color: getUsernameColor(users[i].color),
        badge: users[i].badge || undefined
      },
      time: Date.parse(res.data[i].time.date + ' +0800'),
      comment: res.data[i].comment,
      id: -1
    })
  );
}
async function getUserBenben(page = 1, user?: number) {
  const res = (await fetchUserBenben(page, user)).feeds.result;
  const me = (await globalThis.luogu.authProvider.user()).uid;
  if (me === 0) {
    needLogin();
    throw new Error('未登录');
  }
  return await Promise.all(
    Object.keys(res)
      .sort((x, y) => +x - +y)
      .map(x => res[x] as Activity)
      .filter(d => d.type == 1)
      .map<Promise<BenbenData>>(async d => ({
        comment: d.content,
        time: d.time * 1000,
        user: {
          uid: d.user.uid,
          badge: d.user.badge || undefined,
          name: d.user.name,
          color: getUsernameColor(d.user.color),
          ccfLevel: d.user.ccfLevel,
          icon: d.user.avatar,
          isMe: d.user.uid === me
        },
        id: d.id
      }))
  );
}
async function getMode() {
  interface PickUID extends vscode.QuickPickItem {
    label: `用户 ${string} 的动态`;
    id: string;
  }
  interface PickMe extends vscode.QuickPickItem {
    label: '我发布的';
  }
  interface PickFollowed extends vscode.QuickPickItem {
    label: '我关注的';
  }
  const input = vscode.window.createQuickPick<
    PickMe | PickFollowed | PickUID
  >();
  input.placeholder = '输入一个用户名/UID，或从下方选择一项';
  input.items = [{ label: '我发布的' }, { label: '我关注的' }];
  input.onDidChangeValue(s => {
    if (s === '') input.items = [{ label: '我发布的' }, { label: '我关注的' }];
    else input.items = [{ label: `用户 ${s} 的动态`, id: s }];
  });
  return new Promise<string | 1 | 2 | undefined>(resolve => {
    input.onDidChangeSelection(e => {
      resolve(
        e[0].label === '我关注的' ? 1 : e[0].label === '我发布的' ? 2 : e[0].id
      );
    });
    input.onDidHide(() => resolve(undefined));
    input.show();
  }).then(x => {
    input.dispose();
    return x;
  });
}

export default function registerBenben(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand('luogu.benben', async () => {
      await globalThis.luogu.waitinit;
      const mode = await getMode();
      if (mode === undefined) return;
      const user =
        typeof mode === 'string'
          ? (await searchUser(mode)).users[0]
          : undefined;
      if (user === null) {
        vscode.window.showErrorMessage('用户不存在');
        return;
      }
      const panel = vscode.window.createWebviewPanel(
        `luogu.benbenPanel`,
        `犇犇 - ${mode === 1 ? '我关注的' : mode === 2 ? '我发布的' : `${user!.name} 的动态`}`,
        getWebviewViewColumn(),
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [vscode.Uri.file(globalThis.distPath)]
        }
      );
      const userinfoCache =
        mode === '我关注的' ? new Map<number, UserSummary>() : undefined;
      const initHTML = () => {
        panel.webview.html = getReactWebviewHtml(
          panel.webview,
          'webview-benben.js'
        );
      };
      useWebviewResponseHandle(panel.webview, {
        BenbenUpdate: data => {
          if (mode === 1) return getFollowedBenben(data.page, userinfoCache);
          else if (mode === 2) return getUserBenben(data.page);
          else return getUserBenben(data.page, user!.uid);
        },
        BenbenSend: async data => {
          try {
            await postBenben(data.comment);
          } catch (err) {
            vscode.window.showErrorMessage(
              `发送犇犇失败：${(err as unknown as { message: string }).message}`
            );
            throw new Error(isError(err) ? err.message : 'Unknown error', {
              cause: err
            });
          }
        },
        BenbenDelete: async data => {
          try {
            const res = await deleteBenben(data.id);
            if (res.status !== 200) throw res;
          } catch (err) {
            vscode.window.showErrorMessage(
              `发送犇犇失败：${(err as unknown as { message: string }).message}`
            );
            throw new Error(isError(err) ? err.message : 'Unknown error', {
              cause: err
            });
          }
        }
      });
      initHTML();
    })
  );
}
