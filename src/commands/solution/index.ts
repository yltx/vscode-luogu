import SuperCommand from '../SuperCommand'
import { searchSolution, getStatus, getResourceFilePath, formatTime, loadUserIcon, postVote } from '@/utils/api'
import * as vscode from 'vscode'
import * as path from 'path'
import * as os from 'os'
import md from '@/utils/markdown'
import { UserStatus } from '@/utils/shared'
import { getUsernameStyle, getUserSvg } from '@/utils/workspaceUtils'
exports.luoguPath = path.join(os.homedir(), '.luogu');

export default new SuperCommand({
  onCommand: 'solution',
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
    let defaultID = exports.pid
    const pid = await vscode.window.showInputBox({
      placeHolder: '输入题号',
      value: defaultID,
      ignoreFocusOut: true
    }).then(res => res ? res.toUpperCase() : null)
    if (!pid) {
      return
    }
    exports.pid = pid
    try {
      const res = await searchSolution(pid)
      console.log(res)
      if (res.solutions.length === 0) {
        vscode.window.showInformationMessage('该题目没有题解')
        return
      }
      const panel = vscode.window.createWebviewPanel(pid, `${res.problem.pid} ${res.problem.title} 题解`, vscode.ViewColumn.Two, {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.file(exports.resourcesPath)]
      })
      panel.webview.onDidReceiveMessage(async message => {
        console.log(`Got ${message.type} request: message = `, message.data)
        if (message.type === 'request-solution') {
          panel.webview.postMessage({
            type: 'solution', message: {
              html: await generateSolutionHTML(res.solutions[message.data as number]),
              id: res.solutions[message.data as number].id,
              voteStatus: res.solutions[message.data as number].currentUserVoteType as number
            }
          });
        } else if (message.type === 'vote') {
          try {
            const data = await postVote(message.data.id as number, message.data.type as number)
            console.log(data)
            if (data.status !== 200) {
              if (data.errorMessage) {
                throw Error(data.errorMessage)
              } else if (data.data) {
                throw Error(data.data)
              } else {
                throw Error('vote error')
              }
            }
            panel.webview.postMessage({
              type: 'vote-result',
              message: data.data as number,
              id: message.data.id as number,
              votetype: message.data.type as number
            });
            res.solutions[message.data.pos as number].thumbUp = data.data as number
            res.solutions[message.data.pos as number].currentUserVoteType = message.data.type as number
          } catch (err) {
            panel.webview.postMessage({
              type: 'vote-error',
              message: err.message
            });
          }
        } else {
          ;
        }
        return;
      })
      const html = await generateHTML(res.solutions)
      console.log(html)
      panel.webview.html = html
    } catch (err) {
      vscode.window.showErrorMessage(err.message)
      console.error(err)
    }
  }
})

