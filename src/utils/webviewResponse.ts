import MessageTypes from '@w/webviewMessage';
import vscode from 'vscode';

type MaybePromise<T> = T | PromiseLike<T>;
type Validator = (data: unknown) => boolean;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown) => typeof value === 'string';
const isNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value);
const isInteger = (value: unknown) =>
  isNumber(value) && Number.isInteger(value);
const isNonnegativeInteger = (value: unknown) =>
  typeof value === 'number' && isInteger(value) && value >= 0;
const isVoid = (value: unknown) => value === undefined;
const hasShape = (value: unknown, shape: Readonly<Record<string, Validator>>) =>
  isRecord(value) &&
  Object.entries(shape).every(([key, validate]) => validate(value[key]));

const requestValidators = {
  BenbenUpdate: (data: unknown) => hasShape(data, { page: isInteger }),
  BenbenSend: (data: unknown) => hasShape(data, { comment: isString }),
  BenbenDelete: (data: unknown) => hasShape(data, { id: isInteger }),
  Need2faCaptcha: isVoid,
  NeedLoginCaptcha: isVoid,
  PasswordLogin: (data: unknown) =>
    hasShape(data, {
      username: isString,
      password: isString,
      captcha: isString
    }),
  CookieLogin: (data: unknown) =>
    hasShape(data, { uid: isInteger, clientID: isString }),
  SendMailCode: (data: unknown) => hasShape(data, { captcha: isString }),
  '2fa': (data: unknown) =>
    hasShape(data, {
      code: isString,
      type: value => value === 'totp' || value === 'mail'
    }),
  clearLoginCookie: isVoid,
  checkCph: isVoid,
  jumpToCph: isVoid,
  submitProblem: (data: unknown) => hasShape(data, { language: isString }),
  getSubmissionContext: isVoid,
  getSolutionDetails: (data: unknown) => hasShape(data, { index: isInteger }),
  voteArticle: (data: unknown) =>
    hasShape(data, {
      lid: isString,
      type: value => value === 1 || value === 0 || value === -1
    }),
  getContestProblemNavigation: isVoid,
  openContestProblem: (data: unknown) => hasShape(data, { pid: isString }),
  ContestRanklist: (data: unknown) => hasShape(data, { page: isInteger }),
  ContestReload: isVoid,
  ContestJoin: isVoid,
  ContestEnterContestMode: isVoid,
  ContestMonitorGet: isVoid,
  ContestMonitorStop: isVoid,
  QueryDownloadableTestcase: isVoid,
  DownloadTestcase: (data: unknown) =>
    hasShape(data, { testcaseId: isNonnegativeInteger })
} satisfies Record<keyof MessageTypes, Validator>;

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
const hasOwn = (value: object, key: PropertyKey) =>
  Object.prototype.hasOwnProperty.call(value, key);

/**
 * 重新封装 vscode webview message，方便在需要以类似 http 的形式获取返回值的形式使用。这是用于处理请求的函数。
 * @param handles 一个对象，其中请求类型字符串为键，请求体为一个接受请求体、返回请求类型的函数
 */
export default function useWebviewResponseHandle<K extends keyof MessageTypes>(
  webview: vscode.Webview,
  handles: {
    [M in K]: (
      data: MessageTypes[M]['request']['data']
    ) => MaybePromise<MessageTypes[M]['response']['data']>;
  }
) {
  webview.onDidReceiveMessage(async (message: unknown) => {
    if (
      !isRecord(message) ||
      typeof message.type !== 'string' ||
      typeof message.uuid !== 'string' ||
      !uuidPattern.test(message.uuid)
    ) {
      return;
    }

    const type = message.type;
    const uuid = message.uuid;
    if (!hasOwn(requestValidators, type) || !hasOwn(handles, type)) {
      await webview.postMessage({
        error: `Unsupported Webview message type: ${type}`,
        uuid
      });
      return;
    }

    const requestType = type as K;
    if (!requestValidators[requestType](message.data)) {
      await webview.postMessage({
        error: `Invalid data for Webview message: ${type}`,
        uuid
      });
      return;
    }

    try {
      await webview.postMessage({
        data: await handles[requestType](
          message.data as MessageTypes[K]['request']['data']
        ),
        uuid
      } as MessageTypes[keyof MessageTypes]['response']);
    } catch (error) {
      await webview.postMessage({
        error: getErrorMessage(error),
        uuid
      });
    }
  });
}
