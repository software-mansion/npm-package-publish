jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

const { execSync } = require('child_process');
const { getNextPatchVersion, getNextPreReleaseIndex, isNpmNotFoundError } = require('../npm-utils');

function makeNpmError({ message = 'Command failed: npm view pkg@latest version', stderr = '' } = {}) {
  const cause = Object.assign(new Error(message), {
    stderr: stderr ? Buffer.from(stderr) : undefined,
  });
  return new Error('Failed to get package version for pkg by tag: latest', { cause });
}

describe('npm-utils', () => {
  describe('isNpmNotFoundError', () => {
    test('returns true when stderr contains E404', () => {
      const error = makeNpmError({ stderr: 'npm error code E404\nnpm error 404 Not Found' });
      expect(isNpmNotFoundError(error)).toBe(true);
    });

    test('returns true when message contains E404 (Node.js includes stderr in message)', () => {
      const error = makeNpmError({ message: 'Command failed: npm view pkg@latest version\nnpm error code E404' });
      expect(isNpmNotFoundError(error)).toBe(true);
    });

    test('returns false when neither stderr nor message contains E404', () => {
      const error = makeNpmError({ message: 'Command failed: npm view pkg@latest version', stderr: 'npm error code ECONNRESET' });
      expect(isNpmNotFoundError(error)).toBe(false);
    });

    test('returns true when error has no cause but its own message contains E404', () => {
      const error = new Error('npm error code E404\nnpm error 404 Not Found');
      expect(isNpmNotFoundError(error)).toBe(true);
    });

    test('returns false when error has no cause', () => {
      expect(isNpmNotFoundError(new Error('no cause'))).toBe(false);
    });

    test('returns false when cause has no message and no stderr', () => {
      const cause = {};
      const error = Object.assign(new Error('wrapper'), { cause });
      expect(isNpmNotFoundError(error)).toBe(false);
    });
  });

  describe('getNextPatchVersion', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('returns 0 when no versions are published', () => {
      execSync.mockImplementation(() => { throw makeNpmError({ message: 'npm error code E404' }); });
      const result = getNextPatchVersion('package-name', 2, 22);
      expect(result).toBe(0);
    });

    test('returns 1 when only patch 0 is published', () => {
      execSync.mockReturnValue(Buffer.from('"2.22.0"'));
      const result = getNextPatchVersion('package-name', 2, 22);
      expect(result).toBe(1);
    });

    test('returns next patch when multiple versions are published in order', () => {
      execSync.mockReturnValue(Buffer.from('["2.22.0","2.22.1","2.22.2"]'));
      const result = getNextPatchVersion('package-name', 2, 22);
      expect(result).toBe(3);
    });

    test('returns correct next patch when versions are published out of order', () => {
      execSync.mockReturnValue(Buffer.from('["2.22.0","2.22.3","2.22.1","2.22.2"]'));
      const result = getNextPatchVersion('package-name', 2, 22);
      expect(result).toBe(4);
    });

    test('queries npm with the correct range for the given major and minor', () => {
      execSync.mockReturnValue(Buffer.from('"1.5.0"'));
      getNextPatchVersion('package-name', 1, 5);
      expect(execSync).toHaveBeenCalledWith(
        'npm view package-name@"1.5.x" version --json',
        expect.objectContaining({ timeout: 60000 })
      );
    });

    test('passes the package name through to the npm command', () => {
      execSync.mockReturnValue(Buffer.from('"3.0.0"'));
      getNextPatchVersion('my-scoped-package', 3, 0);
      expect(execSync).toHaveBeenCalledWith(
        'npm view my-scoped-package@"3.0.x" version --json',
        expect.anything()
      );
    });

    test('re-throws non-E404 errors', () => {
      const networkError = new Error('ECONNRESET');
      execSync.mockImplementation(() => { throw networkError; });
      expect(() => getNextPatchVersion('package-name', 2, 22)).toThrow('ECONNRESET');
    });
  });

  describe('getNextPreReleaseIndex', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('returns 1 when no versions are published', () => {
      execSync.mockImplementation(() => { throw makeNpmError({ message: 'npm error code E404' }); });
      const result = getNextPreReleaseIndex('package-name', '2.22.0', 'rc');
      expect(result).toBe(1);
    });

    test('returns 1 when range query returns no matching versions', () => {
      execSync.mockReturnValue(Buffer.from(JSON.stringify([])));
      const result = getNextPreReleaseIndex('package-name', '2.22.0', 'rc');
      expect(result).toBe(1);
    });

    test('returns next index when multiple versions already published', () => {
      execSync.mockReturnValue(Buffer.from(JSON.stringify(['2.22.0-rc.1', '2.22.0-rc.2'])));
      const result = getNextPreReleaseIndex('package-name', '2.22.0', 'rc');
      expect(result).toBe(3);
    });

    test('returns next index for single string response', () => {
      execSync.mockReturnValue(Buffer.from(JSON.stringify('2.22.0-beta.1')));
      const result = getNextPreReleaseIndex('package-name', '2.22.0', 'beta');
      expect(result).toBe(2);
    });

    test('filters out other release types returned by the range query', () => {
      execSync.mockReturnValue(Buffer.from(JSON.stringify([
        '2.22.0-beta.1',
        '2.22.0-beta.2',
        '2.22.0-nightly-20260101-abc123def',
        '2.22.0-rc.1',
      ])));
      const result = getNextPreReleaseIndex('package-name', '2.22.0', 'beta');
      expect(result).toBe(3);
    });

    test('queries npm with the correct range for the given base version and release type', () => {
      execSync.mockReturnValue(Buffer.from(JSON.stringify('2.22.0-rc.1')));
      getNextPreReleaseIndex('package-name', '2.22.0', 'rc');
      expect(execSync).toHaveBeenCalledWith(
        'npm view "package-name@>=2.22.0-rc.0 <2.22.0" version --json',
        expect.objectContaining({ timeout: 60000 })
      );
    });

    test('passes the package name through to the npm command', () => {
      execSync.mockReturnValue(Buffer.from(JSON.stringify('2.23.0-beta.1')));
      getNextPreReleaseIndex('my-scoped-package', '2.23.0', 'beta');
      expect(execSync).toHaveBeenCalledWith(
        'npm view "my-scoped-package@>=2.23.0-beta.0 <2.23.0" version --json',
        expect.anything()
      );
    });

    test('throws for an invalid release type', () => {
      expect(() => getNextPreReleaseIndex('package-name', '2.22.0', 'nightly'))
        .toThrow('Invalid pre-release type: nightly. Must be "beta" or "rc".');
    });

    test('throws for an empty release type', () => {
      expect(() => getNextPreReleaseIndex('package-name', '2.22.0', ''))
        .toThrow('Invalid pre-release type: . Must be "beta" or "rc".');
    });

    test('re-throws non-E404 errors', () => {
      const networkError = new Error('ECONNRESET');
      execSync.mockImplementation(() => { throw networkError; });
      expect(() => getNextPreReleaseIndex('package-name', '2.22.0', 'rc')).toThrow('ECONNRESET');
    });
  });
});
