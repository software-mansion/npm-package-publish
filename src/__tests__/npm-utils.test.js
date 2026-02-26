jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

const { execSync } = require('child_process');
const { getNextPatchVersion, getNextPreReleaseIndex } = require('../npm-utils');

describe('npm-utils', () => {
  describe('getNextPatchVersion', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('returns 0 when no versions are published', () => {
      execSync.mockImplementation(() => { throw new Error('Not found'); });
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
  });

  describe('getNextPreReleaseIndex', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('returns 1 when no versions are published', () => {
      execSync.mockImplementation(() => { throw new Error('Not found'); });
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
  });
});
