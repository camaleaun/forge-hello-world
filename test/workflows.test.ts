import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
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
});
