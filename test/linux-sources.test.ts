import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const project = new URL('../', import.meta.url).pathname;
const forgeHome = process.env.FORGE_HOME ?? new URL('../../forge', import.meta.url).pathname;
const version: string = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8')).version;
let out = '';

// Generation only: it runs on every OS. Compiling needs Linux (see the Linux CI job).
describe('given the hello-forge sources generated for Linux', () => {
  before(() => {
    out = mkdtempSync(join(tmpdir(), 'hello-forge-linux-'));
    const result = spawnSync(join(forgeHome, 'bin/forge'), ['build', '--target', 'linux', '--strict-i18n', '--project', project, '--out', out], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  });
  after(() => rmSync(out, { recursive: true, force: true }));

  it('when the folder is listed, then the app id uses underscores (D-Bus names do not allow a hyphen)', () => {
    assert.ok(existsSync(join(out, 'local.forge.hello_forge.desktop')), readdirSync(out).join(', '));
    assert.ok(existsSync(join(out, 'local.forge.hello_forge.metainfo.xml')));
  });

  it('when CMakeLists.txt is read, then the target, the package and the file names are hello-forge', () => {
    const cmake = readFileSync(join(out, 'CMakeLists.txt'), 'utf8');
    assert.match(cmake, /project\(hello-forge VERSION 0\.4\.0 LANGUAGES CXX\)/);
    assert.ok(cmake.includes(`CPACK_PACKAGE_FILE_NAME "hello-forge-${version}-linux-\${FORGE_ARCH}\${FORGE_VARIANT_SUFFIX}"`));
    assert.ok(cmake.includes(version));
  });

  it('when the metainfo is read, then it carries the description and the MIT license from package.json', () => {
    const xml = readFileSync(join(out, 'local.forge.hello_forge.metainfo.xml'), 'utf8');
    assert.match(xml, /<project_license>MIT<\/project_license>/);
    assert.match(xml, /github\.com\/camaleaun\/forge-hello-world/);
  });

  it('when the language pack is listed, then it is named after hello-forge', () => {
    assert.deepEqual(readdirSync(join(out, 'lang')), [`hello-forge-${version}-pt-BR.lang`]);
  });
});

// UI v2: <only macos>/<only linux> hint, the language-download progress bar and the @media rule.
describe('given the hello-forge UI built for each target', () => {
  const generate = (target: string) => {
    const dir = mkdtempSync(join(tmpdir(), `hello-forge-${target}-`));
    const result = spawnSync(join(forgeHome, 'bin/forge'), ['build', '--target', target, '--strict-i18n', '--project', project, '--out', dir], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return dir;
  };
  const sourcesOf = (dir: string, files: string[]) => files.map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
  let linux = '';
  let macos = '';
  before(() => { linux = generate('linux'); macos = generate('macos'); });
  after(() => { rmSync(linux, { recursive: true, force: true }); rmSync(macos, { recursive: true, force: true }); });

  it('when the Linux sources are read, then they show the Ctrl+Q hint and the language-download progress bar, not the Cmd+Q hint', () => {
    const text = sourcesOf(linux, ['ui_linux.cpp', 'messages.cpp']);
    assert.ok(text.includes('Quit with Ctrl+Q'));
    assert.ok(!text.includes('Quit with Cmd+Q'));
    assert.match(text, /gtk_progress_bar_new/);
    assert.match(text, /add_download_bar/);
  });

  it('when the macOS sources are read, then they show the Cmd+Q hint and the progress bar, not the Ctrl+Q hint', () => {
    const text = sourcesOf(macos, ['ui_macos.mm', 'messages.cpp']);
    assert.ok(text.includes('Quit with Cmd+Q'));
    assert.ok(!text.includes('Quit with Ctrl+Q'));
    assert.match(text, /NSProgressIndicator/);
  });

  it('when the pt-BR pack is read for both targets, then the bytes (so the sha256) are identical and it translates both hints', () => {
    const file = `hello-forge-${version}-pt-BR.lang`;
    const a = readFileSync(join(linux, 'lang', file));
    const b = readFileSync(join(macos, 'lang', file));
    assert.equal(createHash('sha256').update(a).digest('hex'), createHash('sha256').update(b).digest('hex'));
    assert.match(a.toString('utf8'), /Quit with Cmd\+Q\tSaia com Cmd\+Q/);
    assert.match(a.toString('utf8'), /Quit with Ctrl\+Q\tSaia com Ctrl\+Q/);
  });
});

// The pt-BR variant: the pack is inside the binary, so no HTTP library and no libsoup.
describe('given the hello-forge pt-BR variant generated for Linux', () => {
  let variant = '';
  before(() => {
    variant = mkdtempSync(join(tmpdir(), 'hello-forge-variant-'));
    const result = spawnSync(join(forgeHome, 'bin/forge'), ['build', '--target', 'linux', '--strict-i18n', '--bundle-locale', 'pt-BR', '--project', project, '--out', variant], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  });
  after(() => rmSync(variant, { recursive: true, force: true }));

  it('when the sources are read, then Portuguese is bundled and there is no HTTP library, no libsoup and no download dependency', () => {
    const messages = readFileSync(join(variant, 'messages.cpp'), 'utf8');
    assert.match(messages, /BUNDLED_LOCALE = "pt-BR"/);
    assert.match(messages, /Olá, mundo!/);
    assert.ok(!existsSync(join(variant, 'http.hpp')));
    const cmake = readFileSync(join(variant, 'CMakeLists.txt'), 'utf8');
    assert.doesNotMatch(cmake, /soup|glib-networking|http_/);
    assert.match(cmake, /set\(FORGE_VARIANT "" CACHE STRING/);
    assert.doesNotMatch(readFileSync(join(variant, 'snap/snapcraft.yaml'), 'utf8'), /soup|network/);
  });
});
