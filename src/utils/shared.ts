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
    'C++14' = 11,
    'C++17' = 12,
    'Python2' = 6,
    'Python3' = 7,
    'Java8' = 8,
    'Node.js' = 9,
    'GO' = 14,
    'Ruby' = 13,
    'Rust' = 15,
    'PHP7' = 16,
    'C#' = 17,
    'VisualBasic' = 18,
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

export const stateColor: string[] = [ 'rgb(20, 85, 143)', 'rgb(52, 152, 219)', 'rgb(250, 219, 20)', '#001277', '#001277', '#001277', '#fb6340', '#8e44ad', '', '', '', '', 'rgb(82, 196, 26)', '', 'rgb(231, 76, 60)' ];
export enum resultState {
    'OLE' = 3,
    'MLE' = 4,
    'TLE' = 5,
    'WA' = 6,
    'RE' = 7,
    'AC' = 12
}
export interface OAuth2ResponseData {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: Array<string>;
}

export const OAuthInfo = {
  grant_type: 'password',
  clientID: 'luogu-vscode',
  client_secret: 'HasHidden',
  accessTokenUri: 'https://www.luogu.org/api/OAuth2/accessToken',
  authorizationUri: 'https://www.luogu.org/api/OAuth2/authorize'
};
