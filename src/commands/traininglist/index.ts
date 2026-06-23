import SuperCommand from '../SuperCommand';
import * as vscode from 'vscode';
import { searchTrainingdetail, searchTraininglist } from '@/utils/api';
import { getResourceFilePath } from '@/utils/html';
import { showTrainDetails } from '@/utils/showTrainDetails';
import {
  getUsernameColor,
  getUserSvg,
  getWebviewViewColumn
} from '@/utils/workspaceUtils';

export default new SuperCommand({
  onCommand: 'traininglist',
  handle: async () => {
    const panel = vscode.window.createWebviewPanel(
      'traininglist',
      `题单广场`,
      getWebviewViewColumn(),
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(globalThis.resourcesPath),
          vscode.Uri.file(globalThis.distPath)
        ]
      }
    );
    panel.webview.onDidReceiveMessage(async message => {
      console.log(`Got type ${message.type} page ${message.page} request.`);
      if (message.type === 'open') {
        const data = await searchTrainingdetail(message.data);
        const panel2 = vscode.window.createWebviewPanel(
          '题单详情',
          `${data['training']['name'] ?? data['training']['title']}`,
          getWebviewViewColumn(),
          {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
              vscode.Uri.file(globalThis.resourcesPath),
              vscode.Uri.file(globalThis.distPath)
            ]
          }
        );
        panel2.webview.html = await showTrainDetails(
          panel2.webview,
          message.data
        );
        panel2.webview.onDidReceiveMessage(async message => {
          if (message.type === 'open') {
            console.log('pid:', message.data);
            vscode.commands.executeCommand('luogu.searchProblem', {
              pid: message.data
            });
          }
        });
      } else if (message.type === 'request') {
        panel.webview.postMessage({
          message: {
            channel: message.channel,
            html:
              message.channel === 0
                ? await generateOfficialListHTML(message.keyword, message.page)
                : await generateSelectedListHTML(message.keyword, message.page)
          }
        });
      } else if (message.type === 'search') {
        panel.webview.postMessage({
          message: {
            channel: message.channel,
            html:
              message.channel === 0
                ? await generateOfficialListHTML(message.keyword, 1)
                : await generateSelectedListHTML(message.keyword, 1)
          }
        });
      } else if (message.type === 'error') {
        vscode.window.showErrorMessage(message.message);
      }
    });
    const html = await generategeneralHTML(panel.webview);
    panel.webview.html = html;
  }
});

const generategeneralHTML = async (webview: vscode.Webview) => {
  return `
  <html lang="zh">
    <head>
      <link rel="stylesheet" href="${getResourceFilePath(
        webview,
        'loader.css'
      )}">
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
        form {
            display: inline-block;
            flex-direction: row;
            text-align: center;
        }
        input,label {
            display: inline-block;
        }
        li {
            float: left;
            list-style: none
        }
        .btn-hover:hover {
          background-color: rgb(0,195,255);
        }
      </style>
    </head>
    <body>
    <script>
        const vscode = acquireVsCodeApi();
        let channel = 0;
        let page = 1;

        function showError(msg) {
          vscode.postMessage({type: 'error', message: msg});
        }

        function load() {
          document.getElementById("search_btn").addEventListener("click", function() {
            const keyword = document.getElementById("search").value;
            console.log("Search func get keyword:", keyword);
            vscode.postMessage({type: 'search', channel: channel, keyword: keyword});
          });
          document.querySelectorAll(".detail_btn").forEach(function(el) {
            el.addEventListener("click", function(e) {
              e.preventDefault();
              const id = this.getAttribute("data-id");
              console.log("detail id:", id);
              vscode.postMessage({type: 'open', data: id});
            });
          });
          document.getElementById("search").addEventListener("keypress", function(event) {
            if (event.key == "Enter") {
              event.preventDefault();
              const keyword = document.getElementById("search").value;
              console.log("Search func get keyword:", keyword);
              vscode.postMessage({type: 'search', channel: channel, keyword: keyword});
            }
          });
        }

        document.addEventListener("DOMContentLoaded", function () {
          window.addEventListener('message', event => {
            const message = event.data.message;
            console.log("JS Get message:", event.data.message);
            if (message.channel == 0) document.getElementById("official").innerHTML = message.html;
            else document.getElementById("select").innerHTML = message.html;
            load();
          });
          load();
        });

        function changechannel() {
          if (channel) {
            document.getElementById("select").style.display = "none";
            document.getElementById("official").style.display = "";
            document.getElementById("user").style.cssText = "cursor:pointer;font-size: large;";
            document.getElementById("office").style.cssText = "cursor:pointer;border-bottom: 2px solid var(--vscode-textLink-foreground);color: var(--vscode-textLink-foreground);font-size: large;";
          } else {
            document.getElementById("official").style.display = "none";
            document.getElementById("select").style.display = "";
            document.getElementById("office").style.cssText = "cursor:pointer;font-size: large;";
            document.getElementById("user").style.cssText = "cursor:pointer;border-bottom: 2px solid var(--vscode-textLink-foreground);color: var(--vscode-textLink-foreground);font-size: large;";
          }
          channel = 1 - channel;
        }
      </script>
    <div style="margin-top: 2em;">
    <div class="card padding-default">
    <section>
      <table style="border-collapse: collapse;" width="100%">
        <tr>
          <td style="text-align: left;" width="100%">
            <span>
              <h2 style='display: inline-block'>查找题单</h2>
              <input style="border-radius:4px;border:1px solid #000;width:300px; margin:0 auto; box-shadow: 0 4px 6px rgba(50, 50, 93, .08), 0 1px 3px rgba(0, 0, 0, .05); transition: box-shadow .15s ease; padding: .5em;" type="text" id="search">
              <button id="search_btn" class="btn-hover">搜索</button>
            </span>
          </td>
        </tr>
      </table>
        <span style="cursor:pointer;border-bottom: 2px solid var(--vscode-textLink-foreground);color: var(--vscode-textLink-foreground); font-size: large;" title="官方精选" onclick="changechannel()" id="office">官方精选</span>
      &nbsp;&nbsp;&nbsp;
        <span style="cursor:pointer;font-size: large;" title="用户分享" onclick="changechannel()" id="user">用户分享</span>
    </section>
    </div>
    <div class="card padding-default" style="margin-top: 2em;">
    <section>
      <div id="official">
      ${await generateOfficialListHTML('', 1)}
      </div>
      <div id="select" style="display:none">
      ${await generateSelectedListHTML('', 1)}
      </div>
    </section>
    </div>
    </div>
    </body>
  </html>
  `;
};

