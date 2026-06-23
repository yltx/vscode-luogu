import { searchContest } from '@/utils/api';
import * as vscode from 'vscode';
import showContestWebview from './webview';
import { processAxiosError } from '@/utils/workspaceUtils';
import registerContestMonitor from './contestMonitor';

export default function registerContest(context: vscode.ExtensionContext) {
  registerContestMonitor(context);
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'luogu.contest',
      async (contestId?: number) => {
        if (contestId === undefined) {
          const s = await vscode.window.showInputBox({
            prompt: '请输入比赛 ID',
            ignoreFocusOut: true,
            validateInput: x => (/^\d+$/.test(x) ? '' : '比赛 ID 必须为数字')
          });
          if (s === undefined) return false;
          contestId = parseInt(s);
        }
        return await searchContest(contestId).then(
          contestData => {
            globalThis.luogu.historyTreeviewProvider.addItem({
              type: 'contest',
              contestId: contestData.contest.id,
              title: contestData.contest.name,
              startTime: contestData.contest.startTime,
              endTime: contestData.contest.endTime,
              ruleType: contestData.contest.method,
              visibilityType: contestData.contest.visibility,
              owner:
                'uid' in contestData.contest.host
                  ? {
                      uid: contestData.contest.host.uid,
                      name: contestData.contest.host.name
                    }
                  : {
                      teamId: contestData.contest.host.id,
                      name: contestData.contest.host.name
                    },
              rated: !!contestData.contest.rated
            });
            showContestWebview(contestData);
            return true;
          },
          (e: unknown) => {
            processAxiosError('查找比赛')(e);
            return new Error('Error when fetch contest', { cause: e });
          }
        );
      }
    )
  );
}
