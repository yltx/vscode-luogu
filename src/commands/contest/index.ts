import SuperCommand from '../SuperCommand'
import { getResourceFilePath, searchContest, getStatus, formatTime, changeTime, getRanklist } from '@/utils/api'
import * as vscode from 'vscode'
import md from '@/utils/markdown'
import { UserStatus, contestStyle, contestType, contestVisibility, contestVisibilityStyle, contestRated } from '@/utils/shared'
import { getUsernameStyle, getUserSvg, getScoreColor } from '@/utils/workspaceUtils'
import { debug } from '@/utils/debug.ts'

export default new SuperCommand({
  onCommand: 'contest',
  handle: async () => {
    while (!exports.init) { continue }
    if (await getStatus() === UserStatus.SignedOut.toString()) {
      vscode.window.showErrorMessage('未登录')
      return
    }
    let defaultID = exports.cid
    const cid = await vscode.window.showInputBox({
      placeHolder: '输入比赛编号',
      value: defaultID,
      ignoreFocusOut: true
    }).then(res => res ? res.toUpperCase() : null)
    if (!cid) {
      return
    }
    exports.cid = cid
    try {
      const res = await searchContest(cid)
      console.log(res)
      const ranklist = await getRanklist(cid, 1)
      console.log(ranklist)
      const panel = vscode.window.createWebviewPanel(cid, `比赛详情 - ${res.contest.name}`, vscode.ViewColumn.Two, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.file(exports.resourcesPath)]
      })
      /*let i = 0
      for (; i < 4 ;i++) {
        console.log(ranklist['firstBloodUID'][res['contestProblems'][i]['problem']['pid']] === ranklist['scoreboard']['result'][4]['user']['uid'])
      }*/
      panel.webview.onDidReceiveMessage(async message => {
        console.log(`Got ${message.type} request: message = `, message.data)
        if (message.type === 'request-ranklist') {
          panel.webview.postMessage({
            type: 'ranklist',
            message: {
              html: await generateRanklist(res, await getRanklist(cid, message.data as number), message.data as number)
            }
          })
        }
      })
      //   const html = await generateHTML(res, ranklist)
      const html = await generateHTML(res, ranklist)
      debug(html)
      panel.webview.html = html
    } catch (err) {
      vscode.window.showErrorMessage('查看失败')
      vscode.window.showErrorMessage(err)
      console.error(err)
    }
  }
})

