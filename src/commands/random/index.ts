import SuperCommand from '../SuperCommand';
import * as vscode from 'vscode';
import { difficultyID, problemset } from '@/utils/shared';
import {
  getSelectedDifficulty,
  getSelectedProblemset
} from '@/utils/workspaceUtils';
import axios from 'axios';
import {
  getRandomProblemPage,
  parseProblemListResponse,
  selectRandomProblem
} from './randomProblem';

export default new SuperCommand({
  onCommand: 'random',
  handle: async () => {
    const selectedDifficulty = vscode.workspace
      .getConfiguration('luogu')
      .get<string>('defaultDifficulty')!;
    const diff: string[] = [];
    for (const item in difficultyID) {
      if (isNaN(Number(item))) {
        diff.push(item);
      }
    }
    const userdifficulty = vscode.workspace
      .getConfiguration('luogu')
      .get<boolean>('showSelectDifficultyHint')
      ? await vscode.window.showQuickPick(diff).then(value => {
          if (value === undefined) {
            return undefined;
          }
          const v = getSelectedDifficulty(value);
          return v === -1 || !v ? 0 : v;
        })
      : getSelectedDifficulty(selectedDifficulty);
    if (userdifficulty === undefined) return false;
    const selectedProblemset = vscode.workspace
      .getConfiguration('luogu')
      .get<string>('defaultProblemSet')!;
    const prob: string[] = [];
    for (const item in problemset) {
      if (isNaN(Number(item))) {
        prob.push(item);
      }
    }
    const userProblemset = vscode.workspace
      .getConfiguration('luogu')
      .get<boolean>('showSelectProblemsetHint')
      ? await vscode.window.showQuickPick(prob).then(value => {
          if (value === undefined) {
            return undefined;
          }
          const v = getSelectedProblemset(value);
          return v === null || !v ? '' : v;
        })
      : getSelectedProblemset(selectedProblemset);
    if (userProblemset === undefined) return false;

    try {
      const firstPage = await axios
        .get(
          `https://www.luogu.com.cn/problem/list?difficulty=${userdifficulty}&type=${userProblemset}&page=1&_contentOnly=1`
        )
        .then(res => res.data);
      const problemCount = parseProblemListResponse(firstPage).count;
      const randPage = getRandomProblemPage(problemCount);
      const page = await axios
        .get(
          `https://www.luogu.com.cn/problem/list?difficulty=${userdifficulty}&type=${userProblemset}&page=${randPage}&_contentOnly=1`
        )
        .then(res => res.data);
      const problem = selectRandomProblem(
        parseProblemListResponse(page).result
      );
      await vscode.commands.executeCommand('luogu.searchProblem', {
        pid: problem.pid
      });
      return true;
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.errorMessage ||
          (err.request ? '请求超时，请重试' : err.message)
        : err instanceof Error
          ? err.message
          : '未知错误';
      vscode.window.showErrorMessage(`随机题目时出现错误：${message}`);
      console.error('Error when fetching a random problem', err);
      return false;
    }
  }
});
