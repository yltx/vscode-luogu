import * as vscode from 'vscode';

import { Languages } from '../store/shared';
import { ProblemState, stateColor } from './shared';

export const luoguConfig = vscode.workspace.getConfiguration('luogu');
export const selectedLanguage = luoguConfig.get<string>('defaultLanguage')!;

export function getSelectedLanguage (selected: string = selectedLanguage): number {
  // @ts-ignore
  return Languages[selected as any];
}

export function getStatusText (status: number): string {
  return ProblemState[status];
}

export function getStatusColor (status: number): string {
  return stateColor[status];
}

export function getScoreColor (score: number): string {
  return score < 30 ? 'rgb(231, 76, 60)' : (score < 80 ? 'rgb(243, 156, 17)' : 'rgb(82, 196, 26)');
}