const generateHTML = async (solutions: any[]) => {
  return `
<head>
  <link rel="stylesheet" href="${getResourceFilePath('katex.min.css')}">
  <link rel="stylesheet" href="${getResourceFilePath('highlightjs.default.min.css')}">
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
  var pos = 0;
  var id = ${solutions[0].id};
  var status = ${solutions[0].currentUserVoteType};
  const count = ${solutions.length};
  function load() {
    $("a.pre-post").click(function() {
      if (pos == 0) {
        swal("好像哪里有点问题", "已经是第一篇了", "error");
        return;
      }
      pos--;
      vscode.postMessage({type: 'request-solution', data: pos });
    });
    $("a.next-post").click(function() {
      if (pos == count - 1) {
        swal("好像哪里有点问题", "已经是最后一篇了", "error");
        return;
      }
      pos++;
      vscode.postMessage({type: 'request-solution', data: pos });
    });
    $('.button.thumb-up[data-v-6a0aefb0]').click(function () {
      console.log(status)
      if (status.toString() === '1') {
        vscode.postMessage({type: 'vote', data: { id: id, type: 0, pos: pos }});
      } else {
        vscode.postMessage({type: 'vote', data: { id: id, type: 1, pos: pos }});
      }
    });
    $('.button.thumb-down[data-v-6a0aefb0]').click(function () {
      vscode.postMessage({type: 'vote', data: { id: id, type: -1, pos: pos }});
    });
  }
  function scrollToClass (c) {
    $('html, body').animate({
      scrollTop: ($(c).offset().top)
    }, 500);
  }
  $(document).ready(function () {
    window.addEventListener('message', event => {
      if (event.data.type === 'solution') {
        const message = event.data.message;
        $("div.main").html(message.html);
        id = message.id;
        status = message.voteStatus;
        console.log(\`id: \${id}\`)
        load();
        scrollToClass('main')
      } else if (event.data.type === 'vote-result') {
        if (event.data.id !== id) { return; }
        const message = event.data.message;

        console.log(event.data)
        if (event.data.votetype === 1) {
          $('.button.thumb-up[data-v-6a0aefb0]').attr('class', 'button thumb-up enable')
          $('.button.thumb-down[data-v-6a0aefb0]').attr('class', 'button thumb-down')
        } else if (event.data.votetype === 0) {
          $('.button.thumb-up[data-v-6a0aefb0]').attr('class', 'button thumb-up')
        } else {
          $('.button.thumb-up[data-v-6a0aefb0]').attr('class', 'button thumb-up')
          $('.button.thumb-down[data-v-6a0aefb0]').attr('class', 'button thumb-down enable')
        }
        status = event.data.votetype
        $('.button.thumb-up[data-v-6a0aefb0]').html(\`<svg data-v-6a0aefb0="" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="thumbs-up" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-thumbs-up fa-w-16">
        <path data-v-6a0aefb0="" fill="currentColor" d="M104 224H24c-13.255 0-24 10.745-24 24v240c0 13.255 10.745 24 24 24h80c13.255 0 24-10.745 24-24V248c0-13.255-10.745-24-24-24zM64 472c-13.255 0-24-10.745-24-24s10.745-24 24-24 24 10.745 24 24-10.745 24-24 24zM384 81.452c0 42.416-25.97 66.208-33.277 94.548h101.723c33.397 0 59.397 27.746 59.553 58.098.084 17.938-7.546 37.249-19.439 49.197l-.11.11c9.836 23.337 8.237 56.037-9.308 79.469 8.681 25.895-.069 57.704-16.382 74.757 4.298 17.598 2.244 32.575-6.148 44.632C440.202 511.587 389.616 512 346.839 512l-2.845-.001c-48.287-.017-87.806-17.598-119.56-31.725-15.957-7.099-36.821-15.887-52.651-16.178-6.54-.12-11.783-5.457-11.783-11.998v-213.77c0-3.2 1.282-6.271 3.558-8.521 39.614-39.144 56.648-80.587 89.117-113.111 14.804-14.832 20.188-37.236 25.393-58.902C282.515 39.293 291.817 0 312 0c24 0 72 8 72 81.452z" class=""></path>
        </svg>\${message}\`)
      } else if (event.data.type === 'vote-error') {
        swal("好像哪里有点问题", event.data.message, "error");
      }
    });
    load();
  });
  </script>
</head>
<body>
<div class="main">
${await generateSolutionHTML(solutions[0])}
</div>
</body>`;
}

