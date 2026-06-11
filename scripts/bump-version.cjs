// One-shot version bump across the workspace manifests, UTF-8 safe.
const fs = require('fs');
const files = [
  'package.json',
  'packages/core/package.json',
  'apps/api/package.json',
  'apps/web/package.json',
];
const [from, to] = process.argv.slice(2);
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, source.replace(`"version": "${from}"`, `"version": "${to}"`), 'utf8');
  console.log(`${file}: ${JSON.parse(fs.readFileSync(file, 'utf8')).version}`);
}
