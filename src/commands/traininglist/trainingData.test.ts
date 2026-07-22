import { describe, expect, it } from 'vitest';
import {
  getAcceptedCount,
  getTrainingCategories,
  normalizeTrainingProblems
} from './trainingData';

describe('getTrainingCategories', () => {
  it('uses categories returned by the current Luogu API', () => {
    expect(
      getTrainingCategories({
        categories: [
          { key: 'srqc-jc', name: '深入浅出基础篇' },
          { key: 'contest.noip', name: 'CSP-J/S、NOIP' }
        ]
      })
    ).toEqual([
      { key: 'srqc-jc', name: '深入浅出基础篇' },
      { key: 'contest.noip', name: 'CSP-J/S、NOIP' },
      { key: 'select', name: '用户分享' }
    ]);
  });

  it('falls back to legacy channels', () => {
    expect(getTrainingCategories({})).toEqual([
      { key: 'official', name: '官方精选' },
      { key: 'select', name: '用户分享' }
    ]);
  });
});

describe('getAcceptedCount', () => {
  it('supports current and legacy progress fields', () => {
    expect(getAcceptedCount({ acceptedCounts: { 42: 3 } }, 42)).toBe(3);
    expect(getAcceptedCount({ acCounts: { 42: 2 } }, 42)).toBe(2);
  });

  it('uses zero when progress is unavailable', () => {
    expect(getAcceptedCount({ acCounts: [] }, 42)).toBe(0);
  });
});

describe('normalizeTrainingProblems', () => {
  it('supports current flat problem arrays', () => {
    const problem = { pid: 'P1001' };
    expect(normalizeTrainingProblems([problem])).toEqual([problem]);
  });

  it('keeps compatibility with legacy wrapped problems', () => {
    const problem = { pid: 'P1001' };
    expect(normalizeTrainingProblems([{ problem }])).toEqual([problem]);
  });
});
