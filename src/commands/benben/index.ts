import SuperCommand from '../SuperCommand'
import { fetchBenben, getStatus, userIcon, postBenben, deleteBenben, getResourceFilePath, loadUserIcon } from '@/utils/api'
import { UserStatus } from '@/utils/shared'
import * as vscode from 'vscode'
const delay = (t: number) => new Promise(resolve => setTimeout(resolve, t))

/*
const replyBenben = async (data: string) => {
  const content = await vscode.window.showInputBox({
    placeHolder: '输入内容',
    ignoreFocusOut: true,
    value: data,
    validateInput: s => s && s.trim() ? undefined : '输入不能为空'
  });
  if (!content) { return; }
  return postBenben(content);
}
*/

export default new SuperCommand({
  onCommand: 'benben',
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
    const mode = await vscode.window.showQuickPick(['我发布的', '我关注的', '全网动态'], { ignoreFocusOut: true });
    if (!mode) {
      return
    }
    const mode2 = (mode === '我发布的' ? 'my' : (mode === '我关注的' ? 'watching' : 'all'));
    if (mode2 === 'all') {
      vscode.window.showInformationMessage('因社区秩序管控需要，全网动态临时关闭。');
      return
    }
    const regex = /<li class=\"am-comment am-comment-primary feed-li\">\n\s*<div class=\"lg-left\"><a href="\/user\/(\d{1,6})\" class=\"center\">\n\s*<.*?>\n\s*<.*>\n\s*<div class=\"am-comment-main\">\n\s*<header class=\"am-comment-hd\">\n\s*<div class="am-comment-meta">\n\s*<span class=\"feed-username\"><a class=\'(.*?)\' href=\".*?\" target=\"_blank\">(.*?)<\/a>(.*?)<\/span> (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\n\s*(<a name=\"feed-delete\" data-feed-id=\"\d+\">.*?<\/a>\n\s*)?.*\n.*\n.*\n.*\n\s*.*\n<span class=\"feed-comment\">(.*?)<\/span>\n\s*<\/div>\n\s*<\/div>\n\s*<\/li/gm;
    let rec: any[] = new Array();
    let pannel = vscode.window.createWebviewPanel(`犇犇 - ${mode}`, `犇犇 - ${mode}`, vscode.ViewColumn.Two, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.file(exports.resourcesPath)]
    });
    pannel.webview.onDidReceiveMessage(async message => {
      console.log(`Got ${message.type} request: message = ${message.data}`)
      if (message.type === 'post') {
        // todo: add error handling in webview
        try {
          pannel.webview.postMessage({ type: 'post-result', message: await postBenben(message.data) })
        } catch (err) {
          pannel.webview.postMessage({ type: 'postError', message: err.message })
        }
      } else if (message.type === 'delete') {
        try {
          pannel.webview.postMessage({ type: 'delete-result', message: await deleteBenben(message.data) })
        } catch (err) {
          pannel.webview.postMessage({ type: 'deleteError', message: err.message })
        }
      } else if (message.type === 'reply') {
        // ???
        throw Error;
      } else {
        ;
      }
      return;
    })
    let pannelClosed = false;
    pannel.onDidDispose(() => pannelClosed = true)
    pannel.webview.html = await generateHTML();
    let retryTimes = 0;
    const maxRetryTimes = 2;
    while (!pannelClosed && exports.islogged && retryTimes <= maxRetryTimes) {
      try {
        let ret = (await fetchBenben(mode2, 1)) + (await fetchBenben(mode2, 2)) + (await fetchBenben(mode2, 3));
        let pret = new Array();
        while (true) {
          const m = regex.exec(ret);
          if (m === null) {
            break;
          }
          if (m.index === regex.lastIndex) { regex.lastIndex++; }
          let t = new Array();
          m.forEach((match, id) => { if (id !== 0) { t.push(match); } });
          pret.push(t);
        }
        // console.log(pret)
        const find = (a: any[][], b: any[]) => {
          for (let i = 0; i < a.length; i++) {
            let flag = true;
            for (let j = 0; j < a[i].length; j++) {
              if (a[i][j] !== b[j]) { flag = false; }
            }
            if (flag) {
              return true;
            }
          }
          return false;
        };
        let tmp: any[] = new Array();
        for (let i = pret.length - 1; i >= 0; i--) {
          if (!find(rec, pret[i])) {
            rec.push(pret[i]);
            tmp.push(pret[i]);
          }
        }
        // console.log(rec);
        const cmp = (x: string, y: string) => {
          let x1 = new Array();
          let y1 = new Array();
          let m = /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(x);
          if (m !== null) {
            m.forEach((match, id) => {
              if (id !== 0) {
                x1.push(match)
              }
            });
          }
          m = /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(y);
          if (m !== null) {
            m.forEach((match, id) => {
              if (id !== 0) {
                y1.push(match)
              }
            })
          }
          for (let i = 0; i < x1.length; i++) {
            if (x1[i] !== y1[i]) {
              // tslint:disable: radix
              return parseInt(x1[i]) - parseInt(y1[i]);
            }
          }
          return 0
        }
        tmp.sort((a, b) => { return cmp(a[4], b[4]); })
        let message = new Array();
        for (let i = tmp.length - 1; i >= 0; i--) {
          message.push(`<li class="am-comment am-comment-primary feed-li"><div class="lg-left"><a href="https://www.luogu.com.cn/user/${tmp[i][0]}" class="center">
        <img src="data:image/jpeg;base64,${await loadUserIcon(parseInt(tmp[i][0]))}"
        class="am-comment-avatar"/></a></div><div class="am-comment-main"><header class="am-comment-hd"><div class="am-comment-meta"><span class="feed-username"><a class='${tmp[i][1]}' href="https://www.luogu.com.cn/user/${tmp[i][0]}"  target="_blank">${tmp[i][2]}</a>${tmp[i][3]}</span> ${tmp[i][4]}<a name="feed-reply" href="javascript: scrollToId('feed-content')" data-username="${tmp[i][2]}">回复</a></div></header><div class="am-comment-bd"><span class="feed-comment">${tmp[i][6]}</span></div></div></li>`);
        }
        pannel.webview.postMessage({ type: 'benbennew', message: message });
        retryTimes = 0
      } catch (err) {
        console.error(err)
        vscode.window.showErrorMessage(`获取犇犇失败，已重试 ${retryTimes} 次`);
        retryTimes++
        await delay(2000)
      }
    }
    if (retryTimes === maxRetryTimes + 1) {
      vscode.window.showErrorMessage(`获取犇犇失败`);
    }
  }
})

