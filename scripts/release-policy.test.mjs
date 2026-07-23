import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getReleaseChannel,
  isPrereleaseVersion,
  validateRelease
} from './release-policy.mjs';

test('accepts an even minor as a stable release', () => {
  assert.equal(getReleaseChannel('4.14.0', false), 'stable');
});

test('accepts an odd minor as a pre-release', () => {
  assert.equal(getReleaseChannel('4.15.0', true), 'pre-release');
});

test('derives the release channel from minor parity', () => {
  assert.equal(isPrereleaseVersion('4.14.0'), false);
  assert.equal(isPrereleaseVersion('4.15.0'), true);
});

test('rejects a pre-release published from an even minor', () => {
  assert.throws(
    () => getReleaseChannel('4.14.0', true),
    /预发布版本必须使用奇数 minor/
  );
});

test('rejects a stable release published from an odd minor', () => {
  assert.throws(
    () => getReleaseChannel('4.15.0', false),
    /正式版本必须使用偶数 minor/
  );
});

test('requires package, lockfile and tag versions to match', () => {
  assert.throws(
    () =>
      validateRelease({
        version: '4.15.0',
        lockVersion: '4.14.0',
        tag: 'v4.15.0',
        prerelease: true
      }),
    /版本不一致/
  );
  assert.throws(
    () =>
      validateRelease({
        version: '4.15.0',
        lockVersion: '4.15.0',
        tag: 'v4.15.1',
        prerelease: true
      }),
    /必须与 package 版本/
  );
});

test('returns the Marketplace flag only for pre-releases', () => {
  assert.deepEqual(
    validateRelease({
      version: '4.15.0',
      lockVersion: '4.15.0',
      tag: 'v4.15.0',
      prerelease: true
    }),
    { channel: 'pre-release', vsceFlag: '--pre-release' }
  );
  assert.deepEqual(
    validateRelease({
      version: '4.14.0',
      lockVersion: '4.14.0',
      tag: 'v4.14.0',
      prerelease: false
    }),
    { channel: 'stable', vsceFlag: '' }
  );
});
