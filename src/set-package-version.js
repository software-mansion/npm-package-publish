const fs = require('fs');
const { parseArguments } = require('./parse-arguments');
const { getVersion } = require('./get-version');

function setPackageVersion() {
  const { releaseType, version: versionHint, packageName, packageJsonPath } = parseArguments();

  const version = getVersion(packageName, releaseType, versionHint);

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = version;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  // Intentional, this is consumed by the action
  console.log(version);
}

if (require.main === module) {
  setPackageVersion();
}
