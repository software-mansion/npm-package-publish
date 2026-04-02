const { getPackageVersionByTag } = require('./npm-utils');
const { parseVersion } = require('./version-utils');

function versionExists(packageName, version) {
  try {
    getPackageVersionByTag(packageName, version);
    return true;
  } catch (error) {
    return false;
  }
}

function validateNonLatestVersion(packageName, version) {
  const [newMajor, newMinor, newPatch, _] = parseVersion(version);

  if (versionExists(packageName, `${newMajor}.${newMinor}.${newPatch}`)) {
    throw new Error(
      `Version ${newMajor}.${newMinor}.${newPatch} already exists in the npm registry`,
    );
  }

  return true;
}

if (require.main === module) {
  const packageName = process.argv[2];
  const version = process.argv[3];
  // Print to STDOUT for the action to consume it.
  process.stdout.write(validateNonLatestVersion(packageName, version) ? 'true' : 'false');
}

module.exports = {
  validateNonLatestVersion,
};