const generateRanklist = async (res: any[], ranklist: any[], nowpage: number) => {
  console.log(ranklist)
  const contest = res['contest']
  let html = `<table>
    <tr>
    <th>名次</th>
    <th>参赛者</th>
    <th>总分</th>
    `
  for (let i = 0; i < contest['problemCount']; i++) {
    html += `<th>${String.fromCharCode(65 + i)}</th>`
  }
  html += '</tr>'
  for (let i = 0; i < Math.min(ranklist['scoreboard']['perPage'], ranklist['scoreboard']['count'] - 50 * (nowpage - 1)); i++) {
    html += `<tr><td align="center">#${i + 50 * (nowpage - 1) + 1}</td><td align="center" style="${getUsernameStyle(ranklist['scoreboard']['result'][i]['user']['color'])}">${ranklist['scoreboard']['result'][i]['user']['name']}${getUserSvg(ranklist['scoreboard']['result'][i]['user']['ccfLevel'])}</td><td align="center">${ranklist['scoreboard']['result'][i]['score']}<br data-v-239a177d data-v-6e56e2aa><span data-v-239a177d data-v-6e56e2aa class="time" style="color: rgb(155,155,155);">`
    if (contest['ruleType'] === 2 || contest['ruleType'] === 5) {
      html += `(${Math.floor((ranklist['scoreboard']['result'][i]['runningTime'] / 3600) % 24)}:${Math.floor((ranklist['scoreboard']['result'][i]['runningTime'] % 3600) / 60)})`
    } else {
      html += `${ranklist['scoreboard']['result'][i]['runningTime']}ms`
    }
    html += '</span></td>'
    for (let j = 0; j < contest['problemCount']; j++) {
      if (ranklist['scoreboard']['result'][i]['details'][res['contestProblems'][j]['problem']['pid']] != null) {
        if (ranklist['scoreboard']['result'][i]['details'][res['contestProblems'][j]['problem']['pid']]['score'] > 0) {
          if (contest['ruleType'] === 2 || contest['ruleType'] === 5) {
            html += '<td align="center" style="font-weight: bold; color: rgb(82, 196, 26);'
            if (ranklist['scoreboard']['result'][i]['user']['uid'] === ranklist['firstBloodUID'][res['contestProblems'][j]['problem']['pid']]) {
              html += ' background-color: rgb(217, 240, 199);'
            }
            html += '">+'
          } else {
            html += `<td align="center" style="color: ${getScoreColor(ranklist['scoreboard']['result'][i]['details'][res['contestProblems'][j]['problem']['pid']]['score'])}; font-weight: bold;`
            if (ranklist['scoreboard']['result'][i]['user']['uid'] === ranklist['firstBloodUID'][res['contestProblems'][j]['problem']['pid']]) {
              html += ' background-color: rgb(217, 240, 199);'
            }
            html += '">'
          }
          html += ranklist['scoreboard']['result'][i]['details'][res['contestProblems'][j]['problem']['pid']]['score']
        } else if (ranklist['scoreboard']['result'][i]['details'][res['contestProblems'][j]['problem']['pid']]['score'] < 0) {
          html += `<td align="center" style="font-weight: bold; color: rgb(231, 76, 60);">${ranklist['scoreboard']['result'][i]['details'][res['contestProblems'][j]['problem']['pid']]['score']}`
        } else if (ranklist['scoreboard']['result'][i]['details'][res['contestProblems'][j]['problem']['pid']]['score'] === 0) {
          if (contest['ruleType'] === 2 || contest['ruleType'] === 5) {
            html += '<td align="center"'
            if (ranklist['scoreboard']['result'][i]['user']['uid'] === ranklist['firstBloodUID'][res['contestProblems'][j]['problem']['pid']]) {
              html += ' style="background-color: rgb(217, 240, 199);"'
            }
            html += '><span data-v-239a177d="" data-v-6e56e2aa="" style="color: rgb(82, 196, 26);"><svg width="16" height="21.82" data-v-239a177d="" data-v-6e56e2aa="" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="check" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-check fa-w-16"><path data-v-239a177d="" data-v-6e56e2aa="" fill="currentColor" d="M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z" class=""></path></svg></span>'
          } else {
            html += `<td align="center" style="color: ${getScoreColor(ranklist['scoreboard']['result'][i]['details'][res['contestProblems'][j]['problem']['pid']]['score'])};font-weight: bold">${ranklist['scoreboard']['result'][i]['details'][res['contestProblems'][j]['problem']['pid']]['score']}`
          }
        }
        if (ranklist['scoreboard']['result'][i]['details'][res['contestProblems'][j]['problem']['pid']]['runningTime'] != null) {
          html += '<br data-v-239a177d data-v-6e56e2aa><span data-v-239a177d data-v-6e56e2aa class="time" style="color: rgb(155,155,155);">'
          if (contest['ruleType'] === 2 || contest['ruleType'] === 5) {
            html += `(${Math.floor((ranklist['scoreboard']['result'][i]['details'][res['contestProblems'][j]['problem']['pid']]['runningTime'] / 3600) % 24)}:${Math.floor((ranklist['scoreboard']['result'][i]['details'][res['contestProblems'][j]['problem']['pid']]['runningTime'] % 3600) / 60)})`
          } else {
            html += `${ranklist['scoreboard']['result'][i]['details'][res['contestProblems'][j]['problem']['pid']]['runningTime']}ms`
          }
          html += '</span>'
        }
        html += '</td>'
      } else {
        html += '<td align="center"></td>'
      }
    }
  }
  html += '</table>'
  return html
}

