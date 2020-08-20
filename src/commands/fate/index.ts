import SuperCommand from '../SuperCommand'
import { getFate, getStatus } from '@/utils/api'
import { UserStatus } from '@/utils/shared'
import * as vscode from 'vscode'
import * as fs from 'fs'

export default new SuperCommand({
  onCommand: 'fate',
  handle: async () => {
    while (!exports.init) { continue; }
    try {
      if (await getStatus() === UserStatus.SignedOut.toString()) {
        vscode.window.showErrorMessage('未登录');
        return;
      }
    } catch (err) {
      console.error(err)
      vscode.window.showErrorMessage(err.toString());
      return;
    }
    try {
      let data = await getFate();
      if (data.code !== 201 && data.code !== 200) {
        vscode.window.showErrorMessage('打卡失败')
      } else {
        if (data.message === '') {
          // vscode.window.showInformationMessage('打卡成功')
          const css = `
        .lg-punch .lg-punch-result {
          display: inline-block;
          font-size: 50px;
          font-weight: bold;
          margin-top: 0px;
        }
        .lg-fg-red {
          color: #e74c3c !important;
        }
        .lg-fg-green {
          color: #2dce89 !important;
        }
        .am-g {
          margin-left: -1rem;
          margin-right: -1rem;
          width: auto;
          margin: 0 auto;
        }
        .am-u-sm-12 {
          width: 100%;
        }
        .lg-small {
          font-size: 20px;
          color: #7f7f7f;
        }
        .lg-bold {
          font-weight: bold;
          font-size: 30px;
        }
        [class*=am-u-]+[class*=am-u-]:last-child {
          float: right;
        }
        b, strong {
          font-weight: bolder;
        }
        strong {
          color: #515151;
        }
        .am-text-center {
          text-align: center!important;
        }
        `
          let html = `<!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style> ${css} </style>
        </head>
        <body>
        <div class="am-u-md-4 lg-punch am-text-center">
        ${data.more.html}
        </div>
        </body>
        </html>`;

          let pannel = vscode.window.createWebviewPanel('', `今日运势`, vscode.ViewColumn.Two);
          // let pannelClosed = false;
          // pannel.onDidDispose(() => pannelClosed = true)
          pannel.webview.html = html;
        } else {
          vscode.window.showInformationMessage(data.message)
        }
        // console.log(data)
      }
    } catch (err) {
      // vscode.window.showErrorMessage('打卡时出现错误')
      vscode.window.showErrorMessage(err)
    }
  }
})
