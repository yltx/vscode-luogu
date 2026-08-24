import { UUID } from 'crypto';

export type WebviewRequestMessage<T extends string, D> = {
  type: T;
  data: D;
  uuid: UUID;
};
export type WebviewResponseMessage<D> = {
  data: D;
  error?: string;
  uuid: UUID;
};
export type WebviewMessage<
  REQ extends WebviewRequestMessage<string, unknown>,
  RES extends WebviewResponseMessage<unknown>
> = {
  request: REQ;
  response: RES;
};
type MessageTypesBase<T> = T extends []
  ? // eslint-disable-next-line @typescript-eslint/ban-types
    {}
  : T extends [infer First, ...infer Other]
    ? First extends WebviewMessage<infer REQ, WebviewResponseMessage<unknown>>
      ? {
          [K in REQ['type']]: First;
        } & MessageTypesBase<Other>
      : never
    : never;

type BenbenUpdateMessageType = WebviewMessage<
  WebviewRequestMessage<'BenbenUpdate', { page: number }>,
  WebviewResponseMessage<import('@/model/benben').default[]>
>;
type BenbenSendMessageType = WebviewMessage<
  WebviewRequestMessage<'BenbenSend', { comment: string }>,
  WebviewResponseMessage<void>
>;
type BenbenDeleteMessageType = WebviewMessage<
  WebviewRequestMessage<'BenbenDelete', { id: number }>,
  WebviewResponseMessage<void>
>;
type PasswordLoginMessageType = WebviewMessage<
  WebviewRequestMessage<
    'PasswordLogin',
    { username: string; password: string; captcha: string }
  >,
  WebviewResponseMessage<{ type: 'error' | '2fa' | undefined }>
>;
type Need2faCaptchaMessageType = WebviewMessage<
  WebviewRequestMessage<'Need2faCaptcha', void>,
  WebviewResponseMessage<{ captchaImage: string }>
>;
type NeedLoginCaptchaMessageType = WebviewMessage<
  WebviewRequestMessage<'NeedLoginCaptcha', void>,
  WebviewResponseMessage<{ captchaImage: string }>
>;
type CookieLoginMessageType = WebviewMessage<
  WebviewRequestMessage<'CookieLogin', Cookie>,
  WebviewResponseMessage<{ type: 'error' | undefined }>
>;
type SendMailCodeMessageType = WebviewMessage<
  WebviewRequestMessage<'SendMailCode', { captcha: string }>,
  WebviewResponseMessage<{ type: 'error' | undefined }>
>;
type Login2faMessageType = WebviewMessage<
  WebviewRequestMessage<'2fa', { code: string; type: 'totp' | 'mail' }>,
  WebviewResponseMessage<{ type: 'error' | undefined }>
>;
type clearLoginCookieMessageType = WebviewMessage<
  WebviewRequestMessage<'clearLoginCookie', void>,
  WebviewResponseMessage<void>
>;
type checkCphMessageType = WebviewMessage<
  WebviewRequestMessage<'checkCph', void>,
  WebviewResponseMessage<boolean>
>;
type JumpToCphMessageType = WebviewMessage<
  WebviewRequestMessage<'jumpToCph', void>,
  WebviewResponseMessage<void>
>;
type SubmitProblemMessageType = WebviewMessage<
  WebviewRequestMessage<'submitProblem', { language: string }>,
  WebviewResponseMessage<boolean>
>;
type GetSubmissionContextMessageType = WebviewMessage<
  WebviewRequestMessage<'getSubmissionContext', void>,
  WebviewResponseMessage<
    import('./views/viewProblem/submissionTypes').ProblemSubmissionContext
  >
>;
type GetSolutionDetailsMessageType = WebviewMessage<
  WebviewRequestMessage<'getSolutionDetails', { index: number }>,
  WebviewResponseMessage<import('@/model/article').default>
>;
type VoteArticleMessageType = WebviewMessage<
  WebviewRequestMessage<'voteArticle', { lid: string; type: 1 | 0 | -1 }>,
  WebviewResponseMessage<{ upvotes: number; voted: 1 | 0 | -1 }>
>;
type GetContestProblemNavigationMessageType = WebviewMessage<
  WebviewRequestMessage<'getContestProblemNavigation', void>,
  WebviewResponseMessage<
    | import('./views/viewProblem/contestProblemNavigationTypes').ContestProblemNavigation
    | null
  >
>;
type OpenContestProblemMessageType = WebviewMessage<
  WebviewRequestMessage<'openContestProblem', { pid: string }>,
  WebviewResponseMessage<import('luogu-api').ProblemData | null>
>;
type ContestRanklist = WebviewMessage<
  WebviewRequestMessage<'ContestRanklist', { page: number }>,
  WebviewResponseMessage<import('luogu-api').GetScoreboardResponse>
>;
type ContestReload = WebviewMessage<
  WebviewRequestMessage<'ContestReload', void>,
  WebviewResponseMessage<import('luogu-api').ContestData>
>;
type ContestJoin = WebviewMessage<
  WebviewRequestMessage<'ContestJoin', void>,
  WebviewResponseMessage<boolean>
>;
type ContestEnterContestMode = WebviewMessage<
  WebviewRequestMessage<'ContestEnterContestMode', void>,
  WebviewResponseMessage<boolean>
>;
type ContestMonitorGet = WebviewMessage<
  WebviewRequestMessage<'ContestMonitorGet', void>,
  WebviewResponseMessage<number | undefined>
>;
type ContestMonitorStop = WebviewMessage<
  WebviewRequestMessage<'ContestMonitorStop', void>,
  WebviewResponseMessage<boolean>
>;
type QueryDownloadableTestcaseMessageType = WebviewMessage<
  WebviewRequestMessage<'QueryDownloadableTestcase', void>,
  WebviewResponseMessage<number | null>
>;
type DownloadTestcaseMessageType = WebviewMessage<
  WebviewRequestMessage<'DownloadTestcase', { testcaseId: number }>,
  WebviewResponseMessage<boolean>
>;
type MessageTypes = MessageTypesBase<
  // Add new types in this array.
  [
    BenbenUpdateMessageType,
    BenbenSendMessageType,
    BenbenDeleteMessageType,
    Need2faCaptchaMessageType,
    NeedLoginCaptchaMessageType,
    PasswordLoginMessageType,
    CookieLoginMessageType,
    SendMailCodeMessageType,
    Login2faMessageType,
    clearLoginCookieMessageType,
    checkCphMessageType,
    JumpToCphMessageType,
    SubmitProblemMessageType,
    GetSubmissionContextMessageType,
    GetSolutionDetailsMessageType,
    VoteArticleMessageType,
    GetContestProblemNavigationMessageType,
    OpenContestProblemMessageType,
    ContestRanklist,
    ContestReload,
    ContestJoin,
    ContestEnterContestMode,
    ContestMonitorGet,
    ContestMonitorStop,
    QueryDownloadableTestcaseMessageType,
    DownloadTestcaseMessageType
  ]
>;
export default MessageTypes;
