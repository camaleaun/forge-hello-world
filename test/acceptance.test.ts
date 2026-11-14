import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const project = new URL('../', import.meta.url).pathname;
const forgeHome = process.env.FORGE_HOME ?? new URL('../../forge', import.meta.url).pathname;
const canBuild = process.platform === 'darwin' && spawnSync('cmake', ['--version']).status === 0;
const MAX_BINARY_BYTES = 300 * 1024;
let work = '';
let binary = '';

function run(...args: string[]) {
  return spawnSync(binary, args, { encoding: 'utf8' });
}

describe('given the hello-world sources and a forge checkout', { skip: !canBuild && 'needs macOS and cmake' }, () => {
  before(() => {
    assert.ok(existsSync(join(forgeHome, 'bin/forge')), `forge not found at ${forgeHome} (set FORGE_HOME)`);
    work = mkdtempSync(join(tmpdir(), 'forge-hello-'));
    const generated = spawnSync(join(forgeHome, 'bin/forge'), ['build', '--project', project, '--out', join(work, 'src')], { encoding: 'utf8' });
    assert.equal(generated.status, 0, generated.stderr);
    const configure = spawnSync('cmake', ['-S', join(work, 'src'), '-B', join(work, 'build'), '-G', 'Unix Makefiles'], { encoding: 'utf8' });
    assert.equal(configure.status, 0, configure.stdout + configure.stderr);
    const build = spawnSync('cmake', ['--build', join(work, 'build')], { encoding: 'utf8' });
    assert.equal(build.status, 0, build.stdout + build.stderr);
    binary = join(work, 'build/hello.app/Contents/MacOS/hello');
  });
  after(() => rmSync(work, { recursive: true, force: true }));

  it('when "hello --greet" runs, then it prints the greeting', () => {
    assert.equal(run('--greet').stdout, 'Hello, world!\n');
  });

  it('when "hello --version" runs, then it prints the version from forge.json', () => {
    assert.equal(run('--version').stdout, '0.1.0\n');
  });

  it('when the binary size is measured, then it is under 300 KB', () => {
    const size = statSync(binary).size;
    console.log(`# hello binary size: ${size} bytes`);
    assert.ok(size < MAX_BINARY_BYTES, `${size} bytes`);
  });
});
