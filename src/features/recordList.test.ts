import { describe, expect, it } from 'vitest';
import { getLatestRecordId } from './recordList';

describe('getLatestRecordId', () => {
  it('returns undefined for an empty record list', () => {
    expect(getLatestRecordId({})).toBeUndefined();
  });

  it('returns the first record ID', () => {
    expect(getLatestRecordId({ 0: { id: 42 } as never })).toBe(42);
  });
});
