import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const buildScript = new URL('../native/macos/build.sh', import.meta.url).pathname;
const canBuild = process.platform === 'darwin' && spawnSync('swiftc', ['--version']).status === 0;
let out = '';
let binary = '';

function run(...args: string[]) {
  return spawnSync(binary, args, { encoding: 'utf8' });
}

describe('given the hand-written native macOS hello (Swift + AppKit)', { skip: !canBuild && 'needs macOS and swiftc' }, () => {
  before(() => {
    out = mkdtempSync(join(tmpdir(), 'hello-native-'));
    const build = spawnSync('bash', [buildScript, out], { encoding: 'utf8' });
    assert.equal(build.status, 0, build.stdout + build.stderr);
    binary = join(out, 'hello-forge.app/Contents/MacOS/hello-forge');
  });
  after(() => rmSync(out, { recursive: true, force: true }));

  it('when built, then hello-forge.app has the executable and an Info.plist', () => {
    assert.ok(existsSync(binary));
    assert.ok(existsSync(join(out, 'hello-forge.app/Contents/Info.plist')));
    console.log(`# native hello-forge binary size: ${statSync(binary).size} bytes`);
  });

  it('when run with --greet, then it prints the same greeting as the forge version', () => {
    const result = run('--greet');
    assert.equal(result.stdout, 'Hello, world!\n');
    assert.equal(result.status, 0);
  });

  it('when run with --version, then it prints the version', () => {
    assert.equal(run('--version').stdout, '0.1.0\n');
  });

  it('when run with --help, then it lists the same options as the forge version', () => {
    const { stdout } = run('--help');
    assert.match(stdout, /^Usage: hello-forge \[option\]/);
    for (const flag of ['--greet', '--version', '--help']) assert.ok(stdout.includes(flag), flag);
  });

  it('when run with an unknown option, then the exit code is 2 and stderr points to --help', () => {
    const result = run('--nope');
    assert.equal(result.status, 2);
    assert.match(result.stderr, /unknown option: --nope \(see --help\)/);
  });

  it('when the output folder is a relative path, then it is relative to where the script was called from', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'hello-native-cwd-'));
    try {
      const build = spawnSync('bash', [buildScript, 'rel-out'], { encoding: 'utf8', cwd });
      assert.equal(build.status, 0, build.stdout + build.stderr);
      assert.ok(existsSync(join(cwd, 'rel-out/hello-forge.app/Contents/MacOS/hello-forge')));
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
