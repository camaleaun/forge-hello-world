import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const project = new URL('../', import.meta.url).pathname;
const forgeHome = process.env.FORGE_HOME ?? new URL('../../forge', import.meta.url).pathname;
const canBuild = process.platform === 'darwin' && spawnSync('cmake', ['--version']).status === 0;
const MAX_BINARY_BYTES = 300 * 1024;
const version: string = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8')).version;
let work = '';
let binary = '';

function run(...args: string[]) {
  return spawnSync(binary, args, { encoding: 'utf8', env: { ...process.env, LANG: 'C', LC_ALL: 'C', FORGE_LANG: '' } });
}

// The CLI reads language packs from the cache only; put the generated pack there as the app would after a download.
function runIn(language: string, ...args: string[]) {
  const cache = join(work, 'cache');
  const lang = join(work, 'src/lang');
  mkdirSync(cache, { recursive: true });
  for (const file of readdirSync(lang)) {
    const tag = file.replace(/^hello-forge-.*?-(pt-BR)\.lang$/, '$1');
    const sha = createHash('sha256').update(readFileSync(join(lang, file))).digest('hex').slice(0, 12);
    copyFileSync(join(lang, file), join(cache, `${tag}-${sha}.lang`));
  }
  return spawnSync(binary, args, { encoding: 'utf8', env: { ...process.env, FORGE_LANG: language, FORGE_I18N_CACHE_DIR: cache } });
}

describe('given the hello-world sources and a forge checkout', { skip: !canBuild && 'needs macOS and cmake' }, () => {
  before(() => {
    assert.ok(existsSync(join(forgeHome, 'bin/forge')), `forge not found at ${forgeHome} (set FORGE_HOME)`);
    work = mkdtempSync(join(tmpdir(), 'forge-hello-'));
    const generated = spawnSync(join(forgeHome, 'bin/forge'), ['build', '--project', project, '--out', join(work, 'src')], { encoding: 'utf8' });
    assert.equal(generated.status, 0, generated.stderr);
    const configure = spawnSync('cmake', ['-S', join(work, 'src'), '-B', join(work, 'build'), '-G', 'Unix Makefiles'], { encoding: 'utf8' });
    assert.equal(configure.status, 0, configure.stdout + configure.stderr);
    const build = spawnSync('cmake', ['--build', join(work, 'build')], { encoding: 'utf8' });
    assert.equal(build.status, 0, build.stdout + build.stderr);
    binary = join(work, 'build/hello-forge.app/Contents/MacOS/hello-forge');
  });
  after(() => rmSync(work, { recursive: true, force: true }));

  it('when "hello-forge --greet" runs, then it prints the greeting', () => {
    assert.equal(run('--greet').stdout, 'Hello, world!\n');
  });

  it('when "hello-forge --version" runs, then it prints the version from package.json', () => {
    assert.equal(run('--version').stdout, `${version}\n`);
  });

  it('when the pack is in the cache and "hello-forge --lang pt-BR --greet" runs, then it prints the translation', () => {
    assert.equal(runIn('pt-BR', '--greet').stdout, 'Olá, mundo!\n');
  });

  it('when "hello-forge --help" runs in pt-BR, then the option description is translated', () => {
    assert.match(runIn('pt-BR', '--help').stdout, /Mostra a saudação/);
  });

  it('when "hello-forge --help" runs in pt-BR, then forge\'s own texts come translated too, and --lang en goes back to English with the pack still cached', () => {
    assert.match(runIn('pt-BR', '--help').stdout, /--version {2}Mostra a versão/);
    assert.match(runIn('en', '--help').stdout, /--version {2}Print the version/);
    assert.equal(runIn('en', '--greet').stdout, 'Hello, world!\n');
  });

  it('when the build runs, then one pack file per language is generated', () => {
    assert.deepEqual(readdirSync(join(work, 'src/lang')), [`hello-forge-${version}-pt-BR.lang`]);
  });

  it('when the binary size is measured, then it is under 300 KB', () => {
    const size = statSync(binary).size;
    console.log(`# hello-forge binary size: ${size} bytes`);
    assert.ok(size < MAX_BINARY_BYTES, `${size} bytes`);
  });
});
