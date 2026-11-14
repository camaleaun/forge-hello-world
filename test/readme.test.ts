import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const read = (file: string) => readFileSync(join(root, file), 'utf8');
const lines = (path: string) => readFileSync(path, 'utf8').split('\n').length - 1; // what `wc -l` counts

// Table cells like: `main.cpp` (75 lines). The path is relative to the README that cites it.
function citedLineCounts(readme: string) {
  const text = read(readme);
  const cited: { path: string; count: number }[] = [];
  for (const row of text.split('\n').filter((l) => l.startsWith('|'))) {
    for (const m of row.matchAll(/`([^`]+)` \(([\d,]+) lines?\)/g)) {
      cited.push({ path: join(root, dirname(readme), m[1]), count: Number(m[2].replace(/,/g, '')) });
    }
  }
  return cited;
}

describe('given the comparison tables in the native READMEs', () => {
  for (const readme of ['native/linux/README.md', 'native/macos/README.md']) {
    it(`when ${readme} is read, then every cited source exists and its line count equals wc -l`, () => {
      const cited = citedLineCounts(readme);
      assert.ok(cited.length >= 4, `${readme} cites only ${cited.length} sources`);
      for (const { path, count } of cited) {
        assert.ok(existsSync(path), `${path} does not exist`);
        assert.equal(count, lines(path), `${path}: README says ${count} lines`);
      }
    });
  }

  it('when the Linux table is read, then it cites main.cpp, build.sh, App.tsx, App.css and pt-BR.lang', () => {
    const names = citedLineCounts('native/linux/README.md').map((c) => c.path.split('/').pop());
    for (const file of ['main.cpp', 'build.sh', 'App.tsx', 'App.css', 'pt-BR.lang']) assert.ok(names.includes(file), file);
  });

  it('when the macOS table is read, then it cites main.swift, build.sh, App.tsx and App.css', () => {
    const names = citedLineCounts('native/macos/README.md').map((c) => c.path.split('/').pop());
    for (const file of ['main.swift', 'build.sh', 'App.tsx', 'App.css']) assert.ok(names.includes(file), file);
  });

  it('when the two native READMEs are read, then each links to the other', () => {
    assert.match(read('native/macos/README.md'), /\]\(\.\.\/linux\/README\.md\)/);
    assert.match(read('native/linux/README.md'), /\]\(\.\.\/macos\/README\.md\)/);
  });

  it('when the binary sizes are written, then they are the ones measured in CI"', () => {
    const linux = read('native/linux/README.md');
    assert.match(linux, /92,776 bytes/);
    assert.match(linux, /14,544 bytes/);
    assert.match(linux, /10,224 bytes/);
    assert.match(linux, /88,440 bytes/);
    assert.match(linux, /4 KB/);
    assert.match(linux, /max-page-size=4096/);
    assert.ok(!/see CI/.test(linux), 'real numbers, not a pointer');
    const mac = read('native/macos/README.md');
    assert.match(mac, /114,168 bytes/);
    assert.match(mac, /100,688 bytes/);
    assert.ok(!/73,448|100,880/.test(mac), 'stale macOS sizes');
  });
});

describe('given the repository README', () => {
  const readme = () => read('README.md');

  it('when the Linux install section is read, then it has the command for every package format', () => {
    const text = readme();
    assert.match(text, /sudo apt install \.\/hello-forge-<version>-linux-<arch>\.deb/);
    assert.match(text, /sudo dnf install \.\/hello-forge-<version>-linux-<arch>\.rpm/);
    assert.match(text, /sudo snap install --dangerous \.\/hello-forge-<version>-linux-<arch>\.snap/);
    assert.match(text, /\.tar\.gz/);
    assert.match(text, /chmod \+x hello-forge-<version>-linux-<arch>\.AppImage/);
    assert.match(text, /--appimage-extract-and-run/);
  });

  it('when the requirements are read, then they name GTK 4, glibc 2.39, libsoup 3 and glib-networking', () => {
    const text = readme();
    assert.match(text, /GTK 4/);
    assert.match(text, /ubuntu-24\.04/);
    assert.match(text, /glibc >= 2\.39/);
    assert.match(text, /libsoup 3/);
    assert.match(text, /glib-networking/);
  });

  it('when the settings are read, then Linux and macOS locations are given', () => {
    const text = readme();
    assert.ok(text.includes('~/.config/local.forge.hello_forge/settings.ini'));
    assert.ok(text.includes('~/.cache/local.forge.hello_forge/lang'));
    assert.ok(text.includes('~/Library/Preferences/local.forge.hello-forge.plist'));
    assert.ok(text.includes('~/Library/Application Support/local.forge.hello-forge/lang'));
  });

  it('when the sizes are read, then the stale 73 KB is gone and the CI numbers are there', () => {
    const text = readme();
    assert.ok(!/73 KB/.test(text), 'stale size');
    assert.match(text, /114 KB/);
    assert.match(text, /114,168 bytes/);
    assert.match(text, /92,776 bytes/);
  });

  it('when the native versions are mentioned, then both link to their folders', () => {
    const text = readme();
    assert.match(text, /\]\(native\/macos\)/);
    assert.match(text, /\]\(native\/linux\)/);
  });
});
