import _, { isAxiosError } from 'axios';
import { UserStatus } from '@/utils/shared';
import * as vscode from 'vscode';
import {
  Activity,
  ActivityData,
  ArticleData,
  ArticleDetails,
  ArticleListData,
  ContestData,
  DataResponse,
  EditArticleRequest,
  GetScoreboardResponse,
  LentilleDataResponse,
  List,
  LoginRequest,
  LoginResponse,
  ProblemData,
  RecordBase,
  RecordData,
  SolutionsData,
  UserSummary
} from 'luogu-api';
import { askForCaptcha, cookieString, praseCookie } from './workspaceUtils';
import { needLogin } from './uiUtils';
import CsrfTokenManager from './csrfTokenManager';

type EditableArticle = ArticleDetails & { content: string; top: number };
let csrfTokenManager: CsrfTokenManager | undefined;

export const CSRF_TOKEN_REGEX = /<meta name="csrf-token" content="(.*)">/;

export namespace API {
  export const baseURL = 'https://www.luogu.com.cn/';
  export const apiURL = '/api';
  export const cookieDomain = 'luogu.com.cn';
  export const SEARCH_PROBLEM = (pid: string) =>
    `/problem/${pid}?_contentOnly=1`;
  export const SEARCH_CONTESTPROBLEM = (pid: string, cid: string) =>
    `/problem/${pid}?contestId=${cid}&_contentOnly=1`;
  export const SEARCH_SOLUTION = (pid: string, page: number) =>
    `/problem/solution/${pid}?page=${page}&_contentOnly=1`;
  export const INDEX = `/`;
  export const CAPTCHA_IMAGE = '/api/verify/captcha';
  export const LOGIN_CAPTCHA_IMAGE = `/lg4/captcha`;
  export const CONTEST = (cid: number) => `/contest/${cid}?_contentOnly=1`;
  export const LOGIN_ENDPOINT = `/do-auth/password`;
  export const SEND_MAIL_2FA = `/auth/motp/request`;
  export const LOGOUT = `/auth/logout`;
  export const FATE = `/index/ajax_punch`;
  export const FOLLOWED_BENBEN = (page: number) =>
    `${apiURL}/feed/watching?page=${page}`;
  export const USER_BENBEN = (page: number, user?: number) =>
    `${apiURL}/feed/list?page=${page}&user=${user !== undefined ? user : ''}`;
  export const BenbenReferer = 'https://www.luogu.com.cn/';
  export const BENBEN_POST = `${apiURL}/feed/postBenben`;
  export const BENBEN_DELETE = (id: number) => `${apiURL}/feed/delete/${id}`;
  export const UNLOCK_TOTP = `/do-auth/totp`;
  export const UNLOCK_MAIL = `/do-auth/motp`;
  export const JOIN_CONTEST = (cid: number) => `/contest/${cid}/join`;
  export const ranklist = (cid: number, page: number) =>
    `/fe/api/contest/scoreboard/${cid}?page=${page}`;
  export const TRAINLISTDETAIL = (id: number) =>
    `/training/${id}?_contentOnly=1`;
  export const SEARCHTRAINLIST = (
    channel: string,
    keyword: string,
    page: number
  ) =>
    `/training/list?type=${channel}&page=${page}&keyword=${encodeURI(
      keyword
    )}&_contentOnly=1`;
  export const SOLUTION_REFERER = (pid: string) => `/problem/solution/${pid}`;
  export const MYARTICLE = `/article/mine?_contentOnly`,
    DELETE_ARTICLE = (lid: string) => `/article/${lid}/delete`,
    EDIT_ARTICLE = (lid: string) => `/article/${lid}/editSubmit`,
    EDITABLE_ARTICLE = (lid: string) => `/article/${lid}/edit?_contentOnly=1`,
    GET_ARTICLE = (lid: string) => `/article/${lid}?_contentOnly`,
    REQUEST_PROMOTION = (lid: string) => `/api/article/requestPromotion/${lid}`,
    WITHDRAW_PROMOTION = (lid: string) =>
      `/api/article/withdrawPromotion/${lid}`,
    CREATE_ARTICLE = '/article/_newSubmit';
  export const VOTE_ARTICLE = (lid: string) => `/article/${lid}/vote`;
  export const CSRF_TOKEN = `/ranking`;
  export const CLIENT_ID = `/auth/login`;
  export const AUTH_CSRF_TOKEN = `/auth/login`;
  export const QUERY_DOWNLOADABLE_TESTCASE = (rid: number) =>
    `/fe/api/record/queryDownloadableTestcase/${rid}`;
  export const DOWNLOAD_TESTCASE = (rid: number) =>
    `/fe/api/record/downloadTestcase/${rid}`;
}

