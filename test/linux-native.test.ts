import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const dir = new URL('../native/linux/', import.meta.url).pathname;
const buildScript = join(dir, 'build.sh');
const read = (file: string) => readFileSync(join(dir, file), 'utf8');
const swift = readFileSync(new URL('../native/macos/main.swift', import.meta.url), 'utf8');

const isLinux = process.platform === 'linux';
const hasGpp = isLinux && spawnSync('g++', ['--version']).status === 0;
const hasGtk = isLinux && spawnSync('pkg-config', ['--exists', 'gtk4']).status === 0;
const canBuild = hasGpp && hasGtk;
const skipReason = 'needs Linux with g++ and pkg-config gtk4 (apt install g++ pkg-config libgtk-4-dev)';

function helpOf(source: string, pattern: RegExp) {
  const match = source.match(pattern);
  assert.ok(match, `help text not found with ${pattern}`);
  return match[1];
}
const swiftHelp = () => helpOf(swift, /let help = """\n([\s\S]*?)\n"""/);

describe('given the hand-written native Linux hello (C++ + GTK 4), read as text', () => {
  it('when the folder is listed, then main.cpp, build.sh and README.md exist', () => {
    for (const file of ['main.cpp', 'build.sh', 'README.md']) assert.ok(existsSync(join(dir, file)), file);
  });

  it('when main.cpp is read, then it uses GTK 4 and the app id local.native.hello_forge', () => {
    const cpp = read('main.cpp');
    assert.match(cpp, /#include <gtk\/gtk\.h>/);
    assert.match(cpp, /"local\.native\.hello_forge"/);
  });

  it('when main.cpp is read, then the texts are the same as in the Swift version', () => {
    const cpp = read('main.cpp');
    for (const text of ['Press the button', 'Greet', 'Hello, world!', 'Hello, forge']) {
      assert.ok(cpp.includes(`"${text}"`), text);
      assert.ok(swift.includes(`"${text}"`), `${text} (swift)`);
    }
    assert.match(cpp, /"0\.1\.0"/);
  });

  it('when the help texts are extracted, then C++ and Swift print the same help', () => {
    const fromCpp = helpOf(read('main.cpp'), /R"HELP\(([\s\S]*?)\)HELP"/);
    assert.equal(fromCpp, swiftHelp());
    assert.match(fromCpp, /^Usage: hello-forge \[option\]/);
  });

  it('when main.cpp is read, then the command line is handled before GTK and GApplication does not see argv', () => {
    const cpp = read('main.cpp');
    assert.match(cpp, /unknown option: .* \(see --help\)/);
    assert.match(cpp, /return 2;/);
    assert.match(cpp, /g_application_run\(G_APPLICATION\(app\), 0, nullptr\)/);
    assert.ok(cpp.indexOf('"--greet"') < cpp.indexOf('gtk_application_new'), 'the CLI comes first');
  });

  it('when main.cpp is read, then the window is 320x120, resizable, with a 320x120 minimum', () => {
    const cpp = read('main.cpp');
    assert.match(cpp, /gtk_window_set_default_size\(GTK_WINDOW\(window\), 320, 120\)/);
    assert.match(cpp, /gtk_widget_set_size_request\([^)]*, 320, 120\)/);
    assert.ok(!/gtk_window_set_resizable\([^)]*FALSE/.test(cpp), 'the window stays resizable');
  });

  it('when main.cpp is read, then the layout and the button follow the Swift version', () => {
    const cpp = read('main.cpp');
    assert.match(cpp, /gtk_box_new\(GTK_ORIENTATION_VERTICAL, 12\)/);
    assert.match(cpp, /gtk_widget_set_size_request\(button, 100, -1\)/);
    assert.match(cpp, /font-size: 15px/);
    assert.match(cpp, /GTK_CHECK_VERSION\(4, 12, 0\)/);
    assert.match(cpp, /gtk_css_provider_load_from_string/);
    assert.match(cpp, /gtk_css_provider_load_from_data/);
  });

  it('when main.cpp is read, then Ctrl+Q quits through app.quit', () => {
    const cpp = read('main.cpp');
    assert.match(cpp, /"app\.quit"/);
    assert.match(cpp, /<Control>q/);
    assert.match(cpp, /gtk_application_set_accels_for_action/);
  });

  it('when build.sh is read, then it uses pkg-config gtk4, -Os and --gc-sections and explains a missing gtk4', () => {
    const sh = read('build.sh');
    assert.match(sh, /pkg-config --cflags --libs gtk4/);
    assert.match(sh, /-Os/);
    assert.match(sh, /--gc-sections/);
    assert.match(sh, /-ffunction-sections -fdata-sections/);
    assert.match(sh, /pkg-config --exists gtk4/);
    assert.match(sh, /libgtk-4-dev/);
  });
});

describe('given the native Linux hello and a Linux machine with g++ and GTK 4 development files', { skip: !canBuild && skipReason }, () => {
  let out = '';
  let binary = '';
  const run = (...args: string[]) => spawnSync(binary, args, { encoding: 'utf8' });

  before(() => {
    out = mkdtempSync(join(tmpdir(), 'hello-native-linux-'));
    const build = spawnSync('bash', [buildScript, out], { encoding: 'utf8' });
    assert.equal(build.status, 0, build.stdout + build.stderr);
    binary = join(out, 'hello-forge');
  });
  after(() => rmSync(out, { recursive: true, force: true }));

  it('when built, then hello-forge exists', () => {
    assert.ok(existsSync(binary));
    console.log(`# native linux hello-forge binary size: ${statSync(binary).size} bytes`);
  });

  it('when run with --greet, then it prints the greeting', () => {
    const result = run('--greet');
    assert.equal(result.stdout, 'Hello, world!\n');
    assert.equal(result.status, 0);
  });

  it('when run with --version, then it prints 0.1.0', () => {
    assert.equal(run('--version').stdout, '0.1.0\n');
  });

  it('when run with --help, then it prints the Swift help text', () => {
    assert.equal(run('--help').stdout, swiftHelp() + '\n');
  });

  it('when run with an unknown option, then the exit code is 2 and stderr points to --help', () => {
    const result = run('--nope');
    assert.equal(result.status, 2);
    assert.equal(result.stderr, 'unknown option: --nope (see --help)\n');
  });

  it('when the output folder is a relative path, then it is relative to where the script was called from', () => {
    const cwd = mkdtempSync(join(tmpdir(), 'hello-native-linux-cwd-'));
    try {
      const build = spawnSync('bash', [buildScript, 'rel-out'], { encoding: 'utf8', cwd });
      assert.equal(build.status, 0, build.stdout + build.stderr);
      assert.ok(existsSync(join(cwd, 'rel-out/hello-forge')));
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });
});
