import * as vscode from 'vscode';
import type { ArticleDetails, List } from 'luogu-api';
import { getSolution, voteArticle } from '@/utils/api';
import { getDistFilePath } from '@/utils/html';
import {
  processAxiosError,
  getWebviewViewColumn
} from '@/utils/workspaceUtils';
import useWebviewResponseHandle from '@/utils/webviewResponse';
import ArticleData from '@/model/article';

const PerPage = 10;

function updateSolutionList(
  solutions: (ArticleDetails | undefined)[],
  data: List<ArticleDetails>['result']
) {
  Object.entries(data).forEach(([k, v]) => (solutions[k] = v));
  return solutions;
}
export default function registerSolutionFeature(
  context: vscode.ExtensionContext
) {
  context.subscriptions.push(
    vscode.commands.registerCommand('luogu.solution', async (pid?: string) => {
      if (pid === undefined) {
        pid = await vscode.window.showInputBox({
          placeHolder: '输入题号',
          ignoreFocusOut: true
        });
        if (!pid) return false;
      }
      return await getSolution(pid, 1)
        .then(data => ({
          realPid: data.problem.pid,
          count: data.solutions.count,
          acceptSolution: data.acceptSolution,
          solutions: updateSolutionList(
            Array.from({ length: data.solutions.count }),
            data.solutions.result
          )
        }))
        .then(({ realPid, count, solutions }) => {
          const panel = vscode.window.createWebviewPanel(
            'luogu.solutionPanel',
            realPid + ' 题解',
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
          useWebviewResponseHandle(panel.webview, {
            getSolutionDetails: async ({ index }) => {
              if (solutions[index] === undefined) {
                try {
                  const page = Math.floor(index / PerPage) + 1;
                  const dat = await getSolution(pid, page);
                  updateSolutionList(
                    solutions,
                    Object.fromEntries(
                      Object.entries(dat.solutions.result).map(([i, v]) => [
                        +i + (page - 1) * PerPage,
                        v
                      ])
                    )
                  );
                } catch (e) {
                  processAxiosError('获取题解')(e);
                  throw e;
                }
              }
              const target = solutions[index];
              if (target === undefined) {
                const e = new Error(
                  'Unexpected situation: solutions[index] is still undefined after fetching when getSolution'
                );
                console.error(e);
                throw e;
              }
              return new ArticleData(target);
            },
            voteArticle: ({ lid, type }) =>
              voteArticle(lid, type).catch(e => {
                processAxiosError('赞/踩文章')(e);
                throw e;
              })
          });
          panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <script type="application/json" id="lentille-context">${JSON.stringify({ count })}</script>
            </head>
            <body>
            <script defer src=${getDistFilePath(panel.webview, 'webview-solution.js')}></script>
            <div id="app"></div>
            </body>
            </html>
          `;
          return true;
        })
        .catch((e: unknown) => {
          processAxiosError('获取题解')(e);
          return new Error('Error when fetch problem', { cause: e });
        });
    })
  );
}