const generateHTML = async () => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="${getResourceFilePath('jquery.min.js')}"></script>
  <link rel="stylesheet" href="${getResourceFilePath('benben.css')}">
  <script>
  const vscode = acquireVsCodeApi();
  $(document).ready(function() {
  $("#feed-submit").click(function () {
    $(this).addClass("am-disabled");
    var content = $('#feed-content').val(), e = this;
    vscode.postMessage({type: 'post', data: content});
    $(e).removeClass("am-disabled");
    $("#feed-content").val('');
  });
  window.addEventListener('message', event => {
    if (event.data.type === 'benbennew') {
      const message = event.data.message;
      for (var i = message.length - 1; i >= 0; i--) {
        $("#feed").prepend(message[i]);
      }
    } else {
      ;
    }
    $("[name=feed-delete]").click(function() {
      vscode.postMessage({type: 'delete', data: \`\${$(this).attr('data-feed-id')}\`});
    });
    $("[name=feed-reply]").click(function reply() {
      scrollToId('feed-content');
      var content = $(this).parents("li.feed-li").find(".feed-comment").text();
      // vscode.postMessage({type: 'reply', data: " || @" + $(this).attr('data-username') + " : " + content});
      $("#feed-content").val(" || @" + $(this).attr('data-username') + " : " + content);
    });
  })});
  </script>
  </head>
  <body>
  <br />
  <div class="lg-article">
  <h2>有什么新鲜事告诉大家</h2>
  <div class="am-form-group am-form">
  <textarea rows="3" id="feed-content"></textarea>
  </div>
  <button class="am-btn am-btn-danger am-btn-sm" id="feed-submit">发射犇犇！</button>
  </div>
  <ul class="am-comments-list am-comments-list-flip" id="feed">
  </ul>
  <script>
    function scrollToId (id) {
      $('html, body').animate({
        scrollTop: ($('#' + id).offset().top)
      }, 500);
    }
  </script>
  </body>
  </html>
  `;
}
