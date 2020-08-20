
import * as vscode from 'vscode'
import { Languages, resultState } from '@/utils/shared'
import { getStatusText, getStatusColor, getScoreColor } from '@/utils/workspaceUtils';
import { fetchResult, getResourceFilePath } from '@/utils/api'
import { debug } from '@/utils/debug'

const delay = (t: number) => new Promise(resolve => setTimeout(resolve, t))

export const showRecord = async (rid: number) => {
  let pannel = vscode.window.createWebviewPanel(`${rid}`, `R${rid} 记录详情`, vscode.ViewColumn.Two, {
    enableScripts: true,
    retainContextWhenHidden: true,
    localResourceRoots: [vscode.Uri.file(exports.resourcesPath)]
  });
  let pannelClosed = false;
  let retryTimes = 0;
  const maxRetryTimes = 2;
  pannel.onDidDispose(() => pannelClosed = true)
  while (!pannelClosed && exports.islogged && retryTimes <= maxRetryTimes) {
    try {
      const result = await fetchResult(rid);
      debug('Get result: ', result.record)
      pannel.webview.html = await generateRecordHTML(result);
      retryTimes = 0
      if (!(result.record.status >= 0 && result.record.status <= 1)) {
        break
      }
      await delay(1000)
    } catch (err) {
      console.error(err)
      vscode.window.showErrorMessage(`获取记录详情失败，已重试 ${retryTimes} 次`);
      retryTimes++
      await delay(2000)
    }
  }
  if (retryTimes === maxRetryTimes + 1) {
    vscode.window.showErrorMessage(`获取记录详情失败`);
  }
};
const entityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

