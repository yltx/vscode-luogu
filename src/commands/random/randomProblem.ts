type ProblemSummary = { pid: string };

type ProblemList = {
  count: number;
  result: ProblemSummary[];
};

type ProblemListData = {
  errorMessage?: string;
  problems?: ProblemList;
};

type ProblemListResponse = {
  status?: number;
  code?: number;
  data?: ProblemListData;
  currentData?: ProblemListData;
  errorMessage?: string;
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
  if (
    !data?.problems ||
    !Number.isFinite(data.problems.count) ||
    !Array.isArray(data.problems.result)
  ) {
    throw new Error('题目列表数据无效');
  }

  return data.problems;
};

export const getRandomProblemPage = (
  problemCount: number,
  random: () => number = Math.random
) => {
  if (problemCount <= 0) throw new Error('没有符合条件的题目');
  return Math.floor(random() * Math.ceil(problemCount / 50)) + 1;
};

export const selectRandomProblem = (
  problems: ProblemSummary[],
  random: () => number = Math.random
) => {
  if (problems.length === 0) throw new Error('题目列表为空');
  return problems[Math.floor(random() * problems.length)];
};
