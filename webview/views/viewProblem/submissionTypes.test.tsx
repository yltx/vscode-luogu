import { describe, expect, it } from 'vitest';
import {
  resolveDisplayedSubmissionLanguage,
  type ProblemSubmissionContext
} from './submissionTypes';

const context = (
  languages: string[],
  defaultLanguage?: string
): ProblemSubmissionContext => ({
  languages: languages.map((label, id) => ({ label, id })),
  defaultLanguage
});

describe('displayed submission language', () => {
  it('keeps the current language when the new file supports it', () => {
    expect(
      resolveDisplayedSubmissionLanguage(
        context(['C++17', 'C++20'], 'C++17'),
        'C++20'
      )
    ).toBe('C++20');
  });

  it('uses the new file default when the current language is invalid', () => {
    expect(
      resolveDisplayedSubmissionLanguage(
        context(['Python 3'], 'Python 3'),
        'C++17'
      )
    ).toBe('Python 3');
  });

  it('falls back to the first available language or an empty value', () => {
    expect(resolveDisplayedSubmissionLanguage(context(['Rust']), 'C++17')).toBe(
      'Rust'
    );
    expect(resolveDisplayedSubmissionLanguage(context([]), 'C++17')).toBe('');
  });
});
