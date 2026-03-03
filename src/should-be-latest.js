const { getPackageVersionByTag } = require('./npm-utils');
const { parseVersion } = require('./version-utils');

function shouldBeLatest(packageName, version) {
  const [newMajor, newMinor, newPatch, newPreRelease] = parseVersion(version);

  // Pre-releases should never be latest
  if (newPreRelease !== null) {
    return false;
  }

  let latestVersion;
  try {
    latestVersion = getPackageVersionByTag(packageName, 'latest');
  } catch {
    // No 'latest' tag exists — package has never been published, so this version should be latest.
    return true;
  }

  const [major, minor, patch] = parseVersion(latestVersion);

  return (newMajor === major && newMinor === minor && newPatch >= patch + 1) ||
         (newMajor === major && newMinor >= minor + 1) ||
         (newMajor >= major + 1);
}

if (require.main === module) {
  const packageName = process.argv[2];
  const version = process.argv[3];
  console.log(shouldBeLatest(packageName, version));
}

module.exports = {
  shouldBeLatest,
};
