import { describe, expect, it, vi } from 'vitest';
import { getRandomProblemPage, selectRandomProblem } from './randomProblem';

const problems = {
  count: 2,
  result: [{ pid: 'P1000' }, { pid: 'P1001' }]
};

describe('getRandomProblemPage', () => {
  it('selects across every available page', () => {
    expect(getRandomProblemPage(51, () => 0)).toBe(1);
    expect(getRandomProblemPage(51, () => 0.999)).toBe(2);
  });

  it('rejects filters with zero results', () => {
    expect(() => getRandomProblemPage(0, Math.random)).toThrow(
      '没有符合条件的题目'
    );
  });
});

describe('selectRandomProblem', () => {
  it('selects from the actual results returned for the random page', () => {
    const random = vi.fn(() => 0.999);

    expect(selectRandomProblem(problems.result, random)).toEqual({
      pid: 'P1001'
    });
    expect(random).toHaveBeenCalledOnce();
  });

  it('rejects an unexpectedly empty page', () => {
    expect(() => selectRandomProblem([], Math.random)).toThrow('题目列表为空');
  });
});
