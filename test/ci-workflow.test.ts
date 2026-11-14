import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ci = () => readFileSync('.github/workflows/ci.yml', 'utf8');
// The text of one top-level job (from "  name:" to the next job).
const job = (name: string) => {
  const match = ci().match(new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [a-z-]+:\\n|(?![\\s\\S]))`, 'm'));
  assert.ok(match, `job ${name} is missing`);
  return match[0];
};

describe('given ci.yml', () => {
  it('when the linux job is read, then it runs on ubuntu-24.04 and ubuntu-24.04-arm without fail-fast', () => {
    const linux = job('linux');
    assert.match(linux, /os: \[ubuntu-24\.04, ubuntu-24\.04-arm\]/);
    assert.match(linux, /fail-fast: false/);
    assert.match(linux, /runs-on: \$\{\{ matrix\.os \}\}/);
  });

  it('when the linux job installs tools, then the apt list has the build, package and display tools', () => {
    const linux = job('linux');
    for (const pkg of ['cmake', 'g++', 'pkg-config', 'libgtk-4-dev', 'libsoup-3.0-dev', 'glib-networking', 'rpm', 'squashfs-tools',
      'desktop-file-utils', 'appstream', 'xvfb', 'xdotool', 'imagemagick', 'dbus-x11']) {
      assert.match(linux, new RegExp(`(?<![\\w.+-])${pkg.replace(/[+.]/g, '\\$&')}(?![\\w.+-])`), pkg);
    }
  });

  it('when the linux job tests, then it checks out forge at the pinned ref and sets FORGE_HOME', () => {
    const linux = job('linux');
    assert.match(linux, /cat \.forge-ref/);
    assert.match(linux, /repository: camaleaun\/forge/);
    assert.match(linux, /path: forge/);
    assert.match(linux, /FORGE_HOME: \$\{\{ github\.workspace \}\}\/forge/);
    assert.match(linux, /node-version: 24/);
  });

  it('when the linux job builds, then it validates the .desktop file and builds the native sample only if it exists', () => {
    const linux = job('linux');
    assert.match(linux, /desktop-file-validate/);
    assert.match(linux, /if: hashFiles\('native\/linux\/build\.sh'\) != ''/);
  });

  it('when the linux job looks at the window, then it runs the versioned script under xvfb-run and dbus-run-session', () => {
    const linux = job('linux');
    assert.match(linux, /xvfb-run -a -s '-screen 0 1280x800x24' dbus-run-session -- bash test\/gui\/linux-window\.sh/);
  });

  it('when screenshots upload, then they run with if: always() under screens-linux-<os> and screens-macos', () => {
    assert.match(job('linux'), /if: always\(\)\n\s+with:\n\s+name: screens-linux-\$\{\{ matrix\.os \}\}/);
    assert.match(job('test'), /if: always\(\)\n\s+with:\n\s+name: screens-macos/);
  });

  it('when the macOS screenshot step runs, then it cannot fail the job', () => {
    const test = job('test');
    assert.match(test, /screencapture/);
    assert.match(test, /continue-on-error: true/);
    assert.match(test, /\|\| true/);
  });

  it('when the macOS job runs, then it keeps npm test with FORGE_HOME', () => {
    const test = job('test');
    assert.match(test, /runs-on: macos-latest/);
    assert.match(test, /run: npm test/);
    assert.match(test, /FORGE_HOME: /);
  });
});