const generateHTML = async (res: any[], ranklist: any[]) => {
  const contest = res['contest']
  console.log(ranklist)
  let html = `
    <!DOCTYPE html>
    <html lang="zh">

    <head>
        <meta charset="utf-8">
        <link rel="stylesheet" href="${getResourceFilePath('katex.min.css')}">
        <link rel="stylesheet" href="${getResourceFilePath('highlightjs.default.min.css')}">
        <link rel="stylesheet" href="${getResourceFilePath('loader.css')}">
        <link rel="stylesheet" href="${getResourceFilePath('solution.css')}">
        <link rel="stylesheet" href="${getResourceFilePath('sweetalert.css')}">
        <script src="${getResourceFilePath('jquery.min.js')}"></script>
        <script src="${getResourceFilePath('sweetalert-dev.js')}"></script>
        <style>
        pre {
            margin: .5em 0 !important;
            padding: .3em .5em !important;
            border: #ddd solid 1px !important;
            border-radius: 3px !important;
            overflow: auto !important;
            position: relative;
        }
        code {
            font-size: .875em !important;
            font-family: Courier New !important;
        }
        </style>
        <script>
        const vscode = acquireVsCodeApi();
        function scrollToClass (c) {
          $('html, body').animate({
            scrollTop: ($(c).offset().top)
          }, 500);
        }
        $(document).ready(function () {
          window.addEventListener('message', event => {
            if (event.data.type === 'ranklist') {
              const message = event.data.message;
              document.getElementById("RANKLIST").innerHTML=message.html;
              console.log(message.html)
              load();
              scrollToClass('main')
            }
          });
          load();
        });
        </script>
        <title>比赛详情 - ${contest['name']}</title>
    </head>

    <body>
        <h1 data-v-52820d90="" class="lfe-h1">${contest['name']}</h1>
        <div data-v-6febb0e8="" data-v-72177bf8=""  class="card padding-default" style="margin-bottom: 1em;">
            <div data-v-83303c00="" class="field">
                <span data-v-83303c00="" class="key lfe-caption">题目数</span>
                <span data-v-83303c00="" class="value lfe-caption">${contest['problemCount']}</span>
            </div>
            <div data-v-83303c00="" class="field">
                <span data-v-83303c00="" class="key lfe-caption">报名人数</span>
                <span data-v-83303c00="" class="value lfe-caption">${contest['totalParticipants']}</span>
            </div>
            <div data-v-796309f8="" data-v-6febb0e8="">
                <div data-v-3a151854="" class="info-rows" data-v-796309f8="">
                    <div data-v-3a151854="">
                        <span data-v-3a151854="">
                            <span data-v-3a151854="">比赛编号</span>
                        </span>
                        <span data-v-3a151854="">
                            <span data-v-3a151854="">${contest['id']}</span>
                        </span>
                    </div>
                    <div data-v-3a151854="">
                        <span data-v-3a151854="">
                            <span data-v-3a151854="">举办者</span>
                        </span>
                        <span data-v-3a151854="">
                            <span data-v-3a151854="">`
  if (contest['visibilityType'] > 3 && contest['visibilityType'] < 6) {
    html += `
                                <span data-v-360481bd="" class="wrapper">
                                    <span data-v-360481bd="" data-v-303bbf52="" style="${getUsernameStyle(contest['host']['color'].toLowerCase())}">
                                        ${contest['host']['name']}
                                    </span>
                                    ${getUserSvg(contest['host']['ccfLevel'])}
                                </span>`
  } else {
    html += `
                                <span data-v-360481bd="" class="wrapper">
                                    <span data-v-360481bd="" data-v-303bbf52="" style="color: rgb(52, 152, 219);">
                                        ${contest['host']['name']}
                                    </span>
                                </span>`
  }
  html += `
                            </span>
                        </span>
                    </div>
                    <div data-v-3a151854="">
                        <span data-v-3a151854="">
                            <span data-v-3a151854="">比赛类型</span>
                        </span>
                        <span data-v-20b7d558 data-v-c0996248 class="lfe-captiontag" style="${contestStyle[contest['ruleType']]}">${contestType[contest['ruleType']]}</span>
                        <span data-v-20b7d558 data-v-c0996248  class="lfe-caption tag" style="${contestVisibilityStyle[contest['visibilityType']]}">${contestVisibility[contest['visibilityType']]}</span>
                        <span data-v-20b7d558 data-v-c0996248 class="lfe-caption tag" style="${contestRated[contest['rated']]}">Rated</span>
                    </div>
                    <div>
                        <span data-v-8d4c9aee="" class="lfe-caption">开始时间：${formatTime(new Date(contest['startTime'] as number * 1000), 'yyyy-MM-dd hh:mm:ss')}</span>
                    </div>
                    <div>
                        <span data-v-8d4c9aee="" class="lfe-caption">结束时间：${formatTime(new Date(contest['endTime'] as number * 1000), 'yyyy-MM-dd hh:mm:ss')}</span>
                    </div>
                    <div>
                        <span data-v-8d4c9aee="" class="lfe-caption">比赛时长：${changeTime(+contest['endTime'] - +contest['startTime'])}</span>
                    </div>
                    <div>
                        <span data-v-8d4c9aee="" class="lfe-caption" id="countdown"> </span>
                    </div>
                </div>
            </div>
        </div>
        <main data-v-27cf0bac="" class="wrapped lfe-body" style="background-color: rgb(239, 239, 239);">
            <div data-v-6febb0e8="" data-v-27cf0bac="" class="full-container" currenttemplate="ContestShow" currenttheme="[object Object]" style="margin-top: 2em;">
                <div data-v-796309f8="" class="card padding-default" data-v-6febb0e8="">
                    <div data-v-8feadc5c="" slot="header" data-v-796309f8="">
                        <div data-v-8feadc5c="" class="category">
                            <!---->
                            <table>
                                <tr>
                                    <td align="center" align="center" data-v-8feadc5c="" class=""><!----><input type="button" value="比赛说明" onclick="Description()" style="background-color: rgb(52,152,219); color: rgb(255,255,255)" id="description"></td>
                                    <td align="center" align="center" data-v-8feadc5c="" class=""><!----> <input type="button" value="题目列表" onclick="ProblemList()" id="problemlist"></td>
                                    <td align="center" align="center" data-v-8feadc5c="" class=""><!----> <input type="button" value="排行榜" onclick="Ranklist()" id="ranklist"></td>
                                </tr>
                            </table>
                            <script>
                                var last="description"
                                var lastshow="showdescription"
                                function Description() {
                                    document.getElementById(last).style=""
                                    document.getElementById(lastshow).style="display: none"
                                    last="description"
                                    lastshow="showdescription"
                                    document.getElementById(last).style="background-color: rgb(52,152,219); color: rgb(255,255,255)"
                                    document.getElementById(lastshow).style=""
                                }
                                function ProblemList() {
                                    document.getElementById(last).style=""
                                    document.getElementById(lastshow).style="display: none"
                                    last="problemlist"
                                    lastshow="showproblem"
                                    document.getElementById(last).style="background-color: rgb(52,152,219); color: rgb(255,255,255)"
                                    document.getElementById(lastshow).style=""
                                }
                                function Ranklist() {
                                    document.getElementById(last).style=""
                                    document.getElementById(lastshow).style="display: none"
                                    last="ranklist"
                                    lastshow="showranklist"
                                    document.getElementById(last).style="background-color: rgb(52,152,219); color: rgb(255,255,255)"
                                    document.getElementById(lastshow).style=""
                                }
                            </script>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <script>
            function formatCountDown(begin, end) {
                var x = 0
                var now = Math.floor(new Date().getTime() / 1000)
                var res = ''
                if (now < begin) {
                    res = '据比赛开始还有 '
                    x = begin - now
                }
                if (now >= begin && now <= end) {
                    res = '据比赛结束还有 '
                    x = end - now
                }
                if (now > end) {
                    return '比赛已经结束了'
                }
                res += formatTime(x)
                return res
            }

            function formatTime(x) {
                var res = ''
                if (x >= 86400) {
                    res += \`\${Math.floor(x / 86400)} 天 \`
                    // res += Math.floor(x / 86400).toString() + ' 天 '
                    x -= Math.floor(x / 86400) * 86400
                }
                if (x >= 3600) {
                    // res += Math.floor(x / 3600).toString() + ' 小时 '
                    res += \`\${Math.floor(x / 3600)} 小时 \`
                    x -= Math.floor(x / 3600) * 3600
                }
                if (x >= 60) {
                    // res += Math.floor(x / 60).toString() + ' 分 '
                    res += \`\${Math.floor(x / 60)} 分 \`
                    x -= Math.floor(x / 60) * 60
                }
                if (x > 0) {
                    // res += x.toString() + ' 秒 '
                    res += \`\${x} 秒 \`
                }
                return res
            }

            function updateCountDown() {
                document.getElementById("countdown").innerText = formatCountDown(${contest['startTime']}, ${contest['endTime']})
            }

            setInterval(() => {
                updateCountDown();
            }, 1000);
            updateCountDown();
        </script>
        <!-- 以下为比赛说明 -->

        <div data-v-17281a3e="" data-v-8d4c9aee="" class="marked" data-v-0776707c="" id="showdescription" class="card padding-default">
            <section data-v-72177bf8="" data-v-6febb0e8="" class="main">
                <section data-v-6febb0e8="">
                    <div data-v-6febb0e8="">
                        <div data-v-796309f8="" class="card padding-default">
                            <div data-v-5a58a989="" class="marked" data-v-796309f8="">
                                <p>${md.render(contest['description'])}</p>
                            </div>
                        </div>
                    </div>
                </section>
            </section>
        </div>
        <!-- 以下为题目列表 -->
        <div class="card padding-default" style="display: none" id="showproblem">
            <span data-v-8d4c9aee="" class="lfe-caption" id="problem"> </span>
        </div>
        <script>
            function showProblem(problem) {
                var i = 0
                var ans = '<table>\\n<tr>\\n<td align="center">题号</td>\\n<td align="center">满分</td>\\n<td align="center">题目名称</td>\\n<td align="center"></td>\\n</tr>\\n'
                for (; i < problem.length; i++) {
                    ans += '<tr>\\n<td align="center">' + String.fromCharCode(65 + i) + '</td>\\n<td align="center" align="center">' + problem[i]['score'] + '</td>\\n<td align="center" align="center">' + problem[i]['problem']['title']
                    if (problem[i]['submitted'] === true) {
                        ans += '</td>\\n<td align="center" align="center" style="color: rgb(255, 255, 255); background: rgb(82, 196, 26);">已提交</td>\\n</tr>\\n'
                    } else {
                        ans += '</td>\\n<td align="center" style="color: rgb(255, 255, 255); background: rgb(231, 76, 60);">未提交</td>\\n</tr>\\n'
                    }
                }
                ans += '</tr>\\n</table>\\n'
                return ans
            }
            document.getElementById("problem").innerHTML = showProblem(${JSON.stringify(res['contestProblems'])})
        </script>
        <!-- 以下为排行榜 -->
        <script>
        var pos = 1;
        function prepost() {
            if(pos === 1){
                swal("好像哪里有点问题", "已经是第一页了", "error");
                return;
            }
            pos--;
            // document.getElementById("RANKLIST").innerText = pos;
            vscode.postMessage({ type: 'request-ranklist', data: pos });
            scrollToClass('main')
        };
        function nxtpost() {
            if (pos === Math.ceil(${ranklist['scoreboard']['count']} / 50.0)) {
                swal("好像哪里有点问题", "已经是最后一页了", "error");
                return;
            }
            pos++;
            // document.getElementById("RANKLIST").innerText = pos;
            vscode.postMessage({ type: 'request-ranklist', data: pos });
            scrollToClass('main')
        };
        function gotokthpage() {
            var p = document.getElementById("KTHPAGE").value;
            var tmp = parseInt(p);
            if (tmp < 1 || tmp > Math.ceil(${ranklist['scoreboard']['count']} / 50.0)) {
                swal("好像哪里有点问题", "不合法的页数", "error");
                return;
            }
            pos = tmp;
            vscode.postMessage({ type: 'request-ranklist', data: pos });
            scrollToClass('main')
        }
        </script>
        <div data-v-6e56e2aa="" class="card padding-default" style="display: none" id="showranklist">
            <div data-v-6e56e2aa="" class="header-wrap">
                <div data-v-239a177d="" data-v-6e56e2aa="" class="header">
                    <span id="RANKLIST">
                    ${await generateRanklist(res, ranklist, 1)}
                    </span>
                    <div class="post-nav">
                        <div class="post-nav-prev post-nav-item">
                            <input type="button" onmouseout="this.style.backgroundColor='white';" onmouseover="this.style.backgroundColor='rgb(0,195,255)';"  class="pre-post" onclick="prepost()" value="上一页">
                        </div>
                        <span class="post-nav-divider"></span>
                        <div>
                            <span><input type="text" class="am-form-field" placeholder="输入要跳转到的页码" id="KTHPAGE">
                            <input type="button" onmouseout="this.style.backgroundColor='white';" onmouseover="this.style.backgroundColor='rgb(0,195,255)';" value="跳转" onclick="gotokthpage()" id="KTHPAGE"></span>
                        </div>
                        <span class="post-nav-divider"></span>
                        <div class="post-nav-next post-nav-item">
                            <input type="button" onmouseout="this.style.backgroundColor='white';" onmouseover="this.style.backgroundColor='rgb(0,195,255)';"  class="nxt-post" onclick="nxtpost()" value="下一页">
                        </div>
                    <div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `
  return html
}
