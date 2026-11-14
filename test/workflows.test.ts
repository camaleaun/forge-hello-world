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
});
