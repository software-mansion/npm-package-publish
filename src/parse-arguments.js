const assert = require("assert");

const ReleaseType = {
  STABLE: "stable",
  BETA: "beta",
  RELEASE_CANDIDATE: "rc",
  NIGHTLY: "nightly",
};

function parseArguments() {
  let version = null;
  let versionHint = null;
  let isNightly = false;
  let isBeta = false;
  let isReleaseCandidate = false;
  let packageName = null;
  let packageJsonPath = null;

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === "--nightly") {
      isNightly = true;
    } else if (arg === "--beta") {
      isBeta = true;
    } else if (arg === "--rc") {
      isReleaseCandidate = true;
    } else if (arg === "--version") {
      if (i + 1 < process.argv.length) {
        version = process.argv[i + 1];
        i++;
      } else {
        throw new Error("Expected a version after --version");
      }
    } else if (arg === "--version-hint") {
      if (i + 1 < process.argv.length) {
        versionHint = process.argv[i + 1];
        i++;
      } else {
        throw new Error("Expected a version hint after --version-hint");
      }
    } else if (arg === "--package-name") {
      if (i + 1 < process.argv.length) {
        packageName = process.argv[i + 1];
        i++;
      } else {
        throw new Error("Expected a package name after --package-name");
      }
    } else if (arg === "--package-json-path") {
      if (i + 1 < process.argv.length) {
        packageJsonPath = process.argv[i + 1];
        i++;
      } else {
        throw new Error(
          "Expected a package JSON path after --package-json-path",
        );
      }
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  assert(
    [isNightly, isBeta, isReleaseCandidate].filter(Boolean).length <= 1,
    "Release flags --nightly, --beta, and --rc are mutually exclusive; specify at most one",
  );

  const releaseType = isNightly
    ? ReleaseType.NIGHTLY
    : isBeta
      ? ReleaseType.BETA
      : isReleaseCandidate
        ? ReleaseType.RELEASE_CANDIDATE
        : ReleaseType.STABLE;

  if (versionHint != null) {
    validateVersionHintFormat(versionHint);
  }

  if (version != null) {
    validateVersionForReleaseType(version, releaseType);
  }

  assert(packageName != null, "Missing required argument: --package-name");
  assert(
    packageJsonPath != null,
    "Missing required argument: --package-json-path",
  );

  return { releaseType, version, versionHint, packageName, packageJsonPath };
}

function validateVersionHintFormat(versionHint) {
  const versionHintRegex = /^(\d+)\.(\d+)\.(\d+)$/;
  if (!versionHintRegex.test(versionHint)) {
    throw new Error(
      `Provided version hint "${versionHint}" is not valid. Expected format: x.y.z`,
    );
  }
}

function validateVersionForReleaseType(version, releaseType) {
  let versionRegex;
  if (releaseType === ReleaseType.STABLE) {
    versionRegex = /^(\d+)\.(\d+)\.(\d+)$/;
  } else if (releaseType === ReleaseType.BETA) {
    versionRegex = /^(\d+)\.(\d+)\.(\d+)-beta\.\d+$/;
  } else if (releaseType === ReleaseType.RELEASE_CANDIDATE) {
    versionRegex = /^(\d+)\.(\d+)\.(\d+)-rc\.\d+$/;
  } else {
    versionRegex = /^(\d+)\.(\d+)\.(\d+)-nightly.*$/;
  }

  if (!versionRegex.test(version)) {
    throw new Error(
      `Version "${version}" is not valid for release type "${releaseType}"`,
    );
  }
}

module.exports = {
  ReleaseType,
  parseArguments,
};
