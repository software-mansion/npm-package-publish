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

function getNextPatchVersion(packageName, major, minor) {
  const range = `${major}.${minor}.x`;
  try {
    const result = execSync(
      `npm view ${packageName}@"${range}" version --json`,
      { stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000 }
    ).toString().trim();

    const parsed = JSON.parse(result);
    const versions = Array.isArray(parsed) ? parsed : [parsed];
    const maxPatch = Math.max(...versions.map(v => Number(v.split('.')[2])));
    return maxPatch + 1;
  } catch {
    return 0;
  }
}

module.exports = {
  getPackageVersionByTag,
  getNextPatchVersion,
};
