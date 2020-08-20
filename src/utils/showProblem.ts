import * as vscode from 'vscode'
import { searchProblem, getResourceFilePath } from '@/utils/api'
import Problem from '@/model/Problem'
import md from '@/utils/markdown'

export const showProblem = async (pid: string) => {
  try {
    const problem = await searchProblem(pid).then(res => new Problem(res))
    const panel = vscode.window.createWebviewPanel(problem.stringPID, problem.name, vscode.ViewColumn.Two, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.file(exports.resourcesPath)]
    })
    let html = generateProblemHTML(problem)
    console.log(html)
    panel.webview.html = html
  } catch (err) {
    vscode.window.showErrorMessage(err.message)
    throw err
  }
}

export const generateProblemHTML = (problem: Problem) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${problem.name}</title>
  <link rel="stylesheet" href="${getResourceFilePath('highlightjs.default.min.css')}">
  <link rel="stylesheet" href="${getResourceFilePath('katex.min.css')}">
  <link rel="stylesheet" href="${getResourceFilePath('problem.css')}">
  <script src="${getResourceFilePath('jquery.min.js')}"></script>
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
    .ui.button {
      cursor: pointer;
      display: inline-block;
      min-height: 1em;
      outline: 0;
      border: none;
      vertical-align: baseline;
      background: #e0e1e2 none;
      color: rgba(0,0,0,.6);
      font-family: Lato,'Helvetica Neue',Arial,Helvetica,sans-serif;
      margin: 0 .25em 0 0;
      padding: .78571429em 1.5em .78571429em;
      text-transform: none;
      text-shadow: none;
      font-weight: 700;
      line-height: 1em;
      font-style: normal;
      text-align: center;
      text-decoration: none;
      border-radius: .28571429rem;
      -webkit-box-shadow: 0 0 0 1px transparent inset, 0 0 0 0 rgba(34,36,38,.15) inset;
      box-shadow: 0 0 0 1px transparent inset, 0 0 0 0 rgba(34,36,38,.15) inset;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      -webkit-transition: opacity .1s ease,background-color .1s ease,color .1s ease,background .1s ease,-webkit-box-shadow .1s ease;
      transition: opacity .1s ease,background-color .1s ease,color .1s ease,background .1s ease,-webkit-box-shadow .1s ease;
      transition: opacity .1s ease,background-color .1s ease,color .1s ease,box-shadow .1s ease,background .1s ease;
      transition: opacity .1s ease,background-color .1s ease,color .1s ease,box-shadow .1s ease,background .1s ease,-webkit-box-shadow .1s ease;
      will-change: '';
      -webkit-tap-highlight-color: transparent;
    }
  </style>
  <script type="text/javascript">
    $(document).ready(function () {
      let tar = document.getElementsByTagName("code");
      for (let i = 0; i < tar.length; i++) {
        let ele = tar[i];
        if (ele.parentNode.nodeName.toLowerCase() === "pre") {
          $(ele).before('<a class="copy-button ui button" style="position: absolute; top: 0px;right: 0px;border-top-left-radius: 0px;border-bottom-right-radius: 0px">复制</a></div>');
        }
      }
      $(".copy-button").click(function() {
        let element = $(this).siblings("code");
        let text = $(element).text();
        let $temp = $("<textarea>");
        $("body").append($temp);
        $temp.val(text).select();
        document.execCommand("copy");
        $temp.remove();
        $(this).text("复制成功");

        let e = this;
        setTimeout(function() {
          $(e).text("复制");
        }, 500);
      });
    });
  </script>
</head>
<body>
${md.render(problem.toMarkDown())}
</body>
</html>`

export default showProblem
