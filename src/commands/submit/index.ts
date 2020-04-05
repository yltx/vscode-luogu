import SuperCommand from '../SuperCommand'
import * as vscode from 'vscode'
import { UserStatus, Languages, resultState } from '../../utils/shared'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import { getSelectedLanguage, getStatusText, getStatusColor, getScoreColor } from '../../utils/workspaceUtils';
import { submitSolution, fetchResult } from '../../utils/api'
import { debug } from '../../utils/debug'

const luoguJSONName = 'luogu.json';
exports.luoguPath = path.join(os.homedir(), '.luogu');
exports.luoguJSONPath = path.join(exports.luoguPath, luoguJSONName);
exports.luoguCsrfToken = path.join(exports.luoguPath, 'CsrfToken');

const delay = (t: number) => new Promise(resolve => setTimeout(resolve, t))

/*
export const getStatus = async (): Promise<string> =>
  new Promise((resolve, reject) => {
    fs.readFile(exports.luoguJSONPath, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.toString());
      }
    })
  })
*/

export function getStatus (): string {
  return fs.existsSync(exports.luoguJSONPath) ? '1' : '2';
}
export default new SuperCommand({
  onCommand: 'submitSolution',
  handle: async () => {
    const edtior = vscode.window.activeTextEditor;
    if (!edtior) {
      vscode.window.showErrorMessage('您没有打开任何文件，请打开一个文件后重试');
      return;
    }
    if (getStatus() === UserStatus.SignedOut.toString()) {
      vscode.window.showErrorMessage('您没有登录，请先登录');
      return;
    }
    let text = edtior.document.getText();
    const filePath = edtior.document.fileName;
    const fileFName = path.parse(filePath).base;
    const O2 = await vscode.window.showQuickPick(['否', '是'], {
      placeHolder: '是否开启O2优化 (非 C/C++/Pascal 切勿开启)'
    }).then(ans => ans === '是');
    const defaultLanguage = vscode.workspace.getConfiguration().get('luogu.defaultLanguage');
    console.log(defaultLanguage);
    // tslint:disable-next-line: strict-type-predicates
    // const langs = Object.keys(Languages).filter(k => typeof Languages[k as any] === 'number');
    let langs: string[] = new Array();
    for (let item in Languages) {
      if (isNaN(Number(item))) {
        if (item === defaultLanguage) {
          langs.push(item)
        }
      }
    }
    for (let item in Languages) {
      if (isNaN(Number(item))) {
        if (item !== defaultLanguage) {
          langs.push(item)
        }
      }
    }
    const selected = await vscode.window.showQuickPick(langs).then((value) => {
      const v = getSelectedLanguage(value);
      return (v === -1 || !v) ? 0 : v;
    });
    const id = await vscode.window.showInputBox({
      placeHolder: '输入提交到的题目ID',
      validateInput: s => s && s.trim() ? undefined : '输入不能为空'
    });
    if (!id) {
      return;
    }

    try {
      vscode.window.showInformationMessage(`${fileFName} 正在提交到 ${id}...`);
      const rid = await submitSolution(id, text, selected, O2);
      vscode.window.showInformationMessage('提交成功');
      // const url = `https://www.luogu.com.cn/record/${rid}`;
      let pannel = vscode.window.createWebviewPanel(`${rid}`, `R${rid} 记录详情`, vscode.ViewColumn.Two);
      let pannelClosed = false;

      pannel.onDidDispose(() => pannelClosed = true)

      while (!pannelClosed) {
        const result = await fetchResult(rid);
        debug('Get result: ', result.record)
        pannel.webview.html = generateHTML(result);
        if (!(result.record.status >= 0 && result.record.status <= 1)) {
          break
        }
        await delay(1000)
      }
    } catch (error) {
      vscode.window.showErrorMessage('提交失败');
      console.error(error);
    }
  }
})

