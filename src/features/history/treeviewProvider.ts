import * as vscode from 'vscode';
import HistoryItem from './historyItem';
import {
  ContestVisibilityTypes,
  ContestRuleTypes,
  formatTime,
  TrainingTypes
} from '@/utils/shared';

export default class historyTreeviewProvider
  implements vscode.TreeDataProvider<HistoryItem>, vscode.Disposable
{
  constructor(
    protected getStorage: () => MaybeThenable<HistoryItem[]>,
    protected setStorage: (items: HistoryItem[]) => MaybeThenable<void>
  ) {}
  private storageQueue = Promise.resolve();
  static getItemLabel(element: HistoryItem) {
    return element.type === 'problem'
      ? `${element.pid} ${element.title}` +
          (element.contest ? ` · ${element.contest.contestId}` : ``)
      : element.type === 'training'
        ? `${element.title}`
        : `${element.title}`;
  }
  getTreeItem(element: HistoryItem): vscode.TreeItem {
    if (element.type === 'problem')
      return {
        label: historyTreeviewProvider.getItemLabel(element),
        command: {
          command: 'luogu.searchProblem',
          title: '打开题目',
          arguments: [{ pid: element.pid, cid: element.contest?.contestId }]
        },
        iconPath: new vscode.ThemeIcon('notebook'),
        tooltip: (() => {
          const md = new vscode.MarkdownString(
            `[${element.pid}](https://www.luogu.com.cn/problem/${element.pid}${element.contest ? `?contestId=${element.contest.contestId}` : ``}) ${element.title}  \n` +
              (element.contest
                ? `关联于比赛 [${element.contest.title}](${vscode.Uri.from({
                    scheme: 'command',
                    path: 'luogu.contest',
                    query: encodeURIComponent(
                      JSON.stringify([element.contest.contestId])
                    )
                  })})`
                : '')
          );
          md.isTrusted = true;
          return md;
        })(),
        contextValue: 'luogu.history.problemItem'
      };
    if (element.type === 'contest')
      return {
        label: historyTreeviewProvider.getItemLabel(element),
        command: {
          command: 'luogu.contest',
          title: '查看比赛',
          arguments: [element.contestId]
        },
        iconPath: new vscode.ThemeIcon('graph'),
        tooltip: new vscode.MarkdownString(
          `[${element.contestId}](https://www.luogu.com.cn/contest/${element.contestId}) ${element.title}  \n` +
            `举办者：[${element.owner.name}](https://www.luogu.com.cn${'uid' in element.owner ? `/user/${element.owner.uid}` : `/team/${element.owner.teamId}`})  \n` +
            `${ContestRuleTypes[element.ruleType].name} · ${ContestVisibilityTypes[element.visibilityType].name}${element.rated ? ' · rated' : ''}  \n` +
            `${formatTime(element.startTime * 1000)} - ${formatTime(element.endTime * 1000)}`
        ),
        contextValue: 'luogu.history.contestItem'
      };
    if (element.type === 'training')
      return {
        label: historyTreeviewProvider.getItemLabel(element),
        command: {
          command: 'luogu.traindetails',
          title: '打开题单',
          arguments: [element.trainingId]
        },
        iconPath: new vscode.ThemeIcon('folder-library'),
        tooltip: new vscode.MarkdownString(
          `[${element.trainingId}](https://www.luogu.com.cn/training/${element.trainingId}) ${element.title}  \n` +
            `创建者：[${element.owner.name}](https://www.luogu.com.cn${'uid' in element.owner ? `/user/${element.owner.uid}` : `/team/${element.owner.teamId}`})  \n` +
            TrainingTypes[element.trainingType]
        ),
        contextValue: 'luogu.history.trainingItem'
      };
    throw new TypeError('Unknown history element type', { cause: element });
  }
  async getChildren() {
    await this.storageQueue;
    return [...(await this.getStorage())].reverse();
  }
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  refresh() {
    this._onDidChangeTreeData.fire();
  }
  dispose() {
    this._onDidChangeTreeData.dispose();
  }
  clear() {
    return this.updateStorage(() => []);
  }
  addItem(item: HistoryItem) {
    return this.updateStorage(items => {
      const dat = items.filter(
        x =>
          historyTreeviewProvider.getItemLabel(item) !==
          historyTreeviewProvider.getItemLabel(x)
      );
      dat.push(item);
      const maxLength =
        vscode.workspace
          .getConfiguration('luogu')
          .get<number>('maxHistoryLength') ?? 256;
      if (dat.length > maxLength) dat.splice(0, dat.length - maxLength);
      return dat;
    });
  }
  updateStorage(
    transform: (items: HistoryItem[]) => MaybeThenable<HistoryItem[]>
  ) {
    const update = async () => {
      const items = await transform([...(await this.getStorage())]);
      await this.setStorage(items);
      this.refresh();
    };
    this.storageQueue = this.storageQueue.then(update, update);
    return this.storageQueue;
  }
}