declare module 'axios' {
  export interface AxiosRequestConfig<
    // eslint-disable-next-line
    D = any
  > {
    myInterceptors_cookie?: Cookie | null | undefined;
    myInterceptors_notCheckCookie?: boolean;
  }
}

export const axios = (() => {
  const axios = _.create({
    baseURL: API.baseURL,
    withCredentials: true,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      Referer: 'https://www.luogu.com.cn/'
    },
    proxy: false,
    timeout: 6000,
    beforeRedirect: (options, { headers, statusCode }) => {
      if (statusCode === 302 && headers.location === '/auth/login') {
        needLogin();
        throw new Error('未登录');
      }
    }
  });

  const defaults = axios.defaults;
  if (!defaults.transformRequest) {
    defaults.transformRequest = [];
  } else if (!(defaults.transformRequest instanceof Array)) {
    defaults.transformRequest = [defaults.transformRequest];
  }
  defaults.transformRequest.push((data, headers) => {
    headers['User-Agent'] = 'vscode-luogu@' + globalThis.luogu.version;
    return data;
  });

  axios.interceptors.request.use(async config => {
    if (config.method !== 'get' && config.headers['X-CSRF-Token'] === undefined)
      config.headers['X-CSRF-Token'] = await getCsrfTokenManager().getToken();
    return config;
  });
  axios.interceptors.request.use(async config => {
    if (config.myInterceptors_cookie === null) return config;
    if (config.myInterceptors_cookie === undefined)
      config.myInterceptors_cookie =
        await globalThis.luogu.authProvider.cookie();
    config.headers.cookie = cookieString(config.myInterceptors_cookie);
    return config;
  });
  axios.interceptors.response.use(
    res => {
      if (res.config.myInterceptors_notCheckCookie) return res;
      if (res.config.myInterceptors_cookie?.uid) {
        const get = praseCookie(res.headers['set-cookie']);
        if (
          get.uid !== undefined &&
          get.uid != res.config.myInterceptors_cookie.uid
        )
          throw Error('UnknownCookie');
      }
      return res;
    },
    async err => {
      if (!isAxiosError(err) || !err.response) throw err;
      if (
        err.response.data.errorMessage === '未登录' ||
        err.response.data.data?.errorType ===
          'LuoguWeb\\Spilopelia\\Exception\\UserUnloginException'
      ) {
        needLogin();
        throw new Error('未登录', { cause: err });
      }
      if (err.config?.myInterceptors_notCheckCookie) throw err;
      if (err.config?.myInterceptors_cookie?.uid) {
        const get = praseCookie(err.response.headers['set-cookie']);
        if (
          get.uid !== undefined &&
          get.uid != err.config.myInterceptors_cookie.uid
        ) {
          const sessions = await globalThis.luogu.authProvider.getSessions();
          if (sessions.length > 0) {
            globalThis.luogu.authProvider.removeSession(sessions[0].id);
            vscode.window
              .showErrorMessage('登录信息已经失效，请重新登录。', '登录')
              .then(async c => {
                if (c) vscode.commands.executeCommand('luogu.signin');
              });
          }
        }
      }
      throw err;
    }
  );
  axios.interceptors.request.use(config => {
    const url = new URL(config.url ?? '', config.baseURL);
    for (const [key, value] of Object.entries(config.params ?? {}))
      url.searchParams.set(key, String(value));
    if (url.searchParams.has('_contentOnly'))
      config.headers['x-lentille-request'] = 'content-only';
    return config;
  });

  return axios;
})();

export default axios;

export const genClientID = async function (): Promise<string> {
  const cookies = (
    await axios.get(API.CLIENT_ID, {
      myInterceptors_notCheckCookie: true,
      myInterceptors_cookie: null
    })
  ).headers['set-cookie'];
  if (!cookies) throw new Error('Cookie not found in header');
  const s = praseCookie(cookies).clientID;
  if (!s) throw new Error('Cookie not found in header');
  return s;
};

export const csrfToken = async (
  cookie?: Cookie,
  path: string = API.CSRF_TOKEN
) =>
  axios
    .get(path, {
      myInterceptors_cookie: cookie
    })
    .then(res => {
      const result = CSRF_TOKEN_REGEX.exec(res.data);
      if (result === null) throw new Error('CSRF Token not found');
      return result[1].trim();
    });

