import type {
  ProblemList,
  ProblemListFilters,
  ProblemListItem,
  ProblemListResponse
} from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isNonnegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;
const isPositiveInteger = (value: unknown): value is number =>
  isNonnegativeInteger(value) && value > 0;

const parseProblemListItem = (value: unknown): ProblemListItem => {
  if (
    !isRecord(value) ||
    typeof value.pid !== 'string' ||
    typeof value.type !== 'string' ||
    typeof value.name !== 'string' ||
    !isNonnegativeInteger(value.difficulty) ||
    !Array.isArray(value.tags) ||
    !value.tags.every(isNonnegativeInteger) ||
    !isNonnegativeInteger(value.totalSubmit) ||
    !isNonnegativeInteger(value.totalAccepted) ||
    !isNonnegativeInteger(value.flag)
  ) {
    throw new Error('题目列表数据无效');
  }

  return {
    pid: value.pid,
    type: value.type,
    name: value.name,
    difficulty: value.difficulty,
    tags: value.tags,
    totalSubmit: value.totalSubmit,
    totalAccepted: value.totalAccepted,
    flag: value.flag
  };
};

export const parseProblemListResponse = (
  response: ProblemListResponse
): ProblemList => {
  const status = response.status ?? response.code;
  const data = response.data ?? response.currentData;

  if (status !== 200) {
    throw new Error(
      data?.errorMessage ?? response.errorMessage ?? '获取题目列表失败'
    );
  }
  if (!isRecord(data?.problems)) throw new Error('题目列表数据无效');

  const { perPage, count, result } = data.problems;
  if (
    !isPositiveInteger(perPage) ||
    !isNonnegativeInteger(count) ||
    !Array.isArray(result)
  ) {
    throw new Error('题目列表数据无效');
  }

  return {
    perPage,
    count,
    result: result.map(parseProblemListItem)
  };
};

export const normalizeProblemListFilters = (
  filters: ProblemListFilters
): ProblemListFilters => ({
  page: Math.max(1, Math.floor(filters.page)),
  keyword: filters.keyword.trim(),
  type: filters.type,
  difficulty: filters.difficulty,
  tags: [...new Set(filters.tags)].sort((a, b) => a - b)
});

export const getProblemListParams = (filters: ProblemListFilters) => {
  const normalized = normalizeProblemListFilters(filters);
  return {
    page: normalized.page,
    keyword: normalized.keyword,
    type: normalized.type,
    ...(normalized.difficulty === null || normalized.difficulty === 0
      ? {}
      : { difficulty: normalized.difficulty }),
    ...(normalized.tags.length === 0 ? {} : { tag: normalized.tags.join(',') }),
    _contentOnly: 1
  };
};
