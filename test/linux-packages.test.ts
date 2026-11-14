import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { arch, tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const project = new URL('../', import.meta.url).pathname;
const forgeHome = process.env.FORGE_HOME ?? new URL('../../forge', import.meta.url).pathname;
const version: string = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8')).version;
const has = (command: string, ...args: string[]) => spawnSync(command, args).status === 0;
const canPackage = process.platform === 'linux' && has('cmake', '--version') && has('cpack', '--version') && has('pkg-config', '--exists', 'gtk4', 'libsoup-3.0');
const cpuArch = arch() === 'arm64' ? 'arm64' : 'x86_64';
let work = '';

describe('given hello-forge built and packaged on Linux', { skip: !canPackage && 'needs Linux with cmake, cpack, GTK 4 and libsoup 3' }, () => {
  before(() => {
    work = mkdtempSync(join(tmpdir(), 'hello-forge-pkg-'));
    const generated = spawnSync(join(forgeHome, 'bin/forge'), ['build', '--target', 'linux', '--project', project, '--out', join(work, 'src')], { encoding: 'utf8' });
    assert.equal(generated.status, 0, generated.stderr);
    for (const args of [['-S', join(work, 'src'), '-B', join(work, 'build'), '-DCMAKE_BUILD_TYPE=Release'], ['--build', join(work, 'build')]]) {
      const step = spawnSync('cmake', args, { encoding: 'utf8' });
      assert.equal(step.status, 0, step.stdout + step.stderr);
    }
    const pack = spawnSync('cpack', ['--config', join(work, 'build/CPackConfig.cmake'), '-B', join(work, 'pack'), '-G', 'DEB;TGZ'], { encoding: 'utf8' });
    assert.equal(pack.status, 0, pack.stdout + pack.stderr);
  });
  after(() => rmSync(work, { recursive: true, force: true }));

  it('when CPack runs, then the files are named hello-forge-<version>-linux-<arch>.*', () => {
    const files = readdirSync(join(work, 'pack')).filter((f) => f.startsWith('hello-forge-'));
    assert.ok(files.includes(`hello-forge-${version}-linux-${cpuArch}.deb`), files.join(', '));
    assert.ok(files.includes(`hello-forge-${version}-linux-${cpuArch}.tar.gz`), files.join(', '));
  });

  it('when the deb is inspected, then the package is hello-forge with its description and the app id desktop file', { skip: !has('dpkg-deb', '--version') && 'needs dpkg-deb' }, () => {
    const deb = join(work, 'pack', `hello-forge-${version}-linux-${cpuArch}.deb`);
    const info = spawnSync('dpkg-deb', ['--info', deb], { encoding: 'utf8' }).stdout;
    assert.match(info, /Package: hello-forge/);
    assert.match(info, /The smallest forge app/);
    const contents = spawnSync('dpkg-deb', ['--contents', deb], { encoding: 'utf8' }).stdout;
    assert.match(contents, /usr\/share\/applications\/local\.forge\.hello_forge\.desktop/);
    assert.match(contents, /usr\/bin\/hello-forge/);
  });

  it('when the installed tree is checked, then the binary is hello-forge', () => {
    assert.ok(existsSync(join(work, 'build/hello-forge')));
  });
});