function generateHTML (data: any) {
  const css = `
  .test-case-wrap>.wrapper {
    width: 100px;
    height: 100px;
    margin-right: 16px;
    margin-bottom: 12px;
  }
  .test-case-wrap {
    margin-top: 25px;
  }
  .test-case-wrap>.wrapper .test-case {
    width: 100px;
    height: 100px;
    transition: all .2s ease;
    box-shadow: 0 4px 6px rgba(50, 50, 93, .11), 0 1px 3px rgba(0, 0, 0, .08);
    border-radius: 3px;
    padding: 3px;
  }
  .test-case-wrap>.wrapper .test-case:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(50, 50, 93, .1), 0 5px 15px rgba(0, 0, 0, .07);
  }
  .test-case-wrap>.wrapper .test-case .info {
    width: calc(100% - 10px);
    line-height: 15px;
    font-size: 10px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .test-case-wrap>.wrapper .test-case:hover .info {
    white-space: normal;
  }
  .test-case-wrap>.wrapper .test-case .id {
    margin-left: 3px;
  }
  .test-case-wrap>.wrapper .test-case .status {
    font-weight: bold;
    font-size: 22px;
    margin-bottom: 5px;
  }
  .test-case-wrap>.wrapper .message {
    transition: all .25s ease !important;
    display: block !important;
    border-radius: 3px;
    box-shadow: 0 4px 6px rgba(50, 50, 93, .11), 0 1px 3px rgba(0, 0, 0, .08);
    min-width: 105px;
    min-height: 105px;
    width: 105px;
    padding: 0;
    margin-top: 40px;
    opacity: 0;
    color: transparent;
    background: transparent;
    pointer-events: none;
  }
  .test-case-wrap>.wrapper:hover .message {
    border-radius: 30px;
    margin-top: -30px;
    min-width: 12em;
    min-height: 1em;
    width: unset;
    height: unset;
    padding: 5px 18px;
    opacity: .8;
    color: #fff;
    background: #172b4d;
  }
  .test-case-wrap>.wrapper .test-case[style*='rgb(112, 173, 71)'] {
    background-color: #2dce89 !important;
  }
  .test-case-wrap>.wrapper .test-case[style*='rgb(231, 76, 60)'] {
    background-color: #fb6340 !important;
  }
  .test-case-wrap>.wrapper .test-case[style*='rgb(157, 61, 207)'] {
    background-color: #8e44ad !important;
  }
  .test-case-wrap>.wrapper .test-case[style*='rgb(5, 34, 66)'] {
    background-color: #001277 !important;
  }
  .test-case-wrap>.wrapper .test-case[style*='rgb(14, 29, 105)'] {
    background-color: #34495e !important;
  }
  .test-case-wrap>.wrapper .test-case[style*='background: rgb(20, 85, 143);'] {
    background-color: #3498db !important;
  }
  .padding-default[data-v-796309f8] {
    padding: 1.3em;
  }
  .card[data-v-796309f8] {
    display: block;
    margin-bottom: 1.3em;
    background-color: #fff;
    box-shadow: 0 1px 3px rgba(26, 26, 26, .1);
    box-sizing: border-box;
  }
  .lg-article,
  .lg-summary,
  .lg-article-sub,
  .lg-content-table-left,
  .card {
    background: rgba(252, 252, 252, 1.0) !important;
  }
  .card {
    line-height: 1.8;
  }
  .lg-article,
  .lg-summary,
  .lg-article-sub,
  .card {
    transition: all .15s ease;
    box-shadow: 0 5px 15px rgba(50, 50, 93, .1), 0 5px 8px rgba(0, 0, 0, .07) !important;
    word-wrap: break-word;
    border-radius: .25rem;
    background-color: #fcfcfc !important;
    overflow: visible !important;
  }
  .lfe-body {
    font-family: -apple-system, BlinkMacSystemFont, "San Francisco", "Helvetica Neue", "Noto Sans CJK SC", "Noto Sans CJK", "Source Han Sans", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 16px;
    line-height: 1.5;
    color: rgba(0, 0, 0, .85);
  }
  .lfe-h3 {
    font-size: 1.125em;
  }
  .lfe-h1,
  .lfe-h2,
  .lfe-h3,
  .lfe-h4,
  .lfe-h5,
  .lfe-h6 {
    margin-top: 0;
    margin-bottom: .5em;
    font-family: inherit;
    font-weight: bold;
    line-height: 1.2;
    color: inherit;
  }
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-weight: 600 !important;
  }
  h3 {
    display: block;
    font-size: 1.17em;
    margin-block-start: 1em;
    margin-block-end: 1em;
    margin-inline-start: 0px;
    margin-inline-end: 0px;
    font-weight: bold;
  }
  .test-case-wrap {
    margin-top: 25px;
  }
  div {
    display: block;
  }
  .wrapper[data-v-bb301a88] {
    position: relative;
    display: inline-block;
  }
  .content[data-v-bb301a88] {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column-reverse;
    align-items: center;
    justify-content: center;
  }
  .test-case[data-v-bb301a88] {
    position: relative;
    vertical-align: top;
    cursor: pointer;
    margin: 0.2em;
    height: 6em;
    width: 6em;
    padding: 0;
    color: #fff;
  }
  .id[data-v-bb301a88] {
    position: absolute;
    top: 0;
    left: 0;
    padding: 6px;
    font-size: .65em;
  }
  .message[data-v-bb301a88] {
    display: block;
    position: absolute;
    background-color: #333333;
    color: #fafafa;
    border-radius: 3px;
    font-size: .75em;
    z-index: 10;
    left: 50%;
    transform: translateX(-50%);
    padding: .5em;
    margin: 6px;
    min-width: 12em;
    max-width: 16em;
    white-space: pre-line;
    top: -7em;
    transition: .6s ease all;
    opacity: 0;
    pointer-events: none;
  }
  .content>div[data-v-bb301a88] {
    padding-top: 2px;
    padding-bottom: 2px;
  }
  .info[data-v-bb301a88] {
    font-size: .7em;
    text-align: center;
  }
  .main[data-v-72177bf8] {
    display: inline-block;
    width: calc(66.67% - .5em);
    box-sizing: border-box;
  }
  .card[data-v-796309f8] {
    display: block;
    margin-bottom: 1.3em;
    background-color: #fff;
    box-shadow: 0 1px 3px rgba(26, 26, 26, .1);
    box-sizing: border-box;
  }
  .category[data-v-8feadc5c]:last-child {
    margin-bottom: 0;
  }
  .category[data-v-8feadc5c] {
    display: flex;
    align-items: baseline;
    margin-bottom: 1em;
  }
  .items[data-v-8feadc5c] {
    overflow: hidden;
  }
  ul[data-v-8feadc5c] {
    padding: 0;
    margin: 0;
    list-style: none;
    outline: 0;
  }
  ul {
    display: block;
    list-style-type: disc;
    margin-block-start: 1em;
    margin-block-end: 1em;
    margin-inline-start: 0px;
    margin-inline-end: 0px;
    padding-inline-start: 40px;
  }
  .items>li[data-v-8feadc5c]:first-child {
    margin-left: 0;
  }
  .items>li[data-v-8feadc5c] {
    display: inline-block;
    margin-left: 1em;
    padding: 0.063em 0.5em;
    transition: .3s ease all;
    border-radius: 3px;
  }
  .items>li.selected>a[data-v-8feadc5c] {
    cursor: default;
    color: #fff;
  }
  .items>li>a[data-v-8feadc5c] {
    color: inherit;
    text-decoration: none;
  }
  a {
    transition: all .15s;
    color: #ac90f5;
  }
  a {
    background-color: transparent;
  }
  a {
    text-decoration: none;
  }
  .full-container[data-v-6febb0e8] {
    display: block;
    margin-bottom: 2em;
  }
  .wrapped>*[data-v-be2136da] {
    max-width: 1200px;
    margin-left: auto;
    margin-right: auto;
  }
  .side[data-v-72177bf8] {
    width: calc(33.33% - .5em);
    float: right;
    box-sizing: border-box;
  }
  .avatar-small[data-v-6f149a28] {
    margin-right: .2em;
    width: 2em;
    height: 2em;
    vertical-align: -.6em;
    border-radius: 50%;
  }
  .name[data-v-6f149a28],
  .tags[data-v-6f149a28],
  img[data-v-6f149a28] {
    vertical-align: middle;
  }
  .info-rows>*[data-v-3a151854] {
    margin-bottom: var(--info-row-margin-bottom, 1em);
    display: flex;
    align-items: center;
  }
  .info-rows>*[data-v-3a151854]:last-child {
    margin-bottom: 0;
  }
  .info-rows>*>*[data-v-3a151854]:first-child {
    flex: 1 0 auto;
  }
  div[data-v-5ccef6e7] {
    display: flex;
    align-items: baseline;
  }
  .pid[data-v-5ccef6e7] {
    width: 4em;
  }
  .wrapped>*[data-v-be2136da] {
    max-width: 1200px;
    margin-left: auto;
    margin-right: auto;
  }
  html>body {
    background-image: url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/PjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+PHN2ZyB0PSIxNTUwOTcwNDY1MzQ4IiBjbGFzcz0iaWNvbiIgc3R5bGU9IiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjExMzUiIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMSIgaGVpZ2h0PSIxIj48ZGVmcz48c3R5bGUgdHlwZT0idGV4dC9jc3MiPjwvc3R5bGU+PC9kZWZzPjxwYXRoIGQ9IiIgcC1pZD0iMTEzNiIgZmlsbD0iI2ZmZmZmZiI+PC9wYXRoPjwvc3ZnPg==);
    background-repeat: no-repeat;
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
  }
  body {
    overflow-x: hidden;
  }
  html,
  body {
    font-family: 'open sans' !important;
  }
  html,
  body {
    background-color: #f4f5f7 !important;
  }
  body {
    margin: 0;
  }
  body {
    display: flex;
    min-height: 100vh;
    flex-direction: column;
  }
  html {
    line-height: 1.15;
    -webkit-text-size-adjust: 100%;
  }
  .header-layout.normal[data-v-be2136da] {
    height: 10em;
  }
  .main-container>.header-layout {
    height: 230px !important;
    display: block;
    position: relative !important;
    left: 0 !important;
    right: 0 !important;
    background: linear-gradient(87deg, #ac90f5 0, #825ee4 100%) !important;
    border: none;
    color: #fff;
    font-weight: unset !important;
  }
  .wrapped[data-v-be2136da] {
    padding-left: 1em;
    padding-right: 1em;
  }
  .main-container>.header-layout>.header {
    max-width: 1250px;
    background: transparent !important;
    padding-left: 35px;
    position: relative;
  }
  .header[data-v-52820d90] {
    color: #fff;
  }
  .wrapped>*[data-v-be2136da] {
    max-width: 1200px;
    margin-left: auto;
    margin-right: auto;
  }
  .main-container>.header-layout .bread-crumb,
  .main-container>.header-layout .bread-crumb a {
    color: rgba(255, 255, 255, .8) !important;
    text-decoration: none;
  }
  .bread-crumb[data-v-52820d90] {
    padding-top: 1.5em;
    font-size: .8em;
    color: #aaa;
  }
  .main-container>.header-layout>.header>h1 {
    font-size: 50px;
    margin-top: 25px;
    padding-bottom: 8px;
    animation: fadeInLeft .5s ease;
    max-width: calc(100vw - 150px);
  }
  h1[data-v-52820d90] {
    margin-top: .5em;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
  .main-container>.header-layout .bread-crumb,
  .main-container>.header-layout .bread-crumb a {
    color: rgba(255, 255, 255, .8) !important;
    text-decoration: none;
  }
  .link[data-v-019a82aa],
  .text[data-v-019a82aa] {
    color: rgba(255, 255, 255, .75);
  }
  .functional[data-v-52820d90] {
    padding-top: .8em;
  }
  .stat[data-v-52820d90] {
    float: right;
  }
  .operation[data-v-52820d90] {
    display: flex;
    align-items: baseline;
    color: #fff;
  }
  .stat[data-v-83303c00] {
    display: inline-block;
  }
  .stat[data-v-52820d90] {
    float: right;
  }
  .stat>.field[data-v-83303c00]:first-child {
    border-left: none;
  }
  .color-inverse>.field[data-v-83303c00] {
    color: #fff;
    /* border-left: 1px solid #fff; */
  }
  .field[data-v-83303c00] {
    display: inline-block;
    padding: 0 .8em;
  }
  .key[data-v-83303c00],
  .value[data-v-83303c00] {
    display: block;
    text-align: center;
  }
  .lfe-caption {
    font-size: 0.875em;
  }
  .value[data-v-83303c00] {
    line-height: 1.5;
    font-weight: 700;
  }
  .key[data-v-83303c00],
  .value[data-v-83303c00] {
    display: block;
    text-align: center;
  }
  .main-container[data-v-be2136da] {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 100vh;
  }
  /**/
  .main-container>.header-layout>.header .user-nav {
    right: 0;
  }
  .user-nav[data-v-52820d90] {
    position: absolute;
    right: 4em;
    top: 0;
    padding: .5em 1em;
    color: #333;
    background-color: rgba(255, 255, 255, .5);
    border-bottom-left-radius: 5px;
    border-bottom-right-radius: 5px;
  }
  nav[data-v-4346566c] {
    position: relative;
  }
  div[data-v-034eb354] {
    display: inline-block;
  }
  .icon-btn[data-v-4346566c] {
    margin-left: .7em;
  }
  a[data-v-4346566c] {
    color: inherit;
  }
  a[data-v-445f91a0] {
    text-decoration: none;
  }
  .wrapper[data-v-4634c763] {
    position: relative;
  }
  .search-wrap[data-v-034eb354] {
    margin-right: .4em;
    font-size: .9em;
    width: 0;
    vertical-align: middle;
    overflow: hidden;
    transition: width .15s ease;
  }
  .icon[data-v-034eb354] {
    color: inherit;
  }
  input[data-v-034eb354] {
    padding: .2em .5em;
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #ccc;
    border-radius: 5px;
    background: rgba(255, 255, 255, .3);
    outline: 0;
  }
  button,
  input {
    overflow: visible;
  }
  button,
  input,
  optgroup,
  select,
  textarea {
    font-family: inherit;
    font-size: 100%;
    line-height: 1.15;
    margin: 0;
  }
  svg:not(:root).svg-inline--fa {
    overflow: visible;
  }
  .svg-inline--fa.fa-w-16 {
    width: 1em;
  }
  .svg-inline--fa {
    display: inline-block;
    font-size: inherit;
    height: 1em;
    overflow: visible;
    vertical-align: -0.125em;
  }
  .wrapper.hover .dropdown[data-v-4634c763] {
    transition-delay: var(--dropdown-transition-delay, .5s);
  }
  .wrapper .dropdown[data-v-4634c763] {
    position: absolute;
    z-index: var(--dropdown-z-index, 9);
    visibility: hidden;
    opacity: 0;
    transition: .233s ease all;
  }
  .center[data-v-5f56d5f6] {
    position: absolute;
    width: 15em;
    right: -1em;
    top: 1.5em;
    overflow: hidden;
    z-index: 999;
    text-align: center;
    color: #6c757d;
    background: #fff;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-shadow: 0 0 15px 1px rgba(12, 12, 12, 0.3);
  }
  .header[data-v-5f56d5f6] {
    padding: .4em;
    font-size: 1.2em;
    font-weight: 700;
    margin-bottom: -.2em;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
  .ops[data-v-5f56d5f6] {
    padding: .5em .2em;
    text-align: center;
    font-size: 0.9em;
  }
  footer[data-v-5f56d5f6] {
    padding: .6em;
    font-size: .9em;
    /* border-top: 1px solid #ccc; */
    /* background: #f8f8f8; */
    margin-top: -.2em;
  }
  .avatar[data-v-4346566c] {
    margin-left: .4em;
    vertical-align: middle;
    width: 35px;
    height: 35px;
    border-radius: 50%;
  }
  img {
    border-style: none;
  }`;
  let html = '';
  const subtasks: any[] = Object.values(data.record.detail.judgeResult.subtasks);
  if (data.record.detail.compileResult !== null && false === data.record.detail.compileResult.success) {
    html += `
    <div data-v-327ef1ce="" data-v-6febb0e8="">
      <div data-v-327ef1ce="">
        <div data-v-796309f8="" data-v-327ef1ce="" class="card padding-default">
          <h3 data-v-327ef1ce="" data-v-796309f8="" class="lfe-h3">编译信息</h3>
          <blockquote data-v-327ef1ce="" data-v-796309f8="" class="compile-info">
          ${data.record.detail.compileResult.message.replace(/\n/g, '<br />')}
          </blockquote>
        </div>
      </div>
    </div>`
  } else {
    subtasks.sort((lhs, rhs) => lhs.id - rhs.id)
    html += `<div data-v-327ef1ce="" data-v-6febb0e8="">
          <div data-v-327ef1ce="">
            <div data-v-796309f8="" data-v-327ef1ce="" class="card padding-default">`
    html += `<h3 data-v-327ef1ce="" data-v-796309f8="" class="lfe-h3">测试点信息</h3>`
    for (const subtask of subtasks) {
      html += `<div data-v-327ef1ce="" data-v-796309f8="" class="test-case-wrap">`
      if (subtasks.length > 1) {
        html += `
      <h5 data-v-327ef1ce="" data-v-796309f8="" class="lfe-h5">
        Subtask #${subtask.id + 1}
      </h5>`
      }
      html += generateSubtaskHTML(Object.values(subtask.testCases))
      html += `</div>`
    }
    html += '</div></div></div>'
  }

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style> ${ css} </style>
  </head>
  <body>
    <h2>R${ data.record.id} 记录详情</h2>
    <br />
    <div data-v-796309f8="" data-v-327ef1ce="" class="card padding-default" style="color: #000000">
      状态：<a style="color: ${ getStatusColor(data.record.status)};">${getStatusText(data.record.status)}</a>
      <br />
      分数：<a style="color: ${ getScoreColor(data.record.score)}; font-weight: bold">${data.record.score}</a>
      <br />
      编程语言：${ Languages[data.record.language]} ${data.record.enableO2 ? ` O2` : ``}
      <br />
      代码长度：${ data.record.sourceCodeLength < 1000 ? data.record.sourceCodeLength.toString() + `B` : (data.record.sourceCodeLength / 1000).toString() + `KB`}
      <br />
      用时：${data.record.time < 1000 ? data.record.time.toString() + `ms` : (data.record.time < 60000 ? (data.record.time / 1000).toString() + `s` : (data.record.time / 60000).toString() + `min`)}
      <br />
      内存：${data.record.memory < 1000 ? data.record.memory.toString() + `KB` : (data.record.memory / 1000).toString() + `MB`}
      <br />
    </div>
    ${html}
  </body>
  </html>
  `;
}

function generateSubtaskHTML (testcases: any[]) {
  let html = '';

  testcases.sort((lhs, rhs) => lhs.id - rhs.id)
  for (const testcase of testcases) {
    html += `<div data-v-bb301a88="" data-v-327ef1ce="" class="wrapper" data-v-796309f8="">
        <div data-v-bb301a88="" class="test-case" style="background: ${ getStatusColor(testcase.status)};">
          <div data-v-bb301a88="" class="content">
            <div data-v-bb301a88="" class="info">
            ${testcase.time < 1000 ? testcase.time.toString() + `ms` : (testcase.time < 60000 ? (testcase.time / 1000).toString() + `s` : (testcase.time / 60000).toString() + `min`)}/${testcase.memory < 1000 ? testcase.memory.toString() + `KB` : (testcase.memory / 1000).toString() + `MB`}
            </div>
            <div data-v-bb301a88="" class="status">${ resultState[testcase.status]}</div>
          </div>
          <div data-v-bb301a88="" class="id">#${testcase.id + 1}</div>
        </div>
        <div data-v-bb301a88="" class="message">${ testcase.description} 得分 ${testcase.score}</div>
      </div>
  `;
  }

  return html;
}
