import { describe, expect, it } from 'vitest';
import {
  getProblemListParams,
  normalizeProblemListFilters,
  parseProblemListResponse
} from './problemListData';

const problem = {
  pid: 'P1000',
  type: 'P',
  name: '超级玛丽游戏',
  difficulty: 1,
  tags: [2, 108],
  totalSubmit: 10,
  totalAccepted: 4,
  flag: 5
};
const problems = { perPage: 50, count: 1, result: [problem] };

describe('parseProblemListResponse', () => {
  it('reads current and legacy Lentille response envelopes', () => {
    expect(
      parseProblemListResponse({ status: 200, data: { problems } })
    ).toEqual(problems);
    expect(
      parseProblemListResponse({ code: 200, currentData: { problems } })
    ).toEqual(problems);
  });

  it('reports API errors without assuming an envelope', () => {
    expect(() =>
      parseProblemListResponse({
        status: 403,
        data: { errorMessage: '无权限' }
      })
    ).toThrow('无权限');
    expect(() => parseProblemListResponse({ status: 500 })).toThrow(
      '获取题目列表失败'
    );
  });

  it('rejects malformed list and item data', () => {
    expect(() => parseProblemListResponse({ status: 200, data: {} })).toThrow(
      '题目列表数据无效'
    );
    expect(() =>
      parseProblemListResponse({
        status: 200,
        data: {
          problems: { ...problems, result: [{ ...problem, tags: ['2'] }] }
        }
      })
    ).toThrow('题目列表数据无效');
  });
});

describe('problem list filters', () => {
  it('normalizes text, page, duplicate tags, and tag order', () => {
    expect(
      normalizeProblemListFilters({
        page: 0,
        keyword: '  dp  ',
        type: 'P',
        difficulty: 4,
        tags: [108, 2, 108]
      })
    ).toEqual({
      page: 1,
      keyword: 'dp',
      type: 'P',
      difficulty: 4,
      tags: [2, 108]
    });
  });

  it('uses the current Luogu query contract', () => {
    expect(
      getProblemListParams({
        page: 2,
        keyword: 'P1000',
        type: 'P',
        difficulty: 1,
        tags: [2, 108]
      })
    ).toEqual({
      page: 2,
      keyword: 'P1000',
      type: 'P',
      difficulty: 1,
      tag: '2,108',
      _contentOnly: 1
    });
  });

  it('omits optional difficulty and tag query parameters', () => {
    expect(
      getProblemListParams({
        page: 1,
        keyword: '',
        type: '',
        difficulty: null,
        tags: []
      })
    ).toEqual({ page: 1, keyword: '', type: '', _contentOnly: 1 });
  });

  it('omits difficulty zero because the API treats it as no filter', () => {
    expect(
      getProblemListParams({
        page: 1,
        keyword: '',
        type: '',
        difficulty: 0,
        tags: []
      })
    ).toEqual({ page: 1, keyword: '', type: '', _contentOnly: 1 });
  });
});