const generateSolutionHTML = async (solution: any) => {
  return `<div data-v-27cf0bac="" id="app" class="lfe-vars">
  <div data-v-27cf0bac="" class="main-container">
    <main data-v-27cf0bac="" class="wrapped lfe-body" style="background-color: rgb(239, 239, 239);">
      <div data-v-6febb0e8="" data-v-15b9154d="" data-v-27cf0bac="" class="full-container"
        currenttemplate="ProblemSolution" currentuser="[object Object]" currenttheme="[object Object]"
        style="margin-top: 15em;max-width: 900px;">
        <div data-v-796309f8="" data-v-15b9154d="" class="card padding-none" data-v-6febb0e8="">
          <div data-v-15b9154d="" data-v-796309f8="" class="card-body">
            <div data-v-987d14d2="" data-v-15b9154d="" class="list" data-v-796309f8="">
              <div data-v-987d14d2="" class="block">
                <div data-v-987d14d2="" class="row-wrap">
                  <div data-v-15b9154d="" data-v-987d14d2="" class="item-row">
                    <div data-v-8d4c9aee="" data-v-15b9154d="" class="solution-article" data-v-987d14d2="">
                      <div data-v-8d4c9aee="" class="header">
                        <div data-v-8d4c9aee="" class="left">
                          <span data-v-8d4c9aee="" class="user">
                            <img data-v-8d4c9aee="" src="data:image/jpeg;base64,${await loadUserIcon(solution.author.uid as number)}" class="avatar"/>
                            <span data-v-360481bd="" data-v-8d4c9aee="" class="wrapper">
                              <a data-v-303bbf52="" data-v-360481bd="" href="https://www.luogu.com.cn/user/${solution.author.uid}" target="_blank" colorscheme="none" class="color-none">
                                <span data-v-360481bd="" data-v-303bbf52="" style="${getUsernameStyle(solution.author.color.toLowerCase())}">${solution.author.name}</span>
                              </a>
                              ${getUserSvg(solution.author.ccfLevel)}
                              ${solution.author.badge !== null && solution.author.color.toLowerCase() === 'purple' ? `<span data-v-20b7d558="" data-v-360481bd="" class="lfe-caption" style="color: rgb(255, 255, 255); background: rgb(157, 61, 207);">${solution.author.badge}</span>` : ''}
                            </span>
                          </span>
                          <span data-v-8d4c9aee="" class="lfe-caption">更新时间：${formatTime(new Date(solution.postTime as number * 1000), 'yyyy-MM-dd hh:mm:ss')}</span></div>
                      </div>
                      <div data-v-8d4c9aee="" class="main" style="position: relative;">
                        <div data-v-0776707c="" data-v-8d4c9aee="" class="collapsed-wrapper">
                          <div data-v-0776707c="" class="" style="--lcollapsed-height:320px;">
                            <div data-v-17281a3e="" data-v-8d4c9aee="" class="marked" data-v-0776707c="">
                              ${md.render(solution.content)}
                            </div>
                          </div>
                          <div dir="ltr" class="resize-sensor" style="pointer-events: none; position: absolute; left: 0px; top: 0px; right: 0px; bottom: 0px; overflow: hidden; z-index: -1; visibility: hidden; max-width: 100%;">
                            <div class="resize-sensor-expand" style="pointer-events: none; position: absolute; left: 0px; top: 0px; right: 0px; bottom: 0px; overflow: hidden; z-index: -1; visibility: hidden; max-width: 100%;">
                              <div style="position: absolute; left: 0px; top: 0px; transition: all 0s ease 0s; width: 862px; height: 760px;">
                              </div>
                            </div>
                            <div class="resize-sensor-shrink" style="pointer-events: none; position: absolute; left: 0px; top: 0px; right: 0px; bottom: 0px; overflow: hidden; z-index: -1; visibility: hidden; max-width: 100%;">
                              <div style="position: absolute; left: 0px; top: 0px; transition: all 0s ease 0s; width: 200%; height: 200%;">
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div data-v-6a0aefb0="" class="operations">
                        <span data-v-6a0aefb0="" class="button thumb-up${solution.currentUserVoteType as number === 1 ? ' enable' : ''}">
                          <svg data-v-6a0aefb0="" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="thumbs-up" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-thumbs-up fa-w-16">
                            <path data-v-6a0aefb0="" fill="currentColor" d="M104 224H24c-13.255 0-24 10.745-24 24v240c0 13.255 10.745 24 24 24h80c13.255 0 24-10.745 24-24V248c0-13.255-10.745-24-24-24zM64 472c-13.255 0-24-10.745-24-24s10.745-24 24-24 24 10.745 24 24-10.745 24-24 24zM384 81.452c0 42.416-25.97 66.208-33.277 94.548h101.723c33.397 0 59.397 27.746 59.553 58.098.084 17.938-7.546 37.249-19.439 49.197l-.11.11c9.836 23.337 8.237 56.037-9.308 79.469 8.681 25.895-.069 57.704-16.382 74.757 4.298 17.598 2.244 32.575-6.148 44.632C440.202 511.587 389.616 512 346.839 512l-2.845-.001c-48.287-.017-87.806-17.598-119.56-31.725-15.957-7.099-36.821-15.887-52.651-16.178-6.54-.12-11.783-5.457-11.783-11.998v-213.77c0-3.2 1.282-6.271 3.558-8.521 39.614-39.144 56.648-80.587 89.117-113.111 14.804-14.832 20.188-37.236 25.393-58.902C282.515 39.293 291.817 0 312 0c24 0 72 8 72 81.452z" class=""></path>
                          </svg>${solution.thumbUp}</span>
                        <span data-v-6a0aefb0="" class="button thumb-down${solution.currentUserVoteType as number === -1 ? ' enable' : ''}">
                          <svg data-v-6a0aefb0="" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="thumbs-down" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-thumbs-down fa-w-16">
                            <path data-v-6a0aefb0="" fill="currentColor" d="M0 56v240c0 13.255 10.745 24 24 24h80c13.255 0 24-10.745 24-24V56c0-13.255-10.745-24-24-24H24C10.745 32 0 42.745 0 56zm40 200c0-13.255 10.745-24 24-24s24 10.745 24 24-10.745 24-24 24-24-10.745-24-24zm272 256c-20.183 0-29.485-39.293-33.931-57.795-5.206-21.666-10.589-44.07-25.393-58.902-32.469-32.524-49.503-73.967-89.117-113.111a11.98 11.98 0 0 1-3.558-8.521V59.901c0-6.541 5.243-11.878 11.783-11.998 15.831-.29 36.694-9.079 52.651-16.178C256.189 17.598 295.709.017 343.995 0h2.844c42.777 0 93.363.413 113.774 29.737 8.392 12.057 10.446 27.034 6.148 44.632 16.312 17.053 25.063 48.863 16.382 74.757 17.544 23.432 19.143 56.132 9.308 79.469l.11.11c11.893 11.949 19.523 31.259 19.439 49.197-.156 30.352-26.157 58.098-59.553 58.098H350.723C358.03 364.34 384 388.132 384 430.548 384 504 336 512 312 512z" class=""></path>
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="post-nav">
            <div class="post-nav-next post-nav-item">
              <a class="pre-post" rel="next" title="上一篇">
                上一篇
              </a>
            </div>
            <span class="post-nav-divider"></span>
            <div class="post-nav-prev post-nav-item">
              <a class="next-post" rel="prev" title="下一篇">
                下一篇
              </a>
            </div>
          </div>
        </div>
    </main>
  </div>
</div>`;
};
