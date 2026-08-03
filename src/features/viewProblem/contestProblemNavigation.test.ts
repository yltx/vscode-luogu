import type { ProblemData } from 'luogu-api';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getProblemData = vi.fn();
const processAxiosError = vi.fn(() => vi.fn());

vi.mock('@/utils/api', () => ({
  getProblemData,
  searchContest: vi.fn()
}));

vi.mock('@/utils/workspaceUtils', () => ({ processAxiosError }));

const { createContestProblemNavigationHandlers } = await import(
  './contestProblemNavigation'
);

const problemData = (pid: string): ProblemData =>
  ({
    problem: {
      pid,
      title: `Problem ${pid}`,
      content: { name: `Problem ${pid}` }
    },
    contest: { id: 1, name: 'Contest' }
  }) as ProblemData;

const deferred = <T>() => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

describe('contest problem navigation', () => {
  const addItem = vi.fn();

  beforeEach(() => {
    getProblemData.mockReset();
    processAxiosError.mockClear();
    addItem.mockReset();
    globalThis.luogu = {
      historyTreeviewProvider: { addItem }
    } as unknown as typeof globalThis.luogu;
  });

  it('keeps problem adoption single-flight while history is pending', async () => {
    const data = problemData('A');
    const nextData = problemData('B');
    const historyWrite = deferred<void>();
    const panel = { title: 'A Problem A' };
    getProblemData.mockResolvedValueOnce(nextData);
    addItem.mockReturnValueOnce(historyWrite.promise);
    const handlers = createContestProblemNavigationHandlers(
      panel as never,
      data
    );

    const openingB = handlers.openContestProblem({ pid: 'B' });
    await vi.waitFor(() => expect(addItem).toHaveBeenCalledOnce());

    expect(data.problem.pid).toBe('A');
    expect(panel.title).toBe('A Problem A');
    await expect(handlers.openContestProblem({ pid: 'C' })).resolves.toBeNull();
    expect(getProblemData).toHaveBeenCalledTimes(1);

    historyWrite.resolve();
    await expect(openingB).resolves.toBe(nextData);
    expect(data.problem.pid).toBe('B');
    expect(panel.title).toBe('B Problem B');
  });

  it('does not change shared state when history adoption fails', async () => {
    const data = problemData('A');
    const panel = { title: 'A Problem A' };
    const error = new Error('storage unavailable');
    getProblemData.mockResolvedValueOnce(problemData('B'));
    addItem.mockRejectedValueOnce(error);
    const handlers = createContestProblemNavigationHandlers(
      panel as never,
      data
    );

    await expect(handlers.openContestProblem({ pid: 'B' })).rejects.toBe(error);
    expect(data.problem.pid).toBe('A');
    expect(panel.title).toBe('A Problem A');
    expect(processAxiosError).toHaveBeenCalledWith('查找题目');
  });
});
