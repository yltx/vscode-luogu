import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as vscode from 'vscode'
import SuperCommand from '../SuperCommand'
import md from '../../utils/markdown'
import { searchProblem } from '../../utils/api'
import { DialogType, promptForOpenOutputChannel } from '../../utils/uiUtils'
import Problem from '../../model/Problem'
exports.luoguProblemPath = path.join(os.homedir(), '.luoguProblems')

const generateHTML = (problem: Problem) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${problem.name}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@9.12.0/build/styles/default.min.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.9.0/katex.min.css">
  <script src="https://cdn.bootcss.com/jquery/3.4.1/jquery.min.js"></script>
  <style>
    pre {
      margin: .5em 0 !important;
      padding: .3em .5em !important;
      border: #ddd solid 1px !important;
      /* background: #f8f8f8; */
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
      var tar = document.getElementsByTagName("code");
      for (var i = 0; i < tar.length; i++) {
        var ele = tar[i];
        if (ele.parentNode.nodeName.toLowerCase() === "pre") {
          $(ele).before('<a class="copy-button ui button" style="position: absolute; top: 0px;right: 0px;border-top-left-radius: 0px;border-bottom-right-radius: 0px">复制</a></div>');
        }
      }
      $(".copy-button").click(function() {
        var element = $(this).siblings("code");
        var text = $(element).text();
        var $temp = $("<textarea>");
        $("body").append($temp);
        $temp.val(text).select();
        document.execCommand("copy");
        $temp.remove();
        $(this).text("复制成功");

        var e = this;
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

export default new SuperCommand({
  onCommand: 'save',
  handle: async () => {
    const pid = await vscode.window.showInputBox({
      placeHolder: '输入题号'
    }).then(res => res ? res.toUpperCase() : null)
    if (!pid) {
      await promptForOpenOutputChannel('', DialogType.error)
      return
    }
    const problem = await searchProblem(pid).then(res => {
      console.log(res)
      return res
    }).then(res => new Problem(res))
    let html = generateHTML(problem)
    const filename = pid + '.html'
    exports.luoguProblems = path.join(exports.luoguProblemPath, filename)
    fs.exists(exports.luoguProblemPath, async function (exists) {
      if (!exists) {
        fs.mkdir(exports.luoguProblemPath, function (err) {
          if (err) {
            vscode.window.showErrorMessage('创建路径失败')
            console.log(err)
            throw (err)
          }
        })
      }
      fs.writeFile(exports.luoguProblems, html, function (err) {
        if (err) {
          vscode.window.showErrorMessage('保存失败')
          console.log(err)
          throw (err)
        }
        vscode.window.showInformationMessage('保存成功\n存储路径：' + exports.luoguProblems)
      })
    })
  }
})
