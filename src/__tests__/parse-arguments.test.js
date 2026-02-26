const { parseArguments, ReleaseType } = require('../parse-arguments');

describe('parse-arguments', () => {
  const originalArgv = process.argv;

  beforeEach(() => {
    // Reset process.argv before each test
    process.argv = ['node', 'script.js'];
  });

  afterAll(() => {
    process.argv = originalArgv;
  });

  describe('parseArguments', () => {
    // Default behavior (stable release)
    test('returns stable release type with no arguments', () => {
      process.argv = ['node', 'script.js', '--package-name', 'test-package', '--package-json-path', './package.json'];
      const result = parseArguments();
      expect(result).toEqual({ releaseType: ReleaseType.STABLE, version: null, packageName: 'test-package', packageJsonPath: './package.json' });
    });

    test('returns stable release type with --version flag', () => {
      process.argv = ['node', 'script.js', '--version', '2.22.0', '--package-name', 'test-package', '--package-json-path', './package.json'];
      const result = parseArguments();
      expect(result).toEqual({ releaseType: ReleaseType.STABLE, version: '2.22.0', packageName: 'test-package', packageJsonPath: './package.json' });
    });

    // Single flag tests
    test('returns nightly release type with --nightly flag', () => {
      process.argv = ['node', 'script.js', '--nightly', '--package-name', 'test-package', '--package-json-path', './package.json'];
      const result = parseArguments();
      expect(result).toEqual({ releaseType: ReleaseType.NIGHTLY, version: null, packageName: 'test-package', packageJsonPath: './package.json' });
    });

    test('returns beta release type with --beta flag', () => {
      process.argv = ['node', 'script.js', '--beta', '--package-name', 'test-package', '--package-json-path', './package.json'];
      const result = parseArguments();
      expect(result).toEqual({ releaseType: ReleaseType.BETA, version: null, packageName: 'test-package', packageJsonPath: './package.json' });
    });

    test('returns rc release type with --rc flag', () => {
      process.argv = ['node', 'script.js', '--rc', '--package-name', 'test-package', '--package-json-path', './package.json'];
      const result = parseArguments();
      expect(result).toEqual({ releaseType: ReleaseType.RELEASE_CANDIDATE, version: null, packageName: 'test-package', packageJsonPath: './package.json' });
    });

    // Version with pre-release flags
    test('returns beta with version when both provided', () => {
      process.argv = ['node', 'script.js', '--beta', '--version', '2.22.0', '--package-name', 'test-package', '--package-json-path', './package.json'];
      const result = parseArguments();
      expect(result).toEqual({ releaseType: ReleaseType.BETA, version: '2.22.0', packageName: 'test-package', packageJsonPath: './package.json' });
    });

    test('returns rc with version when both provided', () => {
      process.argv = ['node', 'script.js', '--rc', '--version', '2.22.0', '--package-name', 'test-package', '--package-json-path', './package.json'];
      const result = parseArguments();
      expect(result).toEqual({ releaseType: ReleaseType.RELEASE_CANDIDATE, version: '2.22.0', packageName: 'test-package', packageJsonPath: './package.json' });
    });

    test('handles version flag before release type flag', () => {
      process.argv = ['node', 'script.js', '--version', '2.22.0', '--rc', '--package-name', 'test-package', '--package-json-path', './package.json'];
      const result = parseArguments();
      expect(result).toEqual({ releaseType: ReleaseType.RELEASE_CANDIDATE, version: '2.22.0', packageName: 'test-package', packageJsonPath: './package.json' });
    });

    // Mutual exclusivity tests
    test('throws error when --nightly and --beta are both provided', () => {
      process.argv = ['node', 'script.js', '--nightly', '--beta', '--package-name', 'package-name'];
      expect(() => parseArguments()).toThrow('Release flags --nightly, --beta, and --rc are mutually exclusive');
    });

    test('throws error when --nightly and --rc are both provided', () => {
      process.argv = ['node', 'script.js', '--nightly', '--rc', '--package-name', 'package-name'];
      expect(() => parseArguments()).toThrow('Release flags --nightly, --beta, and --rc are mutually exclusive');
    });

    test('throws error when --beta and --rc are both provided', () => {
      process.argv = ['node', 'script.js', '--beta', '--rc', '--package-name', 'package-name'];
      expect(() => parseArguments()).toThrow('Release flags --nightly, --beta, and --rc are mutually exclusive');
    });

    test('throws error when all three flags are provided', () => {
      process.argv = ['node', 'script.js', '--nightly', '--beta', '--rc', '--package-name', 'package-name'];
      expect(() => parseArguments()).toThrow('Release flags --nightly, --beta, and --rc are mutually exclusive');
    });

    // Version allowed for nightly
    test('returns nightly with version when both --nightly and --version are provided', () => {
      process.argv = ['node', 'script.js', '--nightly', '--version', '4.0.0', '--package-name', 'package-name', '--package-json-path', './package.json'];
      const result = parseArguments();
      expect(result).toEqual({ releaseType: ReleaseType.NIGHTLY, version: '4.0.0', packageName: 'package-name', packageJsonPath: './package.json' });
    });

    // Version format validation
    test('throws error for invalid version format - missing patch', () => {
      process.argv = ['node', 'script.js', '--rc', '--version', '2.22', '--package-name', 'package-name'];
      expect(() => parseArguments()).toThrow('Provided version "2.22" is not valid. Expected format: x.y.z');
    });

    test('throws error for invalid version format - letters', () => {
      process.argv = ['node', 'script.js', '--rc', '--version', '2.22.a', '--package-name', 'package-name'];
      expect(() => parseArguments()).toThrow('Provided version "2.22.a" is not valid. Expected format: x.y.z');
    });

    test('throws error for invalid version format - extra parts', () => {
      process.argv = ['node', 'script.js', '--rc', '--version', '2.22.0.1', '--package-name', 'package-name'];
      expect(() => parseArguments()).toThrow('Provided version "2.22.0.1" is not valid. Expected format: x.y.z');
    });

    test('throws error for invalid version format - pre-release suffix', () => {
      process.argv = ['node', 'script.js', '--rc', '--version', '2.22.0-rc.1', '--package-name', 'package-name'];
      expect(() => parseArguments()).toThrow('Provided version "2.22.0-rc.1" is not valid. Expected format: x.y.z');
    });

    test('throws error for invalid version format - empty string', () => {
      process.argv = ['node', 'script.js', '--rc', '--version', '', '--package-name', 'package-name'];
      expect(() => parseArguments()).toThrow('Provided version "" is not valid. Expected format: x.y.z');
    });

    // Missing version value
    test('throws error when --version is last argument without value', () => {
      process.argv = ['node', 'script.js', '--rc', '--package-name', 'package-name', '--version'];
      expect(() => parseArguments()).toThrow('Expected a version after --version');
    });

    // Valid version formats
    test('accepts version with single digit numbers', () => {
      process.argv = ['node', 'script.js', '--rc', '--version', '1.2.3', '--package-name', 'package-name', '--package-json-path', './package.json'];
      const result = parseArguments();
      expect(result.version).toBe('1.2.3');
    });

    test('accepts version with large numbers', () => {
      process.argv = ['node', 'script.js', '--rc', '--version', '10.100.1000', '--package-name', 'package-name', '--package-json-path', './package.json'];
      const result = parseArguments();
      expect(result.version).toBe('10.100.1000');
    });

    test('accepts version with zeros', () => {
      process.argv = ['node', 'script.js', '--rc', '--version', '0.0.0', '--package-name', 'package-name', '--package-json-path', './package.json'];
      const result = parseArguments();
      expect(result.version).toBe('0.0.0');
    });
  });

  describe('--package-name argument', () => {
    test('parses --package-name value', () => {
      process.argv = ['node', 'script.js', '--package-name', 'my-package', '--package-json-path', './package.json'];
      const result = parseArguments();
      expect(result.packageName).toBe('my-package');
    });

    test('throws when --package-name is not provided', () => {
      process.argv = ['node', 'script.js', '--package-json-path', './package.json'];
      expect(() => parseArguments()).toThrow('Missing required argument: --package-name');
    });

    test('parses --package-name alongside release type and version flags', () => {
      process.argv = ['node', 'script.js', '--rc', '--version', '1.2.3', '--package-name', 'my-package', '--package-json-path', './package.json'];
      const result = parseArguments();
      expect(result).toEqual({
        releaseType: ReleaseType.RELEASE_CANDIDATE,
        version: '1.2.3',
        packageName: 'my-package',
        packageJsonPath: './package.json',
      });
    });

    test('throws error when --package-name is last argument without value', () => {
      process.argv = ['node', 'script.js', '--package-name'];
      expect(() => parseArguments()).toThrow('Expected a package name after --package-name');
    });
  });

  describe('--package-json-path argument', () => {
    test('parses --package-json-path value', () => {
      process.argv = ['node', 'script.js', '--package-name', 'my-package', '--package-json-path', './packages/my-package/package.json'];
      const result = parseArguments();
      expect(result.packageJsonPath).toBe('./packages/my-package/package.json');
    });

    test('throws when --package-json-path is not provided', () => {
      process.argv = ['node', 'script.js', '--package-name', 'my-package'];
      expect(() => parseArguments()).toThrow('Missing required argument: --package-json-path');
    });

    test('parses --package-json-path alongside release type and version flags', () => {
      process.argv = ['node', 'script.js', '--beta', '--version', '1.2.3', '--package-name', 'my-package', '--package-json-path', './package.json'];
      const result = parseArguments();
      expect(result).toEqual({
        releaseType: ReleaseType.BETA,
        version: '1.2.3',
        packageName: 'my-package',
        packageJsonPath: './package.json',
      });
    });

    test('throws error when --package-json-path is last argument without value', () => {
      process.argv = ['node', 'script.js', '--package-json-path'];
      expect(() => parseArguments()).toThrow('Expected a package JSON path after --package-json-path');
    });
  });

  describe('--package-name and --package-json-path combined', () => {
    test('parses both --package-name and --package-json-path together', () => {
      process.argv = [
        'node', 'script.js',
        '--package-name', 'my-package',
        '--package-json-path', './packages/my-package/package.json',
      ];
      const result = parseArguments();
      expect(result).toEqual({
        releaseType: ReleaseType.STABLE,
        version: null,
        packageName: 'my-package',
        packageJsonPath: './packages/my-package/package.json',
      });
    });

    test('parses both alongside all other flags', () => {
      process.argv = [
        'node', 'script.js',
        '--rc', '--version', '3.0.0',
        '--package-name', 'my-package',
        '--package-json-path', './packages/my-package/package.json',
      ];
      const result = parseArguments();
      expect(result).toEqual({
        releaseType: ReleaseType.RELEASE_CANDIDATE,
        version: '3.0.0',
        packageName: 'my-package',
        packageJsonPath: './packages/my-package/package.json',
      });
    });
  });

  describe('ReleaseType', () => {
    test('has correct values', () => {
      expect(ReleaseType.STABLE).toBe('stable');
      expect(ReleaseType.BETA).toBe('beta');
      expect(ReleaseType.RELEASE_CANDIDATE).toBe('rc');
      expect(ReleaseType.NIGHTLY).toBe('nightly');
    });
  });
});
