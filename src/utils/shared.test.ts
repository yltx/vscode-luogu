import { describe, it, expect } from 'vitest';
import {
  difficultyColor,
  difficultyName,
  formatTime,
  getDifficulty,
  getScoreColor
} from './shared';

describe('getScoreColor', () => {
  it('returns red for scores below 30', () => {
    expect(getScoreColor(0)).toBe('rgb(231, 76, 60)');
    expect(getScoreColor(15)).toBe('rgb(231, 76, 60)');
    expect(getScoreColor(29)).toBe('rgb(231, 76, 60)');
  });

  it('returns orange for scores between 30 and 79', () => {
    expect(getScoreColor(30)).toBe('rgb(243, 156, 17)');
    expect(getScoreColor(50)).toBe('rgb(243, 156, 17)');
    expect(getScoreColor(79)).toBe('rgb(243, 156, 17)');
  });

  it('returns green for scores 80 and above', () => {
    expect(getScoreColor(80)).toBe('rgb(82, 196, 26)');
    expect(getScoreColor(100)).toBe('rgb(82, 196, 26)');
  });
});

describe('formatTime', () => {
  const fixedDate = new Date(2024, 0, 15, 14, 5, 9); // 2024-01-15 14:05:09

  it('formats with default pattern', () => {
    expect(formatTime(fixedDate)).toBe('2024-01-15 14:05:09');
  });

  it('formats year correctly', () => {
    expect(formatTime(fixedDate, 'yyyy')).toBe('2024');
    expect(formatTime(fixedDate, 'yy')).toBe('24');
  });

  it('formats month with padding', () => {
    expect(formatTime(fixedDate, 'MM')).toBe('01');
    expect(formatTime(fixedDate, 'M')).toBe('1');
  });

  it('formats day with padding', () => {
    expect(formatTime(fixedDate, 'dd')).toBe('15');
    expect(formatTime(fixedDate, 'd')).toBe('15');
  });

  it('formats hours with padding', () => {
    expect(formatTime(fixedDate, 'hh')).toBe('14');
    expect(formatTime(fixedDate, 'h')).toBe('14');
  });

  it('formats minutes with padding', () => {
    expect(formatTime(fixedDate, 'mm')).toBe('05');
    expect(formatTime(fixedDate, 'm')).toBe('5');
  });

  it('formats seconds with padding', () => {
    expect(formatTime(fixedDate, 'ss')).toBe('09');
    expect(formatTime(fixedDate, 's')).toBe('9');
  });

  it('accepts numeric timestamp', () => {
    const ts = fixedDate.getTime();
    expect(formatTime(ts, 'yyyy-MM-dd')).toBe('2024-01-15');
  });
});

describe('problem difficulty', () => {
  it('supports the current nine-level difficulty system', () => {
    expect(difficultyName).toEqual([
      '暂无评定',
      '入门',
      '普及-',
      '普及',
      '普及+/提高-',
      '提高',
      '提高+/省选-',
      '省选/NOI-',
      'NOI/NOI+/CTS'
    ]);
    expect(difficultyColor[5]).toBe('#13C2C2');
    expect(difficultyColor[8]).toBe('#0E1D69');
  });

  it('falls back safely for unknown difficulty IDs', () => {
    expect(getDifficulty(99)).toEqual({
      name: '未知难度 (99)',
      color: '#BFBFBF'
    });
  });
});
