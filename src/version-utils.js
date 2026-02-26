const { execSync } = require('child_process');
const { getPackageVersionByTag, getNextPatchVersion } = require('./npm-utils');

const VERSION_REGEX = /^(\d+)\.(\d+)\.(\d+)(-.*)?$/;
const BRANCH_REGEX = /^(\d+)\.(\d+)-stable$/;

function parseVersion(version) {
  const match = version.match(VERSION_REGEX);
  if (!match) {
    throw new Error(`Invalid version string: ${version}`);
  }
  const [, major, minor, patch, preRelease] = match;
  return [Number(major), Number(minor), Number(patch), preRelease || null];
}

function getStableBranchVersion() {
  const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  const match = currentBranch.match(BRANCH_REGEX);
  if (!match) {
    throw new Error(`Failed to parse stable version from branch: ${currentBranch}`);
  }
  const [, major, minor] = match;
  return [Number(major), Number(minor)];
}

function getLatestVersion(packageName) {
  const latestVersion = getPackageVersionByTag(packageName, 'latest');
  
  try {
    return parseVersion(latestVersion);
  } catch (error) {
    throw new Error(`Failed to parse latest version: ${latestVersion}`, { cause: error });
  }
}

function getNextStableVersion(packageName) {
  const [major, minor] = getStableBranchVersion();
  const nextPatch = getNextPatchVersion(packageName, major, minor);
  return [major, minor, nextPatch];
}

function getNextPreReleaseVersion(packageName, releaseType, version) {
  let dotIndex = 1;
  while (true) {
    const targetVersion = `${version}-${releaseType}.${dotIndex}`;
    
    try {
      // if the version is already published, increment the pre-release sequence (rc/beta number) and try again
      getPackageVersionByTag(packageName, targetVersion);
      dotIndex++;
    } catch (error) {
      return targetVersion;
    }
  }
}

module.exports = {
  parseVersion,
  getStableBranchVersion,
  getNextStableVersion,
  getNextPreReleaseVersion,
  getLatestVersion,
};
