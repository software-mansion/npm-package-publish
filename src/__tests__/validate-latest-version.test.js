jest.mock('../npm-utils', () => ({
  getPackageVersionByTag: jest.fn(),
  isNpmNotFoundError: jest.fn(),
}));

const { getPackageVersionByTag, isNpmNotFoundError } = require('../npm-utils');
const { validateLatestVersion } = require('../validate-latest-version');

describe('validate-latest-version', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateLatestVersion', () => {
    // Pre-release tests - should throw
    test('throws error for rc pre-release version', () => {
      getPackageVersionByTag.mockReturnValue('2.22.0');
      expect(() => validateLatestVersion('package-name', '2.22.1-rc.1')).toThrow(
        'Pre-release version 2.22.1-rc.1 cannot be the latest version'
      );
    });

    test('throws error for beta pre-release version', () => {
      getPackageVersionByTag.mockReturnValue('2.22.0');
      expect(() => validateLatestVersion('package-name', '2.22.1-beta.1')).toThrow(
        'Pre-release version 2.22.1-beta.1 cannot be the latest version'
      );
    });

    test('throws error for nightly version', () => {
      getPackageVersionByTag.mockReturnValue('2.22.0');
      expect(() => validateLatestVersion('package-name', '2.23.0-nightly-20260129-abc123def')).toThrow(
        'Pre-release version 2.23.0-nightly-20260129-abc123def cannot be the latest version'
      );
    });

    // Major version tests
    test('throws error when new major is less than current', () => {
      getPackageVersionByTag.mockReturnValue('2.22.0');
      expect(() => validateLatestVersion('package-name', '1.0.0')).toThrow(
        'New major version 1 is less than latest major version 2'
      );
    });

    // Valid patch version tests
    test('returns true for next patch version', () => {
      getPackageVersionByTag.mockReturnValue('2.22.0');
      const result = validateLatestVersion('package-name', '2.22.1');
      expect(result).toBe(true);
    });

    test('returns true for next patch after higher patch', () => {
      getPackageVersionByTag.mockReturnValue('2.22.5');
      const result = validateLatestVersion('package-name', '2.22.6');
      expect(result).toBe(true);
    });

    // Invalid patch version tests
    test('throws error for skipped patch version', () => {
      getPackageVersionByTag.mockReturnValue('2.22.0');
      expect(() => validateLatestVersion('package-name', '2.22.2')).toThrow(
        'Version 2.22.2 is not a valid latest version based on latest published version 2.22.0'
      );
    });

    test('throws error for same patch version', () => {
      getPackageVersionByTag.mockReturnValue('2.22.0');
      expect(() => validateLatestVersion('package-name', '2.22.0')).toThrow(
        'Version 2.22.0 is not a valid latest version based on latest published version 2.22.0'
      );
    });

    test('throws error for previous patch version', () => {
      getPackageVersionByTag.mockReturnValue('2.22.5');
      expect(() => validateLatestVersion('package-name', '2.22.4')).toThrow(
        'Version 2.22.4 is not a valid latest version based on latest published version 2.22.5'
      );
    });

    // Valid minor version tests
    test('returns true for next minor version with patch 0', () => {
      getPackageVersionByTag.mockReturnValue('2.22.0');
      const result = validateLatestVersion('package-name', '2.23.0');
      expect(result).toBe(true);
    });

    test('returns true for next minor after higher patch', () => {
      getPackageVersionByTag.mockReturnValue('2.22.5');
      const result = validateLatestVersion('package-name', '2.23.0');
      expect(result).toBe(true);
    });

    // Invalid minor version tests
    test('throws error for next minor with non-zero patch', () => {
      getPackageVersionByTag.mockReturnValue('2.22.0');
      expect(() => validateLatestVersion('package-name', '2.23.1')).toThrow(
        'Version 2.23.1 is not a valid latest version based on latest published version 2.22.0'
      );
    });

    test('throws error for skipped minor version', () => {
      getPackageVersionByTag.mockReturnValue('2.22.0');
      expect(() => validateLatestVersion('package-name', '2.24.0')).toThrow(
        'Version 2.24.0 is not a valid latest version based on latest published version 2.22.0'
      );
    });

    test('throws error for previous minor version', () => {
      getPackageVersionByTag.mockReturnValue('2.22.0');
      expect(() => validateLatestVersion('package-name', '2.21.0')).toThrow(
        'Version 2.21.0 is not a valid latest version based on latest published version 2.22.0'
      );
    });

    test('throws error for same minor with lower patch', () => {
      getPackageVersionByTag.mockReturnValue('2.22.5');
      expect(() => validateLatestVersion('package-name', '2.22.3')).toThrow(
        'Version 2.22.3 is not a valid latest version based on latest published version 2.22.5'
      );
    });

    // Edge cases
    test('returns true for minor bump from patch 0', () => {
      getPackageVersionByTag.mockReturnValue('2.22.0');
      const result = validateLatestVersion('package-name', '2.23.0');
      expect(result).toBe(true);
    });

    test('throws error for minor bump with patch 1', () => {
      getPackageVersionByTag.mockReturnValue('2.22.0');
      expect(() => validateLatestVersion('package-name', '2.23.1')).toThrow(
        'Version 2.23.1 is not a valid latest version based on latest published version 2.22.0'
      );
    });

    test('returns true when the error is a package-not-found error (first publish)', () => {
      const error = new Error('Package not found');
      getPackageVersionByTag.mockImplementation(() => { throw error; });
      isNpmNotFoundError.mockReturnValue(true);
      expect(validateLatestVersion('new-package', '1.0.0')).toBe(true);
    });

    test('re-throws errors that are not package-not-found', () => {
      const error = new Error('network timeout');
      getPackageVersionByTag.mockImplementation(() => { throw error; });
      isNpmNotFoundError.mockReturnValue(false);
      expect(() => validateLatestVersion('new-package', '1.0.0')).toThrow('network timeout');
    });

    test('still rejects pre-release versions even when no latest tag exists', () => {
      // The pre-release check runs before the npm call, so getPackageVersionByTag is never reached.
      expect(() => validateLatestVersion('new-package', '1.0.0-beta.1')).toThrow(
        'Pre-release version 1.0.0-beta.1 cannot be the latest version'
      );
    });
  });
});
