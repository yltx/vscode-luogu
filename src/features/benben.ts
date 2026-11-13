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
import { Activity } from 'luogu-api';
import { fromHtml } from 'hast-util-from-html';
import { toHtml } from 'hast-util-to-html';
import type { Element, Root, RootContent } from 'hast';
import { needLogin } from '@/utils/uiUtils';
import { benbenModeRequiresLogin, BenbenMode } from './benbenMode';

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

function findElements(
  node: Root | Element,
  matches: (element: Element) => boolean
): Element[] {
  return node.children.flatMap(child =>
    child.type !== 'element'
      ? []
      : matches(child)
        ? [child]
        : findElements(child, matches)
  );
}

function hasClass(element: Element, name: string) {
  const classes = element.properties.className;
  return Array.isArray(classes)
    ? classes.includes(name)
    : typeof classes === 'string' && classes.split(/\s+/).includes(name);
}

function textContent(node: RootContent): string {
  if (node.type === 'text') return node.value;
  return 'children' in node ? node.children.map(textContent).join('') : '';
}

async function getFollowedBenben(page = 1): Promise<BenbenData[]> {
  const tree = fromHtml(await fetchFollowedBenben(page), { fragment: true });
  const feeds = findElements(tree, element => hasClass(element, 'feed-li'));
  if (
    !feeds.length &&
    findElements(tree, element => element.tagName === 'form').length
  )
    throw new Error('获取关注犇犇失败，请检查登录状态');
  return feeds.map(feed => {
    const author = findElements(feed, element =>
      hasClass(element, 'feed-username')
    )[0];
    const content = findElements(feed, element =>
      hasClass(element, 'feed-comment')
    )[0];
    const meta = findElements(feed, element =>
      hasClass(element, 'am-comment-meta')
    )[0];
    const name =
      author &&
      findElements(
        author,
        element =>
          element.tagName === 'a' &&
          /^\/user\/\d+$/.test(String(element.properties.href))
      )[0];
    const uid = Number(String(name?.properties.href).split('/').pop());
    const date = meta?.children
      .filter(child => child.type === 'text')
      .map(textContent)
      .join('')
      .match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/)?.[0];
    const time = date ? Date.parse(date.replace(' ', 'T') + '+08:00') : NaN;
    if (
      !author ||
      !content ||
      !name ||
      !Number.isSafeInteger(uid) ||
      uid <= 0 ||
      !Number.isFinite(time)
    )
      throw new Error('关注犇犇返回格式异常');
    const color =
      String(name.properties.className ?? '').match(/lg-fg-([a-z]+)/)?.[1] ??
      'grey';
    const colorAliases: Record<string, string> = {
      gray: 'grey',
      bluelight: 'blue',
      brown: 'cheater'
    };
    const badge = findElements(author, element =>
      hasClass(element, 'am-badge')
    )[0];
    const svg = findElements(author, element => element.tagName === 'svg')[0];
    const fill = String(svg?.properties.fill ?? '').toLowerCase();
    const ccfLevels: Record<string, number> = {
      '#5eb95e': 3,
      '#52c41a': 3,
      '#0e90d2': 6,
      '#3498db': 6,
      '#f1c40f': 8,
      '#ffc116': 8
    };
    const icon = findElements(feed, element =>
      hasClass(element, 'am-comment-avatar')
    )[0];
    const report = findElements(
      meta,
      element => element.properties.dataReportType === 'feed'
    )[0];
    return {
      user: {
        uid,
        name: textContent(name),
        icon: String(
          icon?.properties.src ??
            `https://cdn.luogu.com.cn/upload/usericon/${uid}.png`
        ),
        color:
          getUsernameColor(colorAliases[color] ?? color) ??
          getUsernameColor('grey'),
        ccfLevel: ccfLevels[fill] ?? 0,
        badge: badge ? textContent(badge) : undefined
      },
      time,
      comment: toHtml({ type: 'root', children: content.children }),
      id: Number(report?.properties.dataReportId ?? -1)
    };
  });
}
async function getUserBenben(page = 1, user?: number) {
  const res = (await fetchUserBenben(page, user)).feeds.result;
  const me = (await globalThis.luogu.authProvider.user()).uid;
  if (user === undefined && me === 0) {
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
  return new Promise<BenbenMode | undefined>(resolve => {
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
      if (
        benbenModeRequiresLogin(mode) &&
        (await globalThis.luogu.authProvider.user()).uid === 0
      ) {
        needLogin();
        return;
      }
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
      const initHTML = () => {
        panel.webview.html = getReactWebviewHtml(
          panel.webview,
          'webview-benben.js'
        );
      };
      useWebviewResponseHandle(panel.webview, {
        BenbenUpdate: data => {
          if (mode === 1) return getFollowedBenben(data.page);
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
