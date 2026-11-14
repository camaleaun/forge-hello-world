import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

describe('given the app name', () => {
  it('when package.json is read, then the name is hello-forge (hello is too generic and clashes with other programs)', () => {
    assert.equal(pkg.name, 'hello-forge');
  });

  it('when package.json is read, then it carries the metadata the Linux packages and AppStream show', () => {
    assert.ok(typeof pkg.description === 'string' && pkg.description.length > 10, 'description');
    assert.equal(pkg.license, 'MIT');
    assert.equal(pkg.homepage, 'https://github.com/camaleaun/forge-hello-world');
  });

  it('when the tracked files are searched, then no artifact or command is still called plain "hello"', () => {
    const files = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' }).stdout
      .split('\n').filter((f) => f && !f.startsWith('test/name.test.ts') && !f.endsWith('.svg') && !f.startsWith('native/linux/') && !f.startsWith('test/gui/') && !f.startsWith('.github/workflows/ci.yml'));
    const stray: string[] = [];
    for (const file of files) {
      // The README explains the rename, so its intro and migration notes name the old app on purpose.
      const text = readFileSync(file, 'utf8').replace(/^## Migrating from[\s\S]*?(?=^## )/m, '').replace(/^The app is called .*$/m, '');
      text.split('\n').forEach((line, i) => {
        // "hello-forge", "Hello, forge", "hello-world" and "hello-native" (temp dirs) are fine.
        const cleaned = line.replace(/hello-(forge|world|native)/g, '').replace(/forge-hello-world/g, '');
        if (/\bhello(\.app|-\d|\s+--|\s+\[|\/hello\b|\s+binary)|(^|[\s`'"/])hello(\.app)?(['"`]|$)|Quit hello|\bhello\b.*\bapp\b.*hello/.test(cleaned) || /\bhello\.app\b|MacOS\/hello\b|Usage: hello\b|Quit hello\b|local\.native\.hello\b|"name": "hello"/.test(cleaned)) stray.push(`${file}:${i + 1}: ${line.trim()}`);
      });
    }
    assert.deepEqual(stray, []);
  });

  it('when the repository is checked, then no build output is tracked', () => {
    const tracked = spawnSync('git', ['ls-files', 'native/macos/rel-out', 'native/macos/build'], { encoding: 'utf8' }).stdout;
    assert.equal(tracked, '');
    assert.match(readFileSync('.gitignore', 'utf8'), /^native\/macos\/rel-out\/$/m);
  });
});
