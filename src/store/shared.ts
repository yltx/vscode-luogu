export const USER_UPDATE = Symbol('user-update')
'use strict';

export enum UserStatus {
  SignedIn = 1,
  SignedOut = 2
}

export enum Languages {
  'Auto' = 0,
  'Pascal' = 1,
  'C' = 2,
  'C++' = 3,
  'C++11' = 4,
  '提交答案' = 5,
  'Python 2' = 6,
  'Python 3' = 7,
  'Java 8' = 8,
  'Node v8.9' = 9,
  'Shell' = 10,
  'C++14' = 11,
  'C++17' = 12,
  'Ruby' = 13,
  'Go' = 14,
  'Rust' = 15,
  'PHP 7' = 16,
  'C# Mono' = 17,
  'Visual Basic Mono' = 18,
  'Haskell' = 19,
  'Kotlin/Native' = 20,
  'Kotlin/JVM' = 21,
  'Scala' = 22,
  'Perl' = 23,
  'PyPy2' = 24,
  'PyPy3' = 25,
  '文言' = 26
}

export enum ProblemState {
  'Waiting' = 0,
  'Judging' = 1,
  'Compile Error' = 2,
  'OLE' = 3,
  'MLE' = 4,
  'TLE' = 5,
  'WA' = 6,
  'RE' = 7,
  'Accepted' = 12,
  'Unaccepted' = 14,
  'Hack Success' = 21,
  'Hack Failure' = 22,
  'Hack Skipped' = 23
}

export interface OAuth2ResponseData {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: Array<string>;
}
