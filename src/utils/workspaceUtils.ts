import * as vscode from 'vscode';

import { languageList, Languages, ProblemState, stateColor, colorStyle, fileExtention } from '@/utils/shared';

export function getSelectedLanguage(selected: string = vscode.workspace.getConfiguration('luogu').get<string>('defaultLanguage')!): number {
  // @ts-ignore
  return Languages[selected as any];
}

export function getStatusText(status: number): string {
  return ProblemState[status];
}

export function getStatusColor(status: number): string {
  return stateColor[status];
}
export function getLanauageFromExt(ext: string) {
  return fileExtention[ext] === undefined ? [] : languageList[fileExtention[ext]]
}

export function getScoreColor(score: number): string {
  return score < 30 ? 'rgb(231, 76, 60)' : (score < 80 ? 'rgb(243, 156, 17)' : 'rgb(82, 196, 26)');
}

export function getUsernameStyle (color: string): string {
  return colorStyle[color];
}

export function getUserSvg(ccfLevel: number): string {
  if (ccfLevel === 0) {
    return '';
  }
  const green = `#52c41a`;
  const blue = `#3498db`;
  const gold = `#ffc116`;
  const color = ccfLevel >= 3 && ccfLevel <= 5 ? green : ccfLevel >= 6 && ccfLevel <= 7 ? blue : gold;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="${color}" style="margin-bottom: -3px;"><path d="M16 8C16 6.84375 15.25 5.84375 14.1875 5.4375C14.6562 4.4375 14.4688 3.1875 13.6562 2.34375C12.8125 1.53125 11.5625 1.34375 10.5625 1.8125C10.1562 0.75 9.15625 0 8 0C6.8125 0 5.8125 0.75 5.40625 1.8125C4.40625 1.34375 3.15625 1.53125 2.34375 2.34375C1.5 3.1875 1.3125 4.4375 1.78125 5.4375C0.71875 5.84375 0 6.84375 0 8C0 9.1875 0.71875 10.1875 1.78125 10.5938C1.3125 11.5938 1.5 12.8438 2.34375 13.6562C3.15625 14.5 4.40625 14.6875 5.40625 14.2188C5.8125 15.2812 6.8125 16 8 16C9.15625 16 10.1562 15.2812 10.5625 14.2188C11.5938 14.6875 12.8125 14.5 13.6562 13.6562C14.4688 12.8438 14.6562 11.5938 14.1875 10.5938C15.25 10.1875 16 9.1875 16 8ZM11.4688 6.625L7.375 10.6875C7.21875 10.8438 7 10.8125 6.875 10.6875L4.5 8.3125C4.375 8.1875 4.375 7.96875 4.5 7.8125L5.3125 7C5.46875 6.875 5.6875 6.875 5.8125 7.03125L7.125 8.34375L10.1562 5.34375C10.3125 5.1875 10.5312 5.1875 10.6562 5.34375L11.4688 6.15625C11.5938 6.28125 11.5938 6.5 11.4688 6.625Z"></path></svg>`;
}
