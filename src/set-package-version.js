const fs = require('fs');
const { parseArguments } = require('./parse-arguments');

function setPackageVersion() {
  const { version, packageJsonPath } = parseArguments();

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = version;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
}

if (require.main === module) {
  setPackageVersion();
}
