const { execSync } = require('child_process');
const { getStableBranchVersion, getLatestVersion, getNextPreReleaseVersion, getNextStableVersion, parseVersion } = require('./version-utils');
const { ReleaseType } = require('./parse-arguments');
const { getPackageVersionByTag } = require('./npm-utils');

const NIGHTLY_REGEX = /^(\d+\.\d+\.\d+)-nightly-\d{8}-([0-9a-f]+)$/;

function getVersion(packageName, releaseType, versionHint = null) {
  if (releaseType === ReleaseType.NIGHTLY) {
    let major, minor, patch;
    if (versionHint) {
      [major, minor, patch] = parseVersion(versionHint);
    } else {
      let latestVersion;
      try {
        latestVersion = getLatestVersion(packageName);
      } catch (error) {
        throw new Error(
          `No 'latest' version found for ${packageName} on npm. ` +
          `Provide an explicit 'version' input when publishing nightlies for a new package.`,
          { cause: error }
        );
      }
      [major, minor] = latestVersion;
      minor++;
      patch = 0;
    }

    const versionToUse = `${major}.${minor}.${patch}`;
    const currentSHA = execSync('git rev-parse HEAD').toString().trim().slice(0, 9);
    let latestNightlyVersion = null;
    let latestNightlySHA = null;

    try {
      const latestNightlyVersionString = getPackageVersionByTag(packageName, 'nightly');
      const match = latestNightlyVersionString.match(NIGHTLY_REGEX);
      if (match) {
        latestNightlyVersion = match[1];
        latestNightlySHA = match[2];
      } else {
        console.warn(`Unexpected nightly version format: ${latestNightlyVersionString}`);
      }
    } catch (error) {
      console.warn(`Failed to get latest nightly version for ${packageName}: ${error.message}`);
    }

    // Don't publish the same commit twice if the version is the same
    if (latestNightlySHA === currentSHA && latestNightlyVersion === versionToUse) {
      throw new Error(`Latest nightly version ${latestNightlyVersion} SHA ${latestNightlySHA} is the same as current SHA ${currentSHA}`);
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const currentDate = `${year}${month}${day}`;

    const nightlyVersion = `${versionToUse}-nightly-${currentDate}-${currentSHA}`;
    return nightlyVersion;
  } else if (releaseType === ReleaseType.BETA || releaseType === ReleaseType.RELEASE_CANDIDATE) {
    let versionToUse = versionHint;

    if (!versionToUse) {
      versionToUse = getStableBranchVersion().slice(0, 2).join('.') + '.0';
    }

    return getNextPreReleaseVersion(packageName, releaseType, versionToUse);
  }

  const [major, minor, patch] = versionHint ? parseVersion(versionHint) : getNextStableVersion(packageName);
  return `${major}.${minor}.${patch}`;
}

module.exports = {
  getVersion,
};