const generateOfficialListHTML = async (keyword: string, page: number) => {
  const data = await searchTraininglist('official', keyword, page);
  const trainings = data['trainings'];
  const list = trainings?.['result'];
  if (!list) return '<p>加载失败</p>';
  const items: any[] = Array.isArray(list) ? list : Object.values(list);
  const accepted = data['acCounts'] ?? data['acceptedCounts'];
  console.log(data);
  console.log(accepted);
  let html = '';
  html += '      <table style="border-collapse: collapse;" width="100%">\n';
  html += '        <tr>\n';
  html += '          <th style="text-align: left;">编号</th>\n';
  html += '          <th style="text-align: left;">名称</th>\n';
  html += '          <th style="text-align: left;">完成度</th>\n';
  html += '          <th>题目数</th>\n';
  html += '          <th>收藏数</th>\n';
  html += '        </tr>\n';
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as any;
    html += '        <tr>\n';
    html += `          <td style="text-align: left;">${item['id']}</td>\n`;
    html += `          <td style="text-align: left;"><a href="#" class="detail_btn" data-id="${item['id']}">${
      item['name'] ?? item['title']
    }</a></td>\n`;
    html += `          <td style="text-align: left;">\n
            <progress value="${accepted[item['id']]}" max="${
              item['problemCount']
            }" style="height: 30px;width: 100px;" title="${
              accepted[item['id']]
            }/${item['problemCount']}"></progress>
                     </td>\n`;
    html += `          <td style="text-align: center;">${item['problemCount']}</td>\n`;
    html += `          <td style="text-align: center;">${item['markCount']}</td>\n`;
    html += '        </tr>\n';
  }
  html += '      </table>\n';
  html += `      <script>
      let pageOfficial = ${page};
      function turnOfficial(towards) {
        pageOfficial += towards;
        const count = ${trainings?.['count'] ?? items.length};
        console.log("official count:", count);
        if (pageOfficial < 1) {
          showError("已经是第一页了");
          pageOfficial -= towards;
          return;
        } else if (pageOfficial > Math.ceil(count / 50.0)) {
          showError("已经是最后一页了");
          pageOfficial -= towards;
          return;
        }
        vscode.postMessage({type: 'request', channel: 'official', page: pageOfficial, keyword: ''});
      }
      function gotokthofficial() {
        const id = parseInt(document.getElementById('KTHOFFICIAL').value);
        if (id < 1 || id > Math.ceil(${trainings?.['count'] ?? items.length} / 50.0)) {
          showError("不合法的页数");
          return;
        }
        pageOfficial = id;
        vscode.postMessage({type: 'request', channel: 'official', page: pageOfficial, keyword: ''});
      }
      </script>
      <div class="post-nav">
        <table width="100%">
          <tr>
            <td style="text-align: left;" width="30%">
              <p style="text-align: left;" class="post-nav-prev post-nav-item"><a href="#" onclick="turnOfficial(-1)" title="上一页">上一页</a></p>
            </td>
            <td style="text-align: center;" width="40%">
              <input style="border-radius:4px;border:1px solid #000;width:300px; margin:0 auto; box-shadow: 0 4px 6px rgba(50, 50, 93, .08), 0 1px 3px rgba(0, 0, 0, .05); transition: box-shadow .15s ease; padding: .5em;" type="text" placeholder="输入要跳转到的页码" id="KTHOFFICIAL">
              <button class="btn-hover" onclick="gotokthofficial()">跳转</button>
            </td>
            <td style="text-align: right;" width="30%">
              <p style="text-align: right;" class="post-nav-next post-nav-item"><a href="#" onclick="turnOfficial(1)" title="下一页">下一页</a></p>
            </td>
          </tr>
        </table>
      </div>`;
  return html;
};
const generateSelectedListHTML = async (keyword: string, page: number) => {
  const data = await searchTraininglist('select', keyword, page);
  const trainings = data['trainings'];
  const list = trainings?.['result'];
  if (!list) return '<p>加载失败</p>';
  const items: any[] = Array.isArray(list) ? list : Object.values(list);
  console.log(data);
  let html = '';
  html += '      <table style="border-collapse: collapse;" width="100%">\n';
  html += '        <tr>\n';
  html += '          <th style="text-align: left;">编号</th>\n';
  html += '          <th style="text-align: left;">名称</th>\n';
  html += '          <th>题目数</th>\n';
  html += '          <th>收藏数</th>\n';
  html += '          <th>创建者</th>\n';
  html += '        </tr>\n';
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as any;
    html += '        <tr>\n';
    html += `          <td style="text-align: left;">${item['id']}</td>\n`;
    html += `          <td style="text-align: left;"><a href="#" class="detail_btn" data-id="${item['id']}">${
      item['name'] ?? item['title']
    }</a></td>\n`;
    html += `          <td style="text-align: left;">${item['problemCount']}</td>\n`;
    html += `          <td style="text-align: center;">${item['markCount']}</td>\n`;
    html += `          <td style="text-align: center; font-weight: bold; color: ${getUsernameColor(
      item['provider']['color']
    )};">${item['provider']['name']}${getUserSvg(
      item['provider']['ccfLevel']
    )}</td>\n`;
    html += '        </tr>\n';
  }
  html += '      </table>\n';
  html += `      <script>
      let pageSelected = ${page};
      function turnSelected(towards) {
        pageSelected += towards;
        const count = ${trainings?.['count'] ?? items.length};
        console.log("selected count:", count);
        if (pageSelected < 1) {
          showError("已经是第一页了");
          pageSelected -= towards;
          return;
        } else if (pageSelected > Math.ceil(count / 50.0)) {
          showError("已经是最后一页了");
          pageSelected -= towards;
          return;
        }
        vscode.postMessage({type: 'request', channel: 'select', page: pageSelected, keyword: ''});
      }
      function gotokthselected() {
        const id = parseInt(document.getElementById('KTHSELECTED').value);
        if (id < 1 || id > Math.ceil(${trainings?.['count'] ?? items.length} / 50.0)) {
          showError("不合法的页数");
          return;
        }
        pageSelected = id;
        vscode.postMessage({type: 'request', channel: 'select', page: pageSelected, keyword: ''});
      }
      </script>
      <div class="post-nav">
        <table width="100%">
          <tr>
            <td style="text-align: left;" width="30%">
              <p style="text-align: left;" class="post-nav-prev post-nav-item"><a href="#" onclick="turnSelected(-1)" title="上一页">上一页</a></p>
            </td>
            <td style="text-align: center;" width="40%">
              <input style="border-radius:4px;border:1px solid #000;width:300px; margin:0 auto; box-shadow: 0 4px 6px rgba(50, 50, 93, .08), 0 1px 3px rgba(0, 0, 0, .05); transition: box-shadow .15s ease; padding: .5em;" type="text" placeholder="输入要跳转到的页码" id="KTHSELECTED">
              <button class="btn-hover" onclick="gotokthselected()">跳转</button>
            </td>
            <td style="text-align: right;" width="30%">
              <p style="text-align: right;" class="post-nav-next post-nav-item"><a href="#" onclick="turnSelected(1)" title="下一页">下一页</a></p>
            </td>
          </tr>
        </table>
      </div>`;
  return html;
};
