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

  const release = () => readFileSync('.github/workflows/release.yml', 'utf8');
  // The text of one top-level job (from "  name:" to the next job).
  const job = (name: string) => {
    const match = release().match(new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [a-z-]+:\\n|(?![\\s\\S]))`, 'm'));
    assert.ok(match, `job ${name} is missing`);
    return match[0];
  };

  it('when release.yml builds, then it uses the reusable forge-action pinned to v1.3.0 (the tag with the locale input), not the moving v1 and not trunk', () => {
    const text = release();
    assert.match(text, /uses: camaleaun\/forge-action@v1\.3\.0\b/);
    assert.match(text, /uses: camaleaun\/forge-action\/publish@v1\.3\.0\b/);
    assert.ok(!/forge-action(\/publish)?@v1\s*$/m.test(text), 'never the moving v1');
    assert.ok(!/forge-action(\/publish)?@trunk/.test(text), 'never trunk');
  });

  it('when release.yml builds, then the matrix is 3 platforms x {default, pt-BR} with distinct artifact names dist-<platform>[-pt-BR]', () => {
    const build = job('build');
    let combos = 0;
    for (const [os, target, artifact] of [
      ['macos-latest', 'macos', 'dist-macos'],
      ['ubuntu-24.04', 'linux', 'dist-linux-x86_64'],
      ['ubuntu-24.04-arm', 'linux', 'dist-linux-arm64'],
    ]) {
      for (const [suffix, locale] of [['', ''], ['-pt-BR', 'pt-BR']]) {
        assert.match(build, new RegExp(`os: ${os}\\n\\s+target: ${target}\\n\\s+artifact: ${artifact}${suffix}\\n\\s+locale: '${locale}'`), `${os} ${artifact}${suffix}`);
        combos++;
      }
    }
    assert.equal(combos, 6);
    assert.equal((build.match(/^\s+- os: /gm) ?? []).length, 6, 'exactly six build jobs');
    assert.match(build, /runs-on: \$\{\{ matrix\.os \}\}/);
    assert.match(build, /target: \$\{\{ matrix\.target \}\}/);
    assert.match(build, /artifact-name: \$\{\{ matrix\.artifact \}\}/);
    assert.match(build, /locale: \$\{\{ matrix\.locale \}\}/);
    assert.match(build, /fail-fast: false/);
  });

  it('when release.yml pins forge, then .forge-ref is read once in the check job and passed to every action', () => {
    const text = release();
    assert.match(job('check'), /cat \.forge-ref/);
    assert.equal((text.match(/cat \.forge-ref/g) ?? []).length, 1);
    assert.ok(!/forge-ref: trunk/.test(text), 'never build from the moving trunk');
    assert.equal((text.match(/needs\.check\.outputs\.forge-ref/g) ?? []).length, 4, 'build checkout, build action, manifest checkout and publish');
    assert.match(job('build'), /forge-ref: \$\{\{ needs\.check\.outputs\.forge-ref \}\}/);
    assert.match(job('publish'), /forge-ref: \$\{\{ needs\.check\.outputs\.forge-ref \}\}/);
  });

  it('when release.yml builds, then the tests run before the action, with a forge checkout and the GTK packages on Linux', () => {
    const build = job('build');
    assert.ok(build.indexOf('npm test') > 0 && build.indexOf('npm test') < build.indexOf('camaleaun/forge-action@v1.3.0'));
    assert.match(build, /FORGE_HOME: \$\{\{ github\.workspace \}\}\/forge/);
    assert.match(build, /name: Test\n\s+if: matrix\.locale == ''\n\s+run: npm test/, 'the tests run once per platform, on the default build');
    assert.match(build, /if: matrix\.target == 'linux'[\s\S]*apt-get install[^\n]*libgtk-4-dev[^\n]*libsoup-3\.0-dev[^\n]*glib-networking/);
  });

  it('when release.yml checks the tag, then the tag must equal v + the package.json version exactly (prereleases included)', () => {
    const check = job('check');
    assert.ok(!check.includes('%%-*'), 'the tag must not be stripped of its prerelease suffix');
    assert.match(check, /"v\$\{version\}" != "\$GITHUB_REF_NAME"/);
    assert.match(check, /if: startsWith\(github\.ref, 'refs\/tags\/v'\)/);
    assert.match(job('build'), /needs: check/);
  });

  it('when the packages job is read, then on both Linux runners it installs the .deb on ubuntu:24.04 and the .rpm on fedora and runs the installed app (--greet, --version, --locale pt-BR from the pack)', () => {
    const packages = job('packages');
    assert.match(packages, /needs: \[check, build\]/);
    assert.match(packages, /ubuntu-24\.04-arm/);
    assert.match(packages, /name: dist-linux-\$\{\{ matrix\.arch \}\}/);
    assert.match(packages, /ubuntu:24\.04/);
    assert.match(packages, /fedora:41/);
    assert.match(packages, /apt-get install[^\n]*\.deb/);
    assert.match(packages, /dnf install[^\n]*\.rpm/);
    assert.match(packages, /hello-forge --version/);
    assert.match(packages, /hello-forge --greet/);
    assert.match(packages, /--locale pt-BR/);
    assert.match(packages, /Olá, mundo!/);
  });

  it('when the packages job is read, then it also installs the pt-BR variant (deb on ubuntu:24.04, rpm on fedora:41) in clean containers with an empty cache and a pack server that points nowhere', () => {
    const packages = job('packages');
    assert.match(packages, /name: dist-linux-\$\{\{ matrix\.arch \}\}-pt-BR\n\s+path: dist-pt-BR/);
    assert.match(packages, /apt-get install[^\n]*\/dist-pt-BR\/hello-forge-\*-pt-BR\.deb/);
    assert.match(packages, /dnf install[^\n]*\/dist-pt-BR\/hello-forge-\*-pt-BR\.rpm/);
    assert.ok((packages.match(/FORGE_I18N_BASE_URL=http:\/\/127\.0\.0\.1:9\//g) ?? []).length >= 2, 'the pack server points nowhere');
    assert.ok((packages.match(/FORGE_I18N_CACHE_DIR=\/tmp\/empty-cache/g) ?? []).length >= 2, 'an empty cache dir');
    assert.ok((packages.match(/test "\$\(.*hello-forge --greet\)" = "Olá, mundo!"/g) ?? []).length >= 2, 'the variant greets in Portuguese');
    assert.ok((packages.match(/test -z "\$\(ls -A \/tmp\/empty-cache\)"/g) ?? []).length >= 2, 'nothing was cached');
    assert.ok((packages.match(/hello-forge --locale en --greet/g) ?? []).length >= 2, 'English stays available');
    assert.ok((packages.match(/grep -q soup/g) ?? []).length >= 2, 'the variant links no libsoup');
    assert.ok(packages.match(/"\$\(hello-forge --greet\)" = "Hello, world!"/g)?.length === 2, 'the default package still prints English');
  });

  it('when the manifest job is read, then it validates variants with scripts/check-manifest.mjs against the merged files', () => {
    const manifest = job('manifest');
    assert.match(manifest, /node scripts\/check-manifest\.mjs latest\.json dist/);
    assert.match(manifest, /pt-BR/);
  });

  it('when release.yml needs the version, then it asks forge info instead of reading forge.json', () => {
    const text = release();
    assert.ok(!text.includes('forge.json'), 'forge.json no longer exists');
    assert.ok(text.includes('forge/bin/forge info --field version'));
  });

  it('when release.yml signs, then macOS secrets are optional inputs of the action (ad-hoc without them)', () => {
    const build = job('build');
    for (const [input, secret] of [
      ['macos-certificate-p12', 'MACOS_CERTIFICATE_P12'],
      ['macos-certificate-password', 'MACOS_CERTIFICATE_PASSWORD'],
      ['macos-signing-identity', 'MACOS_SIGNING_IDENTITY'],
      ['notary-key-p8', 'NOTARY_KEY_P8'],
      ['notary-key-id', 'NOTARY_KEY_ID'],
      ['notary-issuer-id', 'NOTARY_ISSUER_ID'],
    ]) assert.ok(build.includes(`${input}: \${{ secrets.${secret} }}`), input);
    assert.ok(!release().includes('codesign'), 'signing goes through the action');
  });

  it('when release.yml runs as a dry run, then the manifest job still checks the merged files and latest.json', () => {
    const manifest = job('manifest');
    assert.match(manifest, /needs: \[check, build\]/);
    assert.ok(!/^\s+if:/m.test(manifest), 'the manifest must also run without a tag');
    assert.match(manifest, /pattern: dist-\*/);
    assert.match(manifest, /forge\/bin\/forge manifest --dir dist --tag/);
    assert.match(manifest, /sha256sum/, 'the .lang packs of the three builds must be byte-identical');
    for (const key of ['darwin-arm64', 'linux-x86_64', 'linux-arm64']) assert.ok(manifest.includes(key), key);
  });

  it('when release.yml publishes, then there is one publish job, only on v* tags, with a checkout and the dist-* artifacts', () => {
    const text = release();
    const publish = job('publish');
    assert.equal((text.match(/forge-action\/publish@/g) ?? []).length, 1);
    assert.match(publish, /if: startsWith\(github\.ref, 'refs\/tags\/v'\)/);
    assert.match(publish, /needs: \[check, manifest, packages\]/);
    assert.match(publish, /contents: write/);
    assert.ok(publish.indexOf('actions/checkout@v4') < publish.indexOf('forge-action/publish@'), 'gh release create needs a repository');
    assert.match(publish, /pattern: dist-\*/);
    assert.ok(!text.includes('gh release create'), 'the publish action creates the release');
  });

  it('when release.yml uploads, then it leaves packaging and artifact paths to the action', () => {
    const text = release();
    assert.ok(!/^\s*cpack /m.test(text), 'cpack runs inside the action');
    assert.ok(!/path: dist\/\*\s*$/m.test(text));
    assert.ok(!text.includes('macos-dmg.sh'), 'the DMG is built by the action');
  });
});
