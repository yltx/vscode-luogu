import { describe, expect, it } from 'vitest';
import { benbenModeRequiresLogin } from './benbenMode';

describe('benbenModeRequiresLogin', () => {
  it('requires login for followed and personal feeds', () => {
    expect(benbenModeRequiresLogin(1)).toBe(true);
    expect(benbenModeRequiresLogin(2)).toBe(true);
  });

  it('allows viewing a specified user without login', () => {
    expect(benbenModeRequiresLogin('12345')).toBe(false);
  });
});
