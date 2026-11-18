import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const script = join(import.meta.dirname, '..', 'scripts', 'check-manifest.mjs');
const BASE = 'https://github.com/o/r/releases/download/v1.0.0/';
const entry = (name: string, content: string) => ({ url: BASE + name, sha256: createHash('sha256').update(content).digest('hex'), size: Buffer.byteLength(content) });

// Writes the files and a latest.json that lists them: the default zip and deb, the pack, and the pt-BR dmg and zip.
function withFixture(change: (manifest: any, dir: string) => void, run: (json: string, dir: string) => void) {
  const root = mkdtempSync(join(tmpdir(), 'check-manifest-'));
  const dir = join(root, 'dist');
  try {
    spawnSync('mkdir', [dir]);
    const files: Record<string, string> = { 'app-1.0.0-darwin-arm64.zip': 'a', 'app-1.0.0-linux-x86_64.deb': 'b', 'app-1.0.0-darwin-arm64-pt-BR.zip': 'c', 'app-1.0.0-darwin-arm64-pt-BR.dmg': 'd', 'app-1.0.0-pt-BR.lang': 'e' };
    for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
    const manifest = {
      version: '1.0.0',
      platforms: { 'darwin-arm64': entry('app-1.0.0-darwin-arm64.zip', 'a') },
      languages: { 'pt-BR': entry('app-1.0.0-pt-BR.lang', 'e') },
      packages: { 'linux-x86_64': { deb: entry('app-1.0.0-linux-x86_64.deb', 'b') } },
      variants: { 'pt-BR': { 'darwin-arm64': { zip: entry('app-1.0.0-darwin-arm64-pt-BR.zip', 'c'), dmg: entry('app-1.0.0-darwin-arm64-pt-BR.dmg', 'd') } } },
    };
    change(manifest, dir);
    const json = join(root, 'latest.json');
    writeFileSync(json, JSON.stringify(manifest));
    run(json, dir);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const check = (json: string, dir: string, ...extra: string[]) => spawnSync(process.execPath, [script, json, dir, ...extra], { encoding: 'utf8' });

describe('given latest.json and the merged release files', () => {
  it('when every file is listed with its real sha256 and size, then it exits 0', () => {
    withFixture(() => {}, (json, dir) => {
      const result = check(json, dir);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /5 files match latest\.json/);
    });
  });
  it('when a variant file has another sha256 than latest.json, then it fails naming the file', () => {
    withFixture((manifest) => { manifest.variants['pt-BR']['darwin-arm64'].zip.sha256 = '0'.repeat(64); }, (json, dir) => {
      const result = check(json, dir);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /app-1\.0\.0-darwin-arm64-pt-BR\.zip: sha256 differs/);
    });
  });
  it('when the size differs, or a file is not listed at all, then it fails', () => {
    withFixture((manifest, dir) => {
      manifest.platforms['darwin-arm64'].size = 99;
      writeFileSync(join(dir, 'stray-1.0.0-linux-arm64.deb'), 'x');
    }, (json, dir) => {
      const result = check(json, dir);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /app-1\.0\.0-darwin-arm64\.zip: size differs/);
      assert.match(result.stderr, /stray-1\.0\.0-linux-arm64\.deb: not listed in latest\.json/);
    });
  });
  it('when --expect needs a variant platform and kind that latest.json lacks, then it fails listing only what is missing', () => {
    withFixture(() => {}, (json, dir) => {
      const result = check(json, dir, '--variant', 'pt-BR', '--expect', 'darwin-arm64:dmg,zip;linux-x86_64:deb');
      assert.equal(result.status, 1);
      assert.match(result.stderr, /variants\.pt-BR\.linux-x86_64\.deb is missing/);
      assert.doesNotMatch(result.stderr, /darwin-arm64/);
    });
  });
  it('when the expected variant files are all there, then --variant passes', () => {
    withFixture(() => {}, (json, dir) => {
      assert.equal(check(json, dir, '--variant', 'pt-BR', '--expect', 'darwin-arm64:dmg,zip').status, 0);
    });
  });
});