const getCsrfTokenManager = () =>
  (csrfTokenManager ??= new CsrfTokenManager({
    fetchToken: csrfToken,
    onDidChangeSessions: listener =>
      globalThis.luogu.authProvider.onDidChangeSessions(listener),
    reportError: error => {
      console.error(error);
      vscode.window.showErrorMessage('与洛谷服务器通讯不畅。');
    },
    sleep: milliseconds =>
      new Promise(resolve => setTimeout(resolve, milliseconds)),
    now: Date.now,
    setInterval,
    clearInterval
  }));

export const startCsrfTokenManager = (context: vscode.ExtensionContext) => {
  const manager = getCsrfTokenManager();
  manager.start();
  context.subscriptions.push(manager);
};

export const getProblemData = async (pid: string, cid?: number) =>
  axios
    .get<
      LentilleDataResponse<ProblemData>
    >(cid ? API.SEARCH_CONTESTPROBLEM(pid, cid.toString()) : API.SEARCH_PROBLEM(pid))
    .then(x => {
      return x.data.data;
    });

export const parseContestDataResponse = <T>(response: {
  data?: T;
  currentData?: T;
}): T => {
  const data = response.data ?? response.currentData;
  if (data === undefined || data === null) throw new Error('比赛不存在');
  return data;
};

export const searchContest = async (cid: number) =>
  axios
    .get<
      LentilleDataResponse<ContestData> | DataResponse<ContestData>
    >(API.CONTEST(cid))
    .then(res => parseContestDataResponse(res.data));

export const getSolution = async (pid: string, page: number) =>
  axios
    .get<LentilleDataResponse<SolutionsData>>(API.SEARCH_SOLUTION(pid, page))
    .then(res => res.data.data);
export const searchSolution = async (pid: string) =>
  axios
    .get<LentilleDataResponse<SolutionsData>>(API.SEARCH_SOLUTION(pid, 1))
    .then(res => res.data)
    .then(async resp => {
      if ((resp.data.solutions || null) === null) {
        throw new Error('题目不存在');
      }
      const problem = resp.data.problem;
      const res = resp.data.solutions;
      if (res.perPage === null) res.perPage = Infinity;
      const result = Object.values(res.result);
      const pages = Math.ceil(res.count / res.perPage);
      for (let i = 2; i <= pages; i++) {
        const currentPage = (await axios.get(API.SEARCH_SOLUTION(pid, i)))
          .data as LentilleDataResponse<SolutionsData>;
        if (currentPage.status == 200)
          result.push(...Object.values(currentPage.data.solutions.result));
        else throw new Error('未找到题解');
      }
      return {
        solutions: result,
        problem: problem
      };
    })
    .catch(err => {
      if (err.response) {
        throw err.response.data;
      } else if (err.request) {
        throw new Error('请求超时，请重试');
      } else {
        throw err;
      }
    });

export const searchTraininglist = async (
  type: string,
  keyword: string,
  page: number
) =>
  axios
    .get(API.SEARCHTRAINLIST(type, keyword, page))
    .then(res => {
      const d = res.data;
      return d.currentData ?? d.data;
    })
    .then(async res => {
      // console.log(res)
      if ((res || null) === null) {
        throw new Error('题单不存在');
      }
      return res;
    })
    .catch(err => {
      if (err.response) {
        throw err.response.data;
      } else if (err.request) {
        throw new Error('请求超时，请重试');
      } else {
        throw err;
      }
    });

export const searchTrainingdetail = async (id: number) =>
  axios
    .get(API.TRAINLISTDETAIL(id))
    .then(res => {
      const d = res.data;
      return d.currentData ?? d.data;
    })
    .then(async res => {
      // console.log(res)
      if ((res || null) === null) {
        throw new Error('题单不存在');
      }
      return res;
    })
    .catch(err => {
      if (err.response) {
        throw err.response.data;
      } else if (err.request) {
        throw new Error('请求超时，请重试');
      } else {
        throw err;
      }
    });

export const login = async (
  username: string,
  password: string,
  captcha: string,
  cookie?: Cookie
) => {
  if (username.match(/^1[0-9]{10}$/)) username = '+86' + username;
  return await axios
    .post<LoginResponse>(
      API.LOGIN_ENDPOINT,
      {
        username,
        password,
        captcha
      } satisfies LoginRequest,
      {
        myInterceptors_cookie: cookie,
        myInterceptors_notCheckCookie: true
      }
    )
    .then(x => {
      const cookies = praseCookie(x.headers['set-cookie']);
      return {
        ...x.data,
        uid: cookies.uid,
        clientID: cookies.clientID
      };
    });
};

