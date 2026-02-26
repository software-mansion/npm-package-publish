jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

const { execSync } = require('child_process');
const { getNextPatchVersion } = require('../npm-utils');

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
});
