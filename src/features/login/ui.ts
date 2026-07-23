import * as vscode from 'vscode';
import { getReactWebviewHtml } from '@/utils/html';
import useWebviewResponseHandle from '@/utils/webviewResponse';
import {
  checkCookie,
  genClientID,
  getCaptcha,
  getLoginCaptcha,
  login,
  searchUser,
  sendMail2fa,
  unlock
} from '@/utils/api';
import { isAxiosError } from 'axios';
import { promisify } from 'util';

export default async function showLoginView() {
  const panel = vscode.window.createWebviewPanel(
    'luogu.loginPanel',
    `洛谷 - 登录`,
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.file(globalThis.distPath)]
    }
  );
  let uid = 0,
    clientID = await genClientID();
  let successful = false;
  useWebviewResponseHandle(panel.webview, {
    NeedLoginCaptcha: async () => ({
      captchaImage: (await getLoginCaptcha({ uid: uid, clientID })).toString(
        'base64'
      )
    }),
    Need2faCaptcha: async () => ({
      captchaImage: (await getCaptcha({ uid: uid, clientID })).toString(
        'base64'
      )
    }),
    PasswordLogin: data =>
      login(data.username, data.password, data.captcha, {
        uid: (uid = 0),
        clientID
      })
        .then(x => {
          if (x.uid === undefined)
            throw new Error('Cookie not found in header');
          uid = x.uid;
          if (x.clientID) clientID = x.clientID;
          return { type: x.locked ? ('2fa' as const) : undefined };
        })
        .then(x => {
          if (x.type === undefined) (successful = true), panel.dispose();
          return x;
        })
        .catch(err => {
          if (isAxiosError(err) && err.response)
            vscode.window.showErrorMessage(err.response.data.errorMessage);
          else {
            console.error('Login failed', err);
            if (err instanceof Error)
              vscode.window.showErrorMessage('Login failed', err.message);
            else vscode.window.showErrorMessage('Login failed');
          }
          return { type: 'error' };
        }),
    CookieLogin: async data => {
      const r = await checkCookie(data);
      if (r) {
        (uid = data.uid), (clientID = data.clientID), (successful = true);
        panel.dispose();
      } else vscode.window.showErrorMessage('验证失败。');
      return { type: r ? undefined : 'error' };
    },
    clearLoginCookie: async () =>
      void ((uid = 0), (clientID = await genClientID())),
    SendMailCode: async ({ captcha }) =>
      sendMail2fa(captcha, { uid, clientID })
        .then(
          () => (
            vscode.window.showInformationMessage('发送成功'),
            {
              type: undefined
            }
          )
        )
        .catch(err => {
          if (!isAxiosError(err) || !err.response)
            throw new Error('Unknown Error', { cause: err });
          vscode.window.showErrorMessage(
            '发送验证码时出现错误：' + err.response.data.errorMessage
          );
          return { type: 'error' };
        }),
    '2fa': async ({ code, type }) =>
      await unlock(code, type, { uid, clientID })
        .then(result => {
          if (result.uid) uid = result.uid;
          if (result.clientID) clientID = result.clientID;
          successful = true;
          panel.dispose();
          return { type: undefined };
        })
        .catch(err => {
          if (isAxiosError(err) && err.response)
            vscode.window.showErrorMessage(err.response.data.errorMessage);
          else {
            console.error('Check 2fa failed', err);
            if (err instanceof Error)
              vscode.window.showErrorMessage('Check 2fa failed', err.message);
            else vscode.window.showErrorMessage('Check 2fa failed');
          }
          return { type: 'error' };
        })
  });
  panel.webview.html = getReactWebviewHtml(panel.webview, 'webview-login.js');
  await promisify(panel.onDidDispose)();
  if (successful)
    return {
      uid,
      clientID,
      name: (await searchUser(uid.toString(), { uid, clientID })).users[0]!.name
    };
  else return null;
}
