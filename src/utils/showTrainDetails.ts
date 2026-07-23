import { Problem, ProblemSetDetails, UserSummary } from 'luogu-api';
import { searchTrainingdetail } from './api';
import { getResourceFilePath } from './html';
import md from './markdown';
import { getDifficulty, getScoreColor } from './shared';
import { tagManager } from './tagManager';
import * as vscode from 'vscode';
import { normalizeTrainingProblems } from '@/commands/traininglist/trainingData';
const getUserScoreStatus = (userScore, fullScore) => {
  if (userScore === fullScore) {
    return `<span style="color: rgb(82, 196, 26);"><svg width="16" height="21.82" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="check" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="svg-inline--fa fa-check fa-w-16"><path fill="currentColor" d="M173.898 439.404l-166.4-166.4c-9.997-9.997-9.997-26.206 0-36.204l36.203-36.204c9.997-9.998 26.207-9.998 36.204 0L192 312.69 432.095 72.596c9.997-9.997 26.207-9.997 36.204 0l36.203 36.204c9.997 9.997 9.997 26.206 0 36.204l-294.4 294.401c-9.998 9.997-26.207 9.997-36.204-.001z" class=""></path></svg></span>`;
  } else {
    if (userScore !== -1) {
      return `<span style="${getScoreColor(
        userScore
      )};font-weight: bold">${userScore}</span>`;
    } else {
      return `<span style="color: rgb(122, 122, 122);"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="minus" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" class="icon svg-inline--fa fa-minus fa-w-14" style="opacity: 0.7; width: 1em;"><path fill="currentColor" d="M416 208H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h384c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z" class=""></path></svg></span>`;
    }
  }
};
const getDifficultyStatus = (difficulty: number) => {
  const item = getDifficulty(difficulty);
  return `<span class="lg-badge" style="background: ${item.color};">${item.name}</span>`;
};
const getTagsStatus = async (tagIds: number[]) => {
  const resolved = await tagManager.getTags(tagIds);
  return resolved
    .map((tag, i) => {
      const id = tagIds[i];
      const name = tag?.name ?? `未知标签(${id})`;
      const color = tag?.color ?? '#000000';
      return `<span class="lg-badge" style="background-color: ${color}">${name}</span>`;
    })
    .join('');
};
export class TrainDetals {
  public title: string;
  public problemCount: number;
  public problemlist: Problem[];
  public description: string;
  public userScore: {
    user: UserSummary;
    totalScore: number;
    score: {
      [pid: string]: number | null;
    };
    status: {
      [pid: string]: boolean;
    };
  } | null;

  public constructor(fields: ProblemSetDetails) {
    this.title = fields.name;
    this.problemCount = fields.problemCount;
    this.problemlist = normalizeTrainingProblems(
      fields.problems as Array<Problem | { problem: Problem }>
    );
    this.description = fields.description;
    this.userScore = fields.userScore;
  }

  async toHTML(): Promise<string> {
    let problemlist = '<div>\n';
    if (this.problemCount > 0) {
      problemlist += '<div class="lg-table-wrap"><table class="lg-table">\n';
      problemlist += '  <tr>\n';
      problemlist += '    <th>题号</th>\n';
      problemlist += '    <th>状态</th>\n';
      problemlist += '    <th>题目名称</th>\n';
      problemlist += '    <th>标签</th>\n';
      problemlist += '    <th>难度</th>\n';
      problemlist += '    <th>通过率</th>\n';
      problemlist += '  </tr>\n';
    }
    for (const p of this.problemlist) {
      const score = p['accepted'] ? 1 : p['submitted'] ? 0 : -1;
      const tagsHtml = await getTagsStatus(p['tags']);
      problemlist += `  <tr>
    <td class="lg-number">${p['pid']}</td>
    <td class="lg-number">${getUserScoreStatus(score, 1)}</td>
    <td class="lg-name"><a href="#" class="pid" id="${p['pid']}">${md.render(
      p['name'] ?? p['title'] ?? ''
    )}</a></td>
    <td>${tagsHtml}</td>
    <td class="lg-number">${getDifficultyStatus(p['difficulty']!)}</td>
    <td>
      <div class="lg-progress-wrap">
        <progress class="lg-progress" value="${p['totalAccepted']}" max="${p['totalSubmit']}"></progress>
        <span class="lg-progress-text">${Math.round((p['totalAccepted'] / Math.max(p['totalSubmit'], 1)) * 100)}%</span>
      </div>
    </td>
</tr>`;
    }
    if (this.problemCount > 0) {
      problemlist += '</table></div>\n';
    }
    problemlist += '</div>';
    return `
    <div class="lg-article" id="description">
    ${md.render(this.description)}\n
    </div>
    <div hidden id="problemlist">
    ${problemlist}
    </div>
    `;
  }
}
export const showTrainDetails = async (webview: vscode.Webview, id: number) => {
  const train = await searchTrainingdetail(id).then(async res => {
    await globalThis.luogu.historyTreeviewProvider.addItem({
      type: 'training',
      title: res.training.name,
      trainingId: res.training.id,
      trainingType: res.training.type,
      owner:
        'uid' in res.training.provider
          ? { uid: res.training.provider.uid, name: res.training.provider.name }
          : {
              teamId: res.training.provider.id,
              name: res.training.provider.name
            }
    });
    return new TrainDetals(res.training);
  });
  return generateTrainDetailsHTML(webview, train);
};
export const generateTrainDetailsHTML = async (
  webview: vscode.Webview,
  train: TrainDetals
) => {
  const htmlContent = await train.toHTML();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${train.title}</title>
  <link rel="stylesheet" href="${getResourceFilePath(
    webview,
    'highlightjs.default.min.css'
  )}">
  <link rel="stylesheet" href="${getResourceFilePath(
    webview,
    'katex.min.css'
  )}">
  <link rel="stylesheet" href="${getResourceFilePath(webview, 'training.css')}">
</head>
<body>
<script>
    const vscode = acquireVsCodeApi();
    document.addEventListener("DOMContentLoaded", function () {
      document.querySelectorAll(".pid").forEach(function(el) {
        el.addEventListener("click", function(event) {
          event.preventDefault();
          const id = this.getAttribute("id");
          console.log("problem id:", id);
          vscode.postMessage({type: 'open', data: id});
        });
      });
    });
    let channel = 0;
    const Channel = ['description','problemlist'];
    function changechannel(to) {
        document.getElementById(Channel[channel]).hidden = true;
        document.getElementById(Channel[to]).hidden = false;
        document.querySelectorAll('.lg-tab').forEach((tab, index) => {
          tab.setAttribute('aria-selected', String(index === to));
        });
        channel = to;
    }
</script>
<main class="lg-page lg-page--article">
  <header class="lg-header">
    <h1 class="lg-title">${train.title}</h1>
    <p class="lg-meta">共 ${train.problemCount} 道题</p>
  </header>
  <nav class="lg-tabs" role="tablist">
    <button class="lg-tab" type="button" role="tab" aria-selected="true" onclick="changechannel(0)">题单简介</button>
    <button class="lg-tab" type="button" role="tab" aria-selected="false" onclick="changechannel(1)">题目列表</button>
  </nav>
  ${htmlContent}
</main>
</body>
</html>`;
};
