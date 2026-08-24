import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => ({ default: {} }));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).luogu = {
  waitinit: Promise.resolve(),
  version: '0.0.0-test',
  authProvider: {
    cookie: () => Promise.resolve({ uid: 0, clientID: 'test-client' }),
    getSessions: () => Promise.resolve([]),
    removeSession: () => {},
    onDidChangeSessions: () => ({ dispose: () => {} })
  }
};

const {
  API,
  parseContestDataResponse,
  parseProblemID,
  resolveSubmissionProblem,
  CSRF_TOKEN_REGEX,
  axios,
  queryDownloadableTestcase,
  downloadTestcase
} = await import('./api');

describe('CSRF_TOKEN_REGEX', () => {
  it('extracts CSRF token from meta tag', () => {
    const html = '<meta name="csrf-token" content="abc123">';
    const match = html.match(CSRF_TOKEN_REGEX);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('abc123');
  });

  it('returns null for missing token', () => {
    const html = '<meta name="other" content="abc123">';
    const match = html.match(CSRF_TOKEN_REGEX);
    expect(match).toBeNull();
  });
});

describe('CSRF request interceptor', () => {
  it('waits for token acquisition before dispatching a mutation', async () => {
    const requests: { url?: string; token?: unknown }[] = [];
    axios.defaults.adapter = async config => {
      requests.push({
        url: config.url,
        token: config.headers.get('X-CSRF-Token')
      });
      return {
        data:
          config.url === API.CSRF_TOKEN
            ? '<meta name="csrf-token" content="2000000000:test-token">'
            : { ok: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    };

    await axios.post('/test-mutation', {});

    expect(requests).toEqual([
      { url: API.CSRF_TOKEN, token: undefined },
      { url: '/test-mutation', token: '2000000000:test-token' }
    ]);
  });
});

describe('parseProblemID', () => {
  it('parses P-series problem IDs', () => {
    expect(parseProblemID('P1001.cpp')).toBe('P1001');
    expect(parseProblemID('P12345.cpp')).toBe('P12345');
  });

  it('parses CF problem IDs', () => {
    expect(parseProblemID('CF1234A.cpp')).toBe('CF1234A');
    expect(parseProblemID('CF123A1.cpp')).toBe('CF123A1');
  });

  it('parses AT problem IDs', () => {
    expect(parseProblemID('AT_abc001_a.cpp')).toBe('AT_abc001_a');
  });

  it('parses SP problem IDs', () => {
    expect(parseProblemID('SP123.cpp')).toBe('SP123');
  });

  it('parses UVA problem IDs', () => {
    expect(parseProblemID('UVA123.cpp')).toBe('UVA123');
  });

  it('parses U problem IDs', () => {
    expect(parseProblemID('U123456.cpp')).toBe('U123456');
  });

  it('parses T problem IDs', () => {
    expect(parseProblemID('T123456.cpp')).toBe('T123456');
  });

  it('parses B problem IDs', () => {
    expect(parseProblemID('B1234.cpp')).toBe('B1234');
  });

  it('returns empty string for unrecognized patterns', () => {
    expect(parseProblemID('main.cpp')).toBe('');
    expect(parseProblemID('solution.py')).toBe('');
    expect(parseProblemID('test')).toBe('');
  });

  it('is case insensitive for AT and CF', () => {
    expect(parseProblemID('at_abc001.cpp')).toBe('at_abc001');
    expect(parseProblemID('cf1234a.cpp')).toBe('cf1234a');
  });
});

describe('API routes', () => {
  it('uses current article and contest mutation routes', () => {
    expect(API.CREATE_ARTICLE).toBe('/article/_newSubmit');
    expect(API.EDIT_ARTICLE('abc')).toBe('/article/abc/editSubmit');
    expect(API.EDITABLE_ARTICLE('abc')).toBe(
      '/article/abc/edit?_contentOnly=1'
    );
    expect(API.DELETE_ARTICLE('abc')).toBe('/article/abc/delete');
    expect(API.VOTE_ARTICLE('abc')).toBe('/article/abc/vote');
    expect(API.JOIN_CONTEST(42)).toBe('/contest/42/join');
    expect(API.AUTH_CSRF_TOKEN).toBe('/auth/login');
    expect(API.QUERY_DOWNLOADABLE_TESTCASE(123)).toBe(
      '/fe/api/record/queryDownloadableTestcase/123'
    );
    expect(API.DOWNLOAD_TESTCASE(123)).toBe(
      '/fe/api/record/downloadTestcase/123'
    );
  });
});

describe('record testcase downloads', () => {
  it('queries the downloadable testcase ID', async () => {
    axios.defaults.adapter = async config => ({
      data: { testcaseId: 4 },
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    });

    await expect(queryDownloadableTestcase(123)).resolves.toBe(4);
  });

  it('accepts a record without a downloadable testcase', async () => {
    axios.defaults.adapter = async config => ({
      data: { testcaseId: null },
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    });

    await expect(queryDownloadableTestcase(123)).resolves.toBeNull();
  });

  it('rejects malformed availability responses', async () => {
    axios.defaults.adapter = async config => ({
      data: { testcaseId: '4' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    });

    await expect(queryDownloadableTestcase(123)).rejects.toThrow(
      '无效的可下载测试点信息'
    );
  });

  it('downloads testcase input and output using the documented payload', async () => {
    let requestData: unknown;
    axios.defaults.adapter = async config => {
      requestData = JSON.parse(config.data);
      return {
        data: { status: 200, data: { input: '1 2\n', output: '3\n' } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config
      };
    };

    await expect(downloadTestcase(123, 4)).resolves.toEqual({
      input: '1 2\n',
      output: '3\n'
    });
    expect(requestData).toEqual({ testcaseId: 4 });
  });

  it('rejects malformed testcase content', async () => {
    axios.defaults.adapter = async config => ({
      data: { status: 200, data: { input: '1 2\n' } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    });

    await expect(downloadTestcase(123, 4)).rejects.toThrow('无效的测试点内容');
  });

  it('rejects non-success testcase response statuses', async () => {
    axios.defaults.adapter = async config => ({
      data: { status: 403, data: { input: 'hidden', output: 'hidden' } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    });

    await expect(downloadTestcase(123, 4)).rejects.toThrow('无效的测试点内容');
  });
});

describe('parseContestDataResponse', () => {
  const contest = { contest: { id: 42 } };

  it('reads current Lentille responses', () => {
    expect(parseContestDataResponse({ data: contest })).toBe(contest);
  });

  it('keeps compatibility with legacy responses', () => {
    expect(parseContestDataResponse({ currentData: contest })).toBe(contest);
  });

  it('rejects responses without contest data', () => {
    expect(() => parseContestDataResponse({})).toThrow('比赛不存在');
  });
});

describe('resolveSubmissionProblem', () => {
  it('uses contest mode for plain problem submissions', () => {
    expect(resolveSubmissionProblem({ pid: 'P1001' }, 42)).toEqual({
      pid: 'P1001',
      cid: 42
    });
  });

  it('keeps an explicit contest ID', () => {
    expect(resolveSubmissionProblem({ pid: 'P1001', cid: 7 }, 42)).toEqual({
      pid: 'P1001',
      cid: 7
    });
  });
});
