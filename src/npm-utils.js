const { execSync } = require('child_process');

function getPackageVersionByTag(packageName, tag) {
  const npmString =
    tag != null
      ? `npm view ${packageName}@${tag} version`
      : `npm view ${packageName} version`;

  try {
    const result = execSync(npmString, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 }).toString().trim();
    return result;
  } catch (error) {
    throw new Error(`Failed to get package version for ${packageName} by tag: ${tag}`, { cause: error });
  }
}

function isNpmNotFoundError(error) {
  const cause = error.cause || error;
  const text = (cause.stderr?.toString() ?? '') + (cause.message ?? '');
  return text.includes('npm error code E404');
}

function getNextPatchVersion(packageName, major, minor) {
  const range = `${major}.${minor}.x`;

  let rawResult;
  try {
    rawResult = execSync(
      `npm view ${packageName}@"${range}" version --json`,
      { stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 }
    ).toString().trim();
  } catch (error) {
    if (isNpmNotFoundError(error)) {
      // No versions published yet for this major.minor range
      return 0;
    }
    throw error;
  }

  const parsed = JSON.parse(rawResult);
  const versions = Array.isArray(parsed) ? parsed : [parsed];
  const patches = versions.map(v => {
    const patch = Number(v.split('.')[2]);
    if (Number.isNaN(patch)) {
      throw new Error(`Unexpected version format in npm output: ${v}`);
    }
    return patch;
  });
  return Math.max(...patches) + 1;
}

function getNextPreReleaseIndex(packageName, baseVersion, releaseType) {
  if (releaseType !== 'beta' && releaseType !== 'rc') {
    throw new Error(`Invalid pre-release type: ${releaseType}. Must be "beta" or "rc".`);
  }

  const range = `>=${baseVersion}-${releaseType}.0 <${baseVersion}`;
  const escapedBase = baseVersion.replace(/\./g, '\\.');
  const versionRegex = new RegExp(`^${escapedBase}-${releaseType}\\.(\\d+)$`);

  let rawResult;
  try {
    rawResult = execSync(
      `npm view "${packageName}@${range}" version --json`,
      { stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 }
    ).toString().trim();
  } catch (error) {
    if (isNpmNotFoundError(error)) {
      return 1;
    }
    throw error;
  }

  const parsed = JSON.parse(rawResult);
  const allVersions = Array.isArray(parsed) ? parsed : [parsed];
  const indices = allVersions
    .map(v => {
      const match = v.match(versionRegex);
      return match ? Number(match[1]) : null;
    })
    .filter(i => i !== null);

  if (indices.length === 0) {
    return 1;
  }

  return Math.max(...indices) + 1;
}

module.exports = {
  getPackageVersionByTag,
  isNpmNotFoundError,
  getNextPatchVersion,
  getNextPreReleaseIndex,
};
