const { getPackageVersionByTag, isNpmNotFoundError } = require('./npm-utils');
const { parseVersion } = require('./version-utils');

function validateLatestVersion(packageName, version) {
  const [newMajor, newMinor, newPatch, newPreRelease] = parseVersion(version);

  if (newPreRelease !== null) {
    throw new Error(`Pre-release version ${version} cannot be the latest version`);
  }

  let latestVersion;
  try {
    latestVersion = getPackageVersionByTag(packageName, 'latest');
  } catch (error) {
    if (isNpmNotFoundError(error)) {
      // No 'latest' tag exists, so this version should be latest.
      // newPreRelease is guaranteed null here (checked above).
      return true;
    }

    throw error;
  }
  const [major, minor, patch] = parseVersion(latestVersion);

  if (newMajor < major) {
    throw new Error(`New major version ${newMajor} is less than latest major version ${major}`);
  }

  const isValid =
    (newMajor === major && newMinor === minor && newPatch === patch + 1) ||
    (newMajor === major && newMinor === minor + 1 && newPatch === 0) ||
    (newMajor === major + 1 && newMinor === 0 && newPatch === 0);

  if (!isValid) {
    throw new Error(
      `Version ${version} is not a valid latest version based on latest published version ${latestVersion}`,
    );
  }

  return true;
}

if (require.main === module) {
  const packageName = process.argv[2];
  const version = process.argv[3];
  // Print to STDOUT for the action to consume it.
  process.stdout.write(validateLatestVersion(packageName, version) ? 'true' : 'false');
}

module.exports = {
  validateLatestVersion,
};
