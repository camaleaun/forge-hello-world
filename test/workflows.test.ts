import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const workflows = ['.github/workflows/ci.yml', '.github/workflows/release.yml'];
const hasActionlint = spawnSync('actionlint', ['--version']).status === 0;

describe('given the repository workflows', () => {
  for (const workflow of workflows) {
    it(`when looked up, then ${workflow} exists`, () => {
      assert.ok(existsSync(workflow), `${workflow} is missing`);
    });
  }

  it('when linted with actionlint, then it reports nothing', { skip: !hasActionlint && 'actionlint not installed' }, () => {
    const result = spawnSync('actionlint', workflows.filter(existsSync), { encoding: 'utf8' });
    assert.equal(result.stdout + result.stderr, '');
    assert.equal(result.status, 0);
  });

  it('when release.yml packages and uploads, then CPack stages outside dist and only the release files are uploaded', () => {
    const text = readFileSync('.github/workflows/release.yml', 'utf8');
    // CPack's DragNDrop staging dir contains a symlink to /Applications; uploading dist/* would follow it.
    assert.ok(!/cpack[^\n]*-B dist/.test(text), 'cpack must not use dist as its build directory');
    assert.ok(!/path: dist\/\*\s*$/m.test(text), 'upload only dist/*.dmg and dist/*.zip');
  });

  it('when release.yml builds, then translations are strict and the language packs are uploaded next to the dmg and zip', () => {
    const text = readFileSync('.github/workflows/release.yml', 'utf8');
    assert.match(text, /forge\/bin\/forge build --strict-i18n/);
    assert.match(text, /build\/src\/lang\/\*\.lang/);
    assert.match(text, /dist\/\*\.lang/);
  });

  it('when release.yml checks the tag, then the tag must equal v + the package.json version exactly (prereleases included)', () => {
    const text = readFileSync('.github/workflows/release.yml', 'utf8');
    assert.ok(!text.includes('%%-*'), 'the tag must not be stripped of its prerelease suffix');
    assert.match(text, /"v\$\{version\}" != "\$GITHUB_REF_NAME"/);
  });

  it('when release.yml needs the version, then it asks forge info instead of reading forge.json', () => {
    const text = readFileSync('.github/workflows/release.yml', 'utf8');
    assert.ok(!text.includes('forge.json'), 'forge.json no longer exists');
    assert.ok(text.includes('forge/bin/forge info --field version'));
  });

  it('when release.yml signs, then it goes through macos-sign.sh (ad-hoc by default, Developer ID + notarization when secrets exist)', () => {
    const text = readFileSync('.github/workflows/release.yml', 'utf8');
    assert.ok(!text.includes('codesign --force --deep -s -'), 'signing must go through the script');
    for (const step of [
      'forge/scripts/macos-sign.sh import-certificate',
      'forge/scripts/macos-sign.sh sign build/out/hello.app',
      'forge/scripts/macos-sign.sh notarize build/out/hello.app',
      'forge/scripts/macos-sign.sh staple build/out/hello.app',
      'forge/scripts/macos-sign.sh sign "dist/hello-${version}-darwin-arm64.dmg"',
      'forge/scripts/macos-sign.sh notarize "dist/hello-${version}-darwin-arm64.dmg"',
      'forge/scripts/macos-sign.sh staple "dist/hello-${version}-darwin-arm64.dmg"',
    ]) assert.ok(text.includes(step), step);
    for (const secret of ['MACOS_CERTIFICATE_P12', 'MACOS_CERTIFICATE_PASSWORD', 'MACOS_SIGNING_IDENTITY', 'NOTARY_KEY_P8', 'NOTARY_KEY_ID', 'NOTARY_ISSUER_ID']) {
      assert.ok(text.includes(`${secret}: \${{ secrets.${secret} }}`), secret);
    }
  });

  it('when release.yml builds the DMG, then it goes through macos-dmg.sh (retries when the Finder keeps the volume busy)', () => {
    const text = readFileSync('.github/workflows/release.yml', 'utf8');
    assert.ok(text.includes('forge/scripts/macos-dmg.sh build/out/CPackConfig.cmake build/cpack hello'));
    assert.ok(!/^\s*cpack /m.test(text), 'cpack must not be called directly');
  });
});
