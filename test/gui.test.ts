import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const script = 'test/gui/linux-window.sh';

describe('given the versioned window check script', () => {
  it('when looked up, then it exists', () => {
    assert.ok(existsSync(script), `${script} is missing`);
  });

  it('when run without arguments, then it prints the usage on stderr and exits 2', () => {
    const result = spawnSync('bash', [script], { encoding: 'utf8' });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Usage: .*linux-window\.sh <binary> <label> \[pack-cache-dir\]/);
    assert.equal(result.stdout, '');
  });

  it('when parsed by bash -n, then it has no syntax errors', () => {
    const result = spawnSync('bash', ['-n', script], { encoding: 'utf8' });
    assert.equal(result.stderr, '');
    assert.equal(result.status, 0);
  });

  describe('and its text', () => {
    const text = () => readFileSync(script, 'utf8');

    it('then it documents the click arithmetic (padding 20, gap 12) and derives the coordinates from it', () => {
      assert.match(text(), /padding 20/);
      assert.match(text(), /gap 12/);
      assert.match(text(), /BUTTON_Y_OFFSET/);
      assert.match(text(), /click_x=\$\(\( *PADDING \+ BUTTON_WIDTH \/ 2 *\)\)/);
      assert.match(text(), /click_y=\$\(\( *PADDING \+ LABEL_HEIGHT \+ GAP \+ BUTTON_HEIGHT \/ 2 \+ BUTTON_Y_OFFSET *\)\)/);
    });

    it('then it waits for the window by exact title for 20 seconds and fails when it never appears', () => {
      assert.match(text(), /xdotool search --sync --name "\$title"/);
      assert.match(text(), /wait_for_window '\^Hello, forge\$'/);
      assert.match(text(), /timeout 20/);
    });

    it('then it checks the geometry, the pixel change and the pt-BR title', () => {
      assert.match(text(), /xdotool getwindowgeometry --shell/);
      assert.match(text(), /-ge 320/);
      assert.match(text(), /-ge 120/);
      assert.match(text(), /compare -metric AE/);
      assert.match(text(), /FORGE_LANG_PREFERENCE=pt-BR/);
      assert.match(text(), /FORGE_I18N_CACHE_DIR/);
      assert.match(text(), /Olá, forge/);
    });

    it('then it forces X11, writes into SHOTS_DIR and cleans the child up with a trap', () => {
      assert.match(text(), /GDK_BACKEND=x11/);
      assert.match(text(), /SHOTS_DIR:-\.?\/?shots/);
      assert.match(text(), /trap .* EXIT/);
      assert.match(text(), /compare\.png/);
    });
  });
});
