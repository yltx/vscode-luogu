import * as vscode from 'vscode';
import axios from 'axios';
import { ProblemData } from 'luogu-api';
import { processAxiosError } from '@/utils/workspaceUtils';
import { randomUUID } from 'crypto';

// 端口改为可配置：luogu.cphPort，默认 27121（与 CPH 默认一致）
function getCphPort() {
  return vscode.workspace
    .getConfiguration('luogu')
    .get<number>('cphPort', 27121);
}

// https://github.com/agrawal-d/cph/blob/63977514a5cc021f181cb86a1a482f6bccb8f904/src/types.ts#L64-L80
// https://github.com/jmerle/competitive-companion/blob/4bf4fa04f51dc9ae6868534b1dabd5b3bfc300b7/src/models/TaskBuilder.ts#L13-L41
interface CphRequestType {
  name: string;
  url: string;
  // interactive: boolean; // seems haven't been used in cph
  memoryLimit: number;
  timeLimit: number;
  group: string;
  tests: {
    input: string;
    output: string;
    id: number;
  }[];
  // The following fields are not used by CPH currently
  // But is provided by Competitive Companion
  // Define them for compatibility
  testType: 'single' | 'multiNumber';
  input: {
    type: 'stdin' | 'file' | 'regex';
    fileName?: string;
    pattern?: string;
  };
  output: {
    type: 'stdout' | 'file';
    fileName?: string;
  };
  languages: {
    java: {
      mainClass: string;
      taskClass: string;
    };
  };
  batch: {
    id: string;
    size: number;
  };
}

export async function checkCPH() {
  const port = getCphPort();
  for (const host of ['127.0.0.1', 'localhost']) {
    try {
      await axios.get(`http://${host}:${port}`, { timeout: 1500 });
      return true;
    } catch {
      // Try the alternate loopback host before reporting CPH unavailable.
    }
  }
  return false;
}
export async function sendCphMessage(data: ProblemData) {
  const config = vscode.workspace.getConfiguration('luogu').get('cphStyle') as [
    'ProblemID',
    'ProblemName',
    'ProblemIDwithProblemName'
  ][number];
  const port = getCphPort();
  const request = {
    name:
      'Luogu' +
      (config === 'ProblemID' || config === 'ProblemIDwithProblemName'
        ? ' - ' + data.problem.pid
        : '') +
      (config === 'ProblemName' || config === 'ProblemIDwithProblemName'
        ? ' - ' + (data.problem.title ?? data.problem.content.name)
        : ''),
    url:
      'https://www.luogu.com.cn/problem/' +
      data.problem.pid +
      (data.contest ? '?contestId=' + data.contest.id : ''),
    memoryLimit: Math.max(...data.problem.limits.memory) / 1024,
    timeLimit: Math.max(...data.problem.limits.time),
    tests: data.problem.samples.map((d, i) => ({
      input: d[0],
      output: d[1],
      id: i
    })),
    group: 'luogu' + (data.contest ? ' - ' + data.contest.id : ''),
    testType: 'single',
    input: { type: 'stdin' },
    output: { type: 'stdout' },
    languages: {
      java: {
        mainClass: 'Main',
        taskClass: ''
      }
    },
    batch: {
      id: randomUUID(),
      size: 1
    }
  } satisfies CphRequestType;
  let lastError: unknown;
  for (const host of ['127.0.0.1', 'localhost']) {
    try {
      await axios.post(`http://${host}:${port}`, request, { timeout: 3000 });
      vscode.window.showInformationMessage('已传送到 CPH。');
      return;
    } catch (error) {
      lastError = error;
    }
  }
  processAxiosError('传送 CPH')(lastError);
}
