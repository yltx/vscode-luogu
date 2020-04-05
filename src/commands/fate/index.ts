import SuperCommand from '../SuperCommand'
import { getFate } from '../../utils/api'
import { UserStatus } from '../../utils/shared'
import * as vscode from 'vscode'
import * as fs from 'fs'

export function getStatus (): string {
  return fs.existsSync(exports.luoguJSONPath) ? '1' : '2';
}
export default new SuperCommand({
  onCommand: 'fate',
  handle: async () => {
    if (getStatus() === UserStatus.SignedOut.toString()) {
      vscode.window.showErrorMessage('您没有登录')
      return;
    }
    let data = await getFate();
    if (data.code !== 201 && data.code !== 200) {
      vscode.window.showErrorMessage('打卡失败')
    } else {
      if (data.message === '') {
        vscode.window.showInformationMessage('打卡成功')
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
        /*
        @media only screen and (min-width: 641px)
        [class*=am-u-] {
          padding-left: 1rem;
          padding-right: 1rem;
        }
        .am-u-sm-6 {
          width: 50%;
        }*/
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
        /*@media only screen and (min-width: 641px)
        .am-u-md-4 {
            width: 33.33333333%;
        }*/
        .am-text-center {
          text-align: center!important;
        }
        `
        data.more.html = `<div class="am-u-md-4 lg-punch am-text-center">` + data.html + `</div>`
        let html = `<!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style> ${css} </style>
        </head>
        <body>
        ${data.more.html}
        </body>
        </html>`;

        let pannel = vscode.window.createWebviewPanel(``, `今日运势`, vscode.ViewColumn.Two);
        let pannelClosed = false;
        pannel.onDidDispose(() => pannelClosed = true)
        pannel.webview.html = html;
      } else {
        vscode.window.showInformationMessage(data.message)
      }
      console.log(data)
    }
  }
})
