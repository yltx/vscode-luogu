type ProblemSummary = { pid: string };

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