export const joinContest = async (
  cid: number,
  body: { code?: string; unrated?: boolean }
) => axios.post(API.JOIN_CONTEST(cid), body).then(() => {});

export const unlock = async (
  code: string,
  type: 'totp' | 'mail',
  cookie?: Cookie
) => {
  return await axios
    .post<LoginResponse>(
      type === 'mail' ? API.UNLOCK_MAIL : API.UNLOCK_TOTP,
      {
        code
      },
      {
        headers: {
          'X-CSRF-Token': await csrfToken(cookie, API.AUTH_CSRF_TOKEN)
        },
        myInterceptors_cookie: cookie,
        myInterceptors_notCheckCookie: true
      }
    )
    .then(response => ({
      ...response.data,
      ...praseCookie(response.headers['set-cookie'])
    }));
};

export const getStatus = async () => {
  const session = await globalThis.luogu.authProvider.getSessions();
  if (session.length === 0) return UserStatus.SignedOut.toString();
  const status = await globalThis.luogu.authProvider
    .cookie()
    .then(x => (x.uid !== 0 ? checkCookie(x) : false));
  if (status) {
    return UserStatus.SignedIn.toString();
  } else {
    globalThis.luogu.authProvider.removeSession(session[0].id);
    vscode.window
      .showErrorMessage('登录信息已经失效，请重新登录。', '登录')
      .then(async c => {
        if (c) vscode.commands.executeCommand('luogu.signin');
      });
    return UserStatus.SignedOut.toString();
  }
};

export const sendMail2fa = async (captcha: string, cookie?: Cookie) =>
  axios.post(
    API.SEND_MAIL_2FA,
    { captcha },
    {
      params: { endpoint: 1 },
      myInterceptors_cookie: cookie,
      myInterceptors_notCheckCookie: true
    }
  );

export const fetchResult = async (rid: number) =>
  axios
    .get<DataResponse<RecordData>>(`/record/${rid}?_contentOnly=1`)
    .then(data => data?.data.currentData)
    .catch(err => {
      if (err.response) {
        throw err.response.data;
      } else if (err.request) {
        throw new Error('请求超时，请重试');
      } else {
        throw err;
      }
    });

export type DownloadedTestcase = {
  input: string;
  output: string;
};

export const queryDownloadableTestcase = async (rid: number) =>
  axios.get<unknown>(API.QUERY_DOWNLOADABLE_TESTCASE(rid)).then(({ data }) => {
    const testcaseId =
      typeof data === 'object' && data !== null && 'testcaseId' in data
        ? data.testcaseId
        : undefined;
    if (
      testcaseId !== null &&
      (typeof testcaseId !== 'number' ||
        !Number.isInteger(testcaseId) ||
        testcaseId < 0)
    )
      throw new Error('洛谷返回了无效的可下载测试点信息');
    return testcaseId;
  });

export const downloadTestcase = async (
  rid: number,
  testcaseId: number
): Promise<DownloadedTestcase> =>
  axios
    .post<unknown>(API.DOWNLOAD_TESTCASE(rid), { testcaseId })
    .then(({ data }) => {
      if (
        typeof data !== 'object' ||
        data === null ||
        !('status' in data) ||
        data.status !== 200 ||
        !('data' in data) ||
        typeof data.data !== 'object' ||
        data.data === null ||
        !('input' in data.data) ||
        typeof data.data.input !== 'string' ||
        !('output' in data.data) ||
        typeof data.data.output !== 'string'
      )
        throw new Error('洛谷返回了无效的测试点内容');
      return { input: data.data.input, output: data.data.output };
    });

export const fetch3kHomepage = async () =>
  axios
    .get(`/user/1?_contentOnly=1`)
    .then(data => data?.data)
    .catch(err => {
      if (err.response) {
        throw err.response.data;
      } else if (err.request) {
        throw new Error('请求超时，请重试');
      } else {
        throw err;
      }
    });
export const logout = async () =>
  axios.post<void>(API.LOGOUT, undefined, {
    myInterceptors_notCheckCookie: true,
    maxRedirects: 0,
    validateStatus: status => (200 <= status && status < 300) || status === 302
  });

