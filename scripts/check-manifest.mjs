// Checks latest.json against the release files: every file of <dir> must be listed (platforms, packages,
// languages or variants) with the sha256 and size of the real file, and every listed URL must name a file of <dir>.
// With --variant <tag> --expect "<platform>:<kind>,<kind>;<platform>:<kind>" the variant must list those files too.
//
// Usage: node scripts/check-manifest.mjs latest.json dist [--variant pt-BR --expect "darwin-arm64:dmg,zip;linux-x86_64:deb,rpm"]
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [jsonPath, dir, ...rest] = process.argv.slice(2);
if (!jsonPath || !dir) {
  console.error('Usage: check-manifest.mjs latest.json <dir> [--variant <tag> --expect "<platform>:<kind>,...;..."]');
  process.exit(2);
}
const option = (name) => (rest.includes(name) ? rest[rest.indexOf(name) + 1] : undefined);

const manifest = JSON.parse(readFileSync(jsonPath, 'utf8'));
const entries = []; // [path in the manifest, {url, sha256, size}]
const collect = (path, value) => {
  if (value && typeof value.url === 'string') entries.push([path, value]);
  else if (value && typeof value === 'object') for (const [key, inner] of Object.entries(value)) collect(`${path}.${key}`, inner);
};
for (const section of ['platforms', 'packages', 'languages', 'variants']) collect(section, manifest[section] ?? {});

const problems = [];
const listed = new Set();
for (const [path, entry] of entries) {
  const name = decodeURIComponent(entry.url.slice(entry.url.lastIndexOf('/') + 1));
  listed.add(name);
  let bytes;
  try {
    bytes = readFileSync(join(dir, name));
  } catch {
    problems.push(`${path}: ${name} is not in ${dir}`);
    continue;
  }
  if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) problems.push(`${name}: sha256 differs from ${path}`);
  if (bytes.length !== entry.size) problems.push(`${name}: size differs from ${path} (${bytes.length} bytes, latest.json says ${entry.size})`);
}
const files = readdirSync(dir);
for (const name of files) if (!listed.has(name)) problems.push(`${name}: not listed in latest.json`);

const variant = option('--variant');
const expect = option('--expect');
if (variant && expect) {
  for (const item of expect.split(';')) {
    const [platform, kinds] = item.split(':');
    for (const kind of kinds.split(',')) {
      if (!manifest.variants?.[variant]?.[platform]?.[kind]) problems.push(`variants.${variant}.${platform}.${kind} is missing`);
    }
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(`error: ${problem}`);
  process.exit(1);
}
console.log(`${files.length} files match latest.json (${entries.length} entries)`);