const escapeHtml = (data: string) => {
  return data.replace(/[&<>"'`=\/]/g, s => entityMap[s]);
}

const generateRecordHTML = async (data: any) => {
  let html = '';
  const subtasks: any[] = Object.values(data.record.detail.judgeResult.subtasks);
  const testCaseGroup: any[] = Object.values(data.testCaseGroup);
  const subtasksID = Object.keys(data.testCaseGroup)
  // console.log('subtasks: ')
  // console.log(subtasks)
  // console.log('testCaseGroup: ')
  // console.log(testCaseGroup)
  // console.log('subtaskID: ')
  // console.log(subtasksID)
  if (data.record.detail.compileResult !== null && false === data.record.detail.compileResult.success) {
    html += `
    <div data-v-327ef1ce="" data-v-6febb0e8="">
      <div data-v-327ef1ce="">
        <div data-v-796309f8="" data-v-327ef1ce="" class="card padding-default">
          <h3 data-v-327ef1ce="" data-v-796309f8="" class="lfe-h3">编译信息</h3>
          <blockquote data-v-327ef1ce="" data-v-796309f8="" class="compile-info">
          ${escapeHtml(data.record.detail.compileResult.message).replace(/\n/g, '<br />')}
          </blockquote>
        </div>
      </div>
    </div>`
  } else if (data.record.status !== 0) {
    /*
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
        Subtask #${subtask.id}
      </h5>`
      }
      html += await generateSubtaskHTML(Object.values(subtask.testCases))
      html += `</div>`
    }
    html += '</div></div></div>'
    */
    subtasks.sort((lhs, rhs) => lhs.id - rhs.id)
    html += `<div data-v-327ef1ce="" data-v-6febb0e8="">
          <div data-v-327ef1ce="">
            <div data-v-796309f8="" data-v-327ef1ce="" class="card padding-default">`
    html += `<h3 data-v-327ef1ce="" data-v-796309f8="" class="lfe-h3">测试点信息</h3>`
    let currentSubtaskPos = 0
    for (let i = 0; i < testCaseGroup.length; i++) {
      html += `<div data-v-327ef1ce="" data-v-796309f8="" class="test-case-wrap">`
      if (testCaseGroup.length > 1) {
        html += `
            <h5 data-v-327ef1ce="" data-v-796309f8="" class="lfe-h5">
              Subtask #${subtasksID[i]}
            </h5>`
      }
      // tslint:disable: radix
      while (currentSubtaskPos < subtasks.length && subtasks[currentSubtaskPos].id < parseInt(subtasksID[i])) { currentSubtaskPos++ }
      if (currentSubtaskPos < subtasks.length && subtasks[currentSubtaskPos].id === parseInt(subtasksID[i])) {
        html += await generateRecordSubtaskHTML(Object.values(subtasks[currentSubtaskPos].testCases), testCaseGroup[i])
      } else {
        for (const testcaseID of testCaseGroup[i]) {
          html += `<div data-v-bb301a88="" data-v-d5eaec0a="" class="wrapper" data-v-796309f8=""><div data-v-bb301a88="" class="test-case" style="background: rgb(20, 85, 143);"><div data-v-bb301a88="" class="content"><div data-v-bbdab89a="" data-v-bb301a88="" class="spinner" style="width: 32px; height: 32px;"><div data-v-bbdab89a="" style="width: 32px; height: 32px; border-width: 2px;"></div></div></div> <div data-v-bb301a88="" class="id">#${testcaseID + 1}</div></div> <!----></div>`
        }
      }
      html += `</div>`
    }
    html += '</div></div></div>'
  }
  // todo: open problem in vscode
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="${getResourceFilePath('record.css')}">
  </head>
  <body>
    <h2>R${ data.record.id} 记录详情</h2>
    <br />
    <div data-v-796309f8="" data-v-327ef1ce="" class="card padding-default" style="color: #000000">
      题目：<a data-v-303bbf52="" data-v-5ccef6e7="" href="https://www.luogu.com.cn/problem/${data.record.problem.pid}${data.record.contest ? `?contestId=${data.record.contest.id}` : ''}" class="link color-default"><span data-v-5ccef6e7="" class="pid">${data.record.problem.pid}</span> ${data.record.problem.title} </a>
      <br />
      ${data.record.contest ? `比赛：<a data-v-303bbf52="" data-v-d5eaec0a="" href="https://www.luogu.com.cn/contest/${data.record.contest.id}" class="color-default">${data.record.contest.name}</a><br />` : ''}
      状态：<a style="color: ${ getStatusColor(data.record.status)};">${getStatusText(data.record.status)}</a>
      <br />
      ${data.record.score !== undefined ? `分数：<a style="color: ${getScoreColor(data.record.score)}; font-weight: bold">${data.record.score}</a><br />` : ''}
      编程语言：${ Languages[data.record.language]} ${data.record.enableO2 ? ` O2` : ``}
      <br />
      代码长度：${ data.record.sourceCodeLength < 1000 ? data.record.sourceCodeLength.toString() + `B` : (data.record.sourceCodeLength / 1000).toString() + `KB`}
      <br />
      用时：${ data.record.time < 1000 ? data.record.time.toString() + `ms` : (data.record.time < 60000 ? (data.record.time / 1000).toString() + `s` : (data.record.time / 60000).toString() + `min`)}
      <br />
      内存：${ data.record.memory < 1000 ? data.record.memory.toString() + `KB` : (data.record.memory / 1000).toString() + `MB`}
      <br />
    </div>
    ${ html}
  </body>
  </html>
  `;
}

const generateRecordSubtaskHTML = async (testcases: any[], testcasesGroup: any[]) => {
  let html = '';

  testcases.sort((lhs, rhs) => lhs.id - rhs.id)
  let currenTestcasePos = 0
  for (let i = 0; i < testcasesGroup.length; i++) {
    while (currenTestcasePos < testcases.length && testcases[currenTestcasePos].id < testcasesGroup[i]) { currenTestcasePos++ }
    if (currenTestcasePos < testcases.length && testcases[currenTestcasePos].id === testcasesGroup[i]) {
      html += `<div data-v-bb301a88="" data-v-327ef1ce="" class="wrapper" data-v-796309f8="">
      <div data-v-bb301a88="" class="test-case" style="background: ${ getStatusColor(testcases[currenTestcasePos].status)};">
        <div data-v-bb301a88="" class="content">
          <div data-v-bb301a88="" class="info">
          ${testcases[currenTestcasePos].time < 1000 ? testcases[currenTestcasePos].time.toString() + `ms` : (testcases[currenTestcasePos].time < 60000 ? (testcases[currenTestcasePos].time / 1000).toString() + `s` : (testcases[currenTestcasePos].time / 60000).toString() + `min`)}/${testcases[currenTestcasePos].memory < 1000 ? testcases[currenTestcasePos].memory.toString() + `KB` : (testcases[currenTestcasePos].memory / 1000).toString() + `MB`}
          </div>
          <div data-v-bb301a88="" class="status">${ resultState[testcases[currenTestcasePos].status]}</div>
        </div>
        <div data-v-bb301a88="" class="id">#${testcases[currenTestcasePos].id + 1}</div>
      </div>
      <div data-v-bb301a88="" class="message">${ testcases[currenTestcasePos]?.description ?? ''} 得分 ${testcases[currenTestcasePos].score}</div>
      </div>
      `;
    } else {
      html += `<div data-v-bb301a88="" data-v-d5eaec0a="" class="wrapper" data-v-796309f8=""><div data-v-bb301a88="" class="test-case" style="background: rgb(20, 85, 143);"><div data-v-bb301a88="" class="content"><div data-v-bbdab89a="" data-v-bb301a88="" class="spinner" style="width: 32px; height: 32px;"><div data-v-bbdab89a="" style="width: 32px; height: 32px; border-width: 2px;"></div></div></div> <div data-v-bb301a88="" class="id">#${testcasesGroup[i] + 1}</div></div> <!----></div>`
    }
  }

  return html;
}

export default showRecord;