export const getFate = async () =>
  axios
    .get(API.FATE)
    .then(data => data?.data)
    .catch(err => {
      if (err.response) {
        throw err.response.data;
      } else if (err.request) {
        throw new Error('请求超时，请重试');
      } else {
        throw err;
      }
    });

export const fetchRecords = async () =>
  axios
    .get<
      DataResponse<{ records: List<RecordBase> }>
    >(`/record/list?_contentOnly=1`, { params: { user: (await globalThis.luogu.authProvider.cookie()).uid } })
    .then(data => data.data.currentData.records);

export const searchUser = async (keyword: string, cookie?: Cookie) =>
  axios
    .get<{ users: [UserSummary | null] }>(
      `/api/user/search?keyword=${keyword}`,
      {
        myInterceptors_cookie: cookie
      }
    )
    .then(data => data?.data)
    .catch(err => {
      if (err.response) {
        throw err.response.data;
      } else if (err.request) {
        throw new Error('请求超时，请重试');
      } else {
        throw err;
      }
    });

export const fetchFollowedBenben = async (page: number) =>
  axios
    .get<{
      status: number;
      data: ActivityData[];
    }>(API.FOLLOWED_BENBEN(page))
    .then(data => data.data);

export const fetchUserBenben = async (page: number, user?: number) =>
  axios
    .get<{ feeds: List<Activity> }>(API.USER_BENBEN(page, user))
    .then(data => data.data);

export const postBenben = async (benbenText: string) =>
  axios
    .post<{ status: number; data: ActivityData }>(API.BENBEN_POST, {
      content: benbenText
    })
    .then(data => {
      return data.data.data;
    });

export const deleteBenben = async (id: number) =>
  axios
    .post<{ status: number; data: [] }>(API.BENBEN_DELETE(id), {})
    .then(data => data?.data)
    .catch(err => {
      if (err.response) {
        throw err.response.data;
      } else if (err.request) {
        throw new Error('请求超时，请重试');
      } else {
        throw err;
      }
    });

export const userIcon = async (uid: number) =>
  axios
    .get(`https://cdn.luogu.com.cn/upload/usericon/${uid}.png`, {
      responseType: 'arraybuffer'
    })
    .then(resp => (resp.data ? Buffer.from(resp.data, 'binary') : null))
    .catch(function (err) {
      console.error(err);
      return null;
    });

export const postVote = async (id: number, type: number) =>
  axios
    .post(`/api/blog/vote/${id}`, { Type: type })
    .then(data => data.data as { status: number; data: number | string })
    .catch(err => {
      throw err;
    });

export const voteArticle = async (lid: string, type: -1 | 0 | 1) =>
  axios
    .post<{
      voted: -1 | 0 | 1;
      upvotes: number;
    }>(API.VOTE_ARTICLE(lid), {}, { params: { vote: type } })
    .then(x => (console.debug(x), x.data));

export const resolveSubmissionProblem = (
  problem: { pid: string; cid?: number },
  monitoredContest?: number
) => ({
  ...problem,
  cid: problem.cid ?? monitoredContest
});

export const parseProblemID = (name: string) => {
  const regexs = [
    /^(AT_\w*)\./i,
    /^(CF[0-9]{1,4}[A-Z][0-9]{0,1})\./i,
    /^(SP[0-9]{1,5})\./i,
    /^(P[0-9]{4,5})\./i,
    /^(UVA[0-9]{1,5})\./i,
    /^(U[0-9]{1,6})\./i,
    /^(T[0-9]{1,6})\./i,
    /^(B[0-9]{4})\./i
  ];
  for (const regex of regexs) {
    const m = regex.exec(name);
    if (m !== null) {
      let ret = '';
      m.forEach(match => {
        ret = match;
      });
      if (ret !== '') {
        return ret;
      }
    }
  }
  return '';
};

export const getRanklist = async (cid: number, page: number) => {
  return axios
    .get<GetScoreboardResponse>(API.ranklist(cid, page))
    .then(res => res.data)
    .catch(err => {
      throw err;
    });
};

export const getErrorMessage = (err: unknown) => {
  if (err instanceof Error) return err.message;
  return String(err);
};

