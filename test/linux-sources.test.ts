import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
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
    assert.match(cmake, /project\(hello-forge VERSION 0\.2\.0 LANGUAGES CXX\)/);
    assert.match(cmake, /CPACK_PACKAGE_FILE_NAME "hello-forge-0\.2\.0-rc\.2-linux-\$\{FORGE_ARCH\}"/);
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
