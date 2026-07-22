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
import { getAcceptedCount, getTrainingCategories } from './trainingData';
import type { ProblemSet, UserSummary } from 'luogu-api';

type TrainingListItem = ProblemSet & {
  provider: UserSummary | { id: number; name: string };
};

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
              message.channel === 'select'
                ? await generateSelectedListHTML(message.keyword, message.page)
                : await generateOfficialListHTML(
                    message.keyword,
                    message.page,
                    message.channel
                  )
          }
        });
      } else if (message.type === 'search') {
        panel.webview.postMessage({
          message: {
            channel: message.channel,
            html:
              message.channel === 'select'
                ? await generateSelectedListHTML(message.keyword, 1)
                : await generateOfficialListHTML(
                    message.keyword,
                    1,
                    message.channel
                  )
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
  const initialData = await searchTraininglist('official', '', 1);
  const categories = getTrainingCategories(initialData);
  const initialChannel = categories[0].key;
  return `
  <!DOCTYPE html>
  <html lang="zh">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="${getResourceFilePath(
        webview,
        'training.css'
      )}">
    </head>
    <body>
    <script>
        const vscode = acquireVsCodeApi();
        let channel = ${JSON.stringify(initialChannel)};
        let page = 1;
        let keyword = '';

        function showError(msg) {
          vscode.postMessage({type: 'error', message: msg});
        }

        function load() {
          document.getElementById("search_btn").addEventListener("click", function() {
            keyword = document.getElementById("search").value;
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
              keyword = document.getElementById("search").value;
              console.log("Search func get keyword:", keyword);
              vscode.postMessage({type: 'search', channel: channel, keyword: keyword});
            }
          });
        }

        document.addEventListener("DOMContentLoaded", function () {
          window.addEventListener('message', event => {
            const message = event.data.message;
            console.log("JS Get message:", event.data.message);
            document.getElementById("training-list").innerHTML = message.html;
            load();
          });
          load();
        });

        function changechannel(value) {
          channel = value;
          keyword = '';
          document.getElementById("search").value = '';
          vscode.postMessage({type: 'request', channel, page: 1, keyword});
        }
      </script>
    <main class="lg-page">
      <header class="lg-header">
        <h1 class="lg-title">题单广场</h1>
        <p class="lg-subtitle">浏览洛谷官方课程与用户分享的精选题单。</p>
      </header>
      <section class="lg-panel lg-toolbar">
        <div class="lg-field lg-field--search">
          <label for="search">搜索题单</label>
          <input class="lg-input" type="search" id="search" placeholder="输入题单名称或关键词">
        </div>
        <button id="search_btn" class="lg-button">搜索</button>
        <div class="lg-field">
          <label for="training-category">分类</label>
          <select class="lg-select" id="training-category" onchange="changechannel(this.value)">
          ${categories
            .map(
              category =>
                `<option value="${category.key}">${category.name}</option>`
            )
            .join('')}
          </select>
        </div>
      </section>
      <section class="lg-panel">
        <div id="training-list">
      ${
        initialChannel === 'select'
          ? await generateSelectedListHTML('', 1)
          : await generateOfficialListHTML('', 1, initialChannel)
      }
        </div>
      </section>
    </main>
    </body>
  </html>
  `;
};

const generateOfficialListHTML = async (
  keyword: string,
  page: number,
  channel = 'official'
) => {
  const data = await searchTraininglist(channel, keyword, page);
  const trainings = data['trainings'];
  const list = trainings?.['result'];
  if (!list) return '<div class="lg-empty">题单加载失败</div>';
  const items = (
    Array.isArray(list) ? list : Object.values(list)
  ) as TrainingListItem[];
  let html = '';
  html += '<div class="lg-table-wrap"><table class="lg-table"><thead><tr>\n';
  html +=
    '<th>编号</th><th>名称</th><th>完成度</th><th>题目数</th><th>收藏数</th>\n';
  html += '</tr></thead><tbody>\n';
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    html += '<tr>\n';
    html += `<td class="lg-number">${item['id']}</td>\n`;
    html += `<td class="lg-name"><a href="#" class="detail_btn" data-id="${item['id']}">${
      item['name'] ?? item['title']
    }</a></td>\n`;
    const accepted = getAcceptedCount(data, item['id']);
    html += `<td><div class="lg-progress-wrap"><progress class="lg-progress" value="${accepted}" max="${item['problemCount']}"></progress><span class="lg-progress-text">${accepted} / ${item['problemCount']}</span></div></td>\n`;
    html += `<td class="lg-number">${item['problemCount']}</td>\n`;
    html += `<td class="lg-number">${item['markCount']}</td>\n`;
    html += '</tr>\n';
  }
  html += '</tbody></table></div>\n';
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
        vscode.postMessage({type: 'request', channel: ${JSON.stringify(channel)}, page: pageOfficial, keyword});
      }
      function gotokthofficial() {
        const id = parseInt(document.getElementById('KTHOFFICIAL').value);
        if (id < 1 || id > Math.ceil(${trainings?.['count'] ?? items.length} / 50.0)) {
          showError("不合法的页数");
          return;
        }
        pageOfficial = id;
        vscode.postMessage({type: 'request', channel: ${JSON.stringify(channel)}, page: pageOfficial, keyword});
      }
      </script>
      <div class="lg-pagination">
        <button class="lg-button lg-button--secondary" onclick="turnOfficial(-1)">上一页</button>
        <input class="lg-input" type="number" min="1" placeholder="页码" id="KTHOFFICIAL">
        <button class="lg-button lg-button--secondary" onclick="gotokthofficial()">跳转</button>
        <button class="lg-button" onclick="turnOfficial(1)">下一页</button>
      </div>`;
  return html;
};
const generateSelectedListHTML = async (keyword: string, page: number) => {
  const data = await searchTraininglist('select', keyword, page);
  const trainings = data['trainings'];
  const list = trainings?.['result'];
  if (!list) return '<div class="lg-empty">题单加载失败</div>';
  const items = (
    Array.isArray(list) ? list : Object.values(list)
  ) as TrainingListItem[];
  console.log(data);
  let html = '';
  html += '<div class="lg-table-wrap"><table class="lg-table"><thead><tr>\n';
  html +=
    '<th>编号</th><th>名称</th><th>题目数</th><th>收藏数</th><th>创建者</th>\n';
  html += '</tr></thead><tbody>\n';
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    html += '<tr>\n';
    html += `<td class="lg-number">${item['id']}</td>\n`;
    html += `<td class="lg-name"><a href="#" class="detail_btn" data-id="${item['id']}">${
      item['name'] ?? item['title']
    }</a></td>\n`;
    html += `<td class="lg-number">${item['problemCount']}</td>\n`;
    html += `<td class="lg-number">${item['markCount']}</td>\n`;
    html += `<td class="lg-number" style="font-weight: bold; color: ${getUsernameColor(
      'color' in item.provider ? item.provider.color : 'Gray'
    )};">${item['provider']['name']}${getUserSvg(
      'ccfLevel' in item.provider ? item.provider.ccfLevel : 0
    )}</td>\n`;
    html += '</tr>\n';
  }
  html += '</tbody></table></div>\n';
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
        vscode.postMessage({type: 'request', channel: 'select', page: pageSelected, keyword});
      }
      function gotokthselected() {
        const id = parseInt(document.getElementById('KTHSELECTED').value);
        if (id < 1 || id > Math.ceil(${trainings?.['count'] ?? items.length} / 50.0)) {
          showError("不合法的页数");
          return;
        }
        pageSelected = id;
        vscode.postMessage({type: 'request', channel: 'select', page: pageSelected, keyword});
      }
      </script>
      <div class="lg-pagination">
        <button class="lg-button lg-button--secondary" onclick="turnSelected(-1)">上一页</button>
        <input class="lg-input" type="number" min="1" placeholder="页码" id="KTHSELECTED">
        <button class="lg-button lg-button--secondary" onclick="gotokthselected()">跳转</button>
        <button class="lg-button" onclick="turnSelected(1)">下一页</button>
      </div>`;
  return html;
};