export async function submitCode(
  { pid, cid }: { pid: string; cid?: number },
  code: string,
  language: number = 0,
  enableO2: boolean = false,
  captcha?: string
) {
  const url =
    `/fe/api/problem/submit/${pid}` + (cid ? `?contestId=${cid}` : '');
  return axios
    .post<{ rid: number }>(url, {
      code: code,
      lang: language,
      enableO2: +enableO2,
      captcha
    })
    .then(res => res.data.rid)
    .catch(async e => {
      if (!isAxiosError(e) || e.response?.data?.errorMessage !== '验证码错误')
        throw e;
      const input = await askForCaptcha();
      if (input === undefined) throw new Error('已取消');
      return submitCode({ pid, cid }, code, language, enableO2, input);
    });
}
export async function checkCookie(oldCookie: Cookie) {
  const res = await axios.get(API.CLIENT_ID, {
    myInterceptors_notCheckCookie: true,
    myInterceptors_cookie: oldCookie
  });
  const newCookie = praseCookie(res.headers['set-cookie']);
  return (
    (newCookie.uid ?? oldCookie.uid) === oldCookie.uid &&
    (newCookie.clientID ?? oldCookie.clientID) === oldCookie.clientID
  );
}
export const getLoginCaptcha = async (c?: Cookie) =>
    axios
      .get(API.LOGIN_CAPTCHA_IMAGE, {
        responseType: 'arraybuffer',
        myInterceptors_cookie: c
      })
      .then(x => Buffer.from(x.data, 'binary')),
  getCaptcha = async (c?: Cookie) =>
    axios
      .get(API.CAPTCHA_IMAGE, {
        responseType: 'arraybuffer',
        myInterceptors_cookie: c
      })
      .then(x => Buffer.from(x.data, 'binary'));

export const listMyArticles = async (params: {
    type?: 'all' | 'promotion';
    page?: number;
  }) =>
    axios
      .get<LentilleDataResponse<ArticleListData>>(API.MYARTICLE, {
        params
      })
      .then(x => x.data),
  listMyAllArticles = async (type?: 'all' | 'promotion') =>
    listMyArticles({ type }).then(async res => [
      ...Object.values(res.data.articles.result),
      ...(
        await Promise.all(
          Array.from(
            {
              length:
                Math.ceil(
                  res.data.articles.count /
                    (res.data.articles.perPage || res.data.articles.count)
                ) - 1
            },
            (_, i) =>
              listMyArticles({ type, page: i + 2 }).then(x =>
                Object.values(x.data.articles.result)
              )
          )
        )
      ).flat()
    ]),
  deleteArticle = async (lid: string) =>
    axios.post<{ lid: string }>(API.DELETE_ARTICLE(lid), {}).then(x => x.data),
  editArticle = async (lid: string, data: EditArticleRequest) =>
    axios
      .post<{ article: ArticleDetails }>(API.EDIT_ARTICLE(lid), data)
      .then(x => x.data),
  getArticle = async (lid: string) =>
    axios
      .get<LentilleDataResponse<ArticleData>>(API.GET_ARTICLE(lid))
      .then(x => x.data),
  getEditableArticle = async (lid: string) =>
    axios
      .get<
        LentilleDataResponse<{ article: ArticleDetails; isAdmin: boolean }>
      >(API.EDITABLE_ARTICLE(lid))
      .then(x => {
        const article = x.data.data.article;
        if (article.content === undefined)
          throw new Error('可编辑文章响应缺少正文');
        return {
          ...x.data,
          data: {
            ...x.data.data,
            article: {
              ...article,
              content: article.content,
              top: article.top ?? 0
            } satisfies EditableArticle
          }
        };
      }),
  requestPromotion = async (lid: string) =>
    axios.post<void>(API.REQUEST_PROMOTION(lid)).then(x => x.data),
  withdrawPromotion = async (lid: string) =>
    axios.post<void>(API.WITHDRAW_PROMOTION(lid)).then(x => x.data),
  createArticle = async (data: EditArticleRequest) =>
    axios
      .post<{ article: ArticleDetails }>(API.CREATE_ARTICLE, data)
      .then(x => x.data.article);

interface TagData {
  id: number;
  name: string;
  type: number;
  parent: number | null;
}

interface TagType {
  id: number;
  type: string;
  name: string;
  color: string;
  order: number | null;
}

interface TagsResponse {
  tags: TagData[];
  types: TagType[];
  _locale: string;
  _version: string;
}

export const fetchLuoguTags = async (): Promise<TagsResponse> => {
  try {
    const res = await axios.get<TagsResponse>(
      'https://www.luogu.com.cn/_lfe/tags/zh-CN',
      {
        myInterceptors_notCheckCookie: true,
        myInterceptors_cookie: null
      }
    );
    return res.data;
  } catch (err) {
    throw new Error('获取标签数据失败', { cause: err });
  }
};
