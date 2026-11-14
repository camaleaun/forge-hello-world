import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

describe('given the hello app in dark mode', () => {
  // A fixed text color (like #222) is unreadable on the dark window background; the system text color adapts.
  it('when every CSS file of the forge app is read, then none hardcodes a text color', () => {
    for (const file of ['App.css', 'screens/Language.css', 'screens/Hello.css']) {
      const css = readFileSync(file, 'utf8');
      assert.ok(!/(^|[\s;{])color\s*:/m.test(css), `${file}: remove the color declaration and let the system pick the text color`);
    }
  });

  it('when the native Swift version is read, then it does not hardcode a text color either', () => {
    const swift = readFileSync('native/macos/main.swift', 'utf8');
    assert.ok(!/textColor\s*=/.test(swift), 'do not set textColor: the default label color follows light and dark mode');
  });

  it('when the native C++ version is read, then it does not hardcode a text color either', () => {
    const cpp = readFileSync('native/linux/main.cpp', 'utf8');
    assert.ok(!/(^|[\s;{"])color\s*:/m.test(cpp), 'do not set color in the CSS: the GTK theme picks the text color for light and dark');
    assert.ok(!/gdk_rgba|override_color|<span[^>]*foreground/.test(cpp), 'do not set a color through the API either');
  });
});

describe('given the hello window', () => {
  it('when the native Swift version is read, then the window can be resized, maximized and minimized, with a minimum size', () => {
    const swift = readFileSync('native/macos/main.swift', 'utf8');
    assert.match(swift, /styleMask: \[[^\]]*\.resizable[^\]]*\]/);
    assert.match(swift, /styleMask: \[[^\]]*\.miniaturizable[^\]]*\]/);
    assert.match(swift, /window\.contentMinSize = NSSize\(width: 320, height: 120\)/);
  });
});

describe('given the two screens of the forge app (a language dialog, then the greeting)', () => {
  const read = (file: string) => readFileSync(file, 'utf8');
  // The declarations of one rule, whitespace squeezed.
  const rule = (css: string, selector: string) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
    assert.ok(match, `${selector} is missing`);
    return match[1].replace(/\s+/g, ' ').trim();
  };

  it('when App.tsx is read, then it lists the two screens as components of <steps>, language first', () => {
    const text = read('App.tsx');
    assert.match(text, /<steps>\s*<Language \/>\s*<Hello \/>\s*<\/steps>/);
    assert.match(text, /import Language from '\.\/screens\/Language\.tsx'/);
    assert.match(text, /import Hello, \{ greet \} from '\.\/screens\/Hello\.tsx'/);
  });

  it('when screens/Language.tsx is read, then it is the 420x180 dialog: prompt, dropdown, download bar, OK (primary, waits for the download) and Cancel (cancel)', () => {
    const text = read('screens/Language.tsx');
    assert.match(text, /<step id="language" width=\{420\} height=\{180\}>/);
    assert.match(text, /<text class="language-prompt">\{__\('Please choose your language'\)\}<\/text>\s*<select language \/>\s*<progress source="language-download" \/>/);
    assert.match(text, /<button primary waitsForDownload onClick=\{confirm\}>\{__\('OK'\)\}<\/button>\s*<button cancel onClick=\{quit\}>\{__\('Cancel'\)\}<\/button>/);
    assert.ok(text.indexOf('<progress') < text.indexOf('class="language-footer"'), 'the buttons row is last');
  });

  it('when screens/Hello.tsx is read, then it is the 600x440 screen: the message with the Greet (primary) button right under it, the hints, a divider, and a footer with only Back and Close (cancel)', () => {
    const text = read('screens/Hello.tsx');
    assert.match(text, /<step id="greeting" width=\{600\} height=\{440\}>/);
    assert.match(text, /<text class="hello-message">\{message\}<\/text>/);
    assert.match(text, /<text class="hello-message">\{message\}<\/text>\s*<button primary class="hello-greet" onClick=\{greet\}>\{__\('Greet'\)\}<\/button>/);
    assert.match(text, /<view class="hello-divider" \/>\s*<view class="hello-footer">\s*<button onClick=\{back\}>\{__\('Back'\)\}<\/button>\s*<button cancel onClick=\{quit\}>\{__\('Close'\)\}<\/button>\s*<\/view>/);
    assert.ok(text.indexOf('hello-greet') < text.indexOf('hello-divider'), 'Greet is in the body, right under the message');
    assert.match(text, /<only macos><text class="hello-hint">\{__\('Quit with Cmd\+Q'\)\}<\/text><\/only>/);
    assert.match(text, /<only linux><text class="hello-hint">\{__\('Quit with Ctrl\+Q'\)\}<\/text><\/only>/);
    assert.ok(text.indexOf('hello-message') < text.indexOf('Quit with Cmd+Q') && text.indexOf('Quit with Cmd+Q') < text.indexOf('hello-divider'));
  });

  it('when App.css is read, then buttons are 85x24 push buttons, the window falls back to the dialog size and the message widens from 480 px', () => {
    const css = read('App.css');
    assert.equal(rule(css, 'button'), 'width: 85px; height: 24px;');
    assert.equal(rule(css, 'window'), 'width: 420px; height: 180px;');
    assert.match(css, /@media \(min-width: 480px\)\s*\{\s*\.hello-message\s*\{\s*font-size: 18px;\s*\}\s*\}/);
  });

  it('when Language.css is read, then the numbers of the dialog are there: OK and Cancel 12 px apart and 7 px from the right and bottom edges, a 255x22 dropdown and a 12 px high full-width bar', () => {
    const css = read('screens/Language.css');
    assert.equal(rule(css, '.language-footer'), 'flex-direction: row; justify-content: end; gap: 12px; padding: 7px;');
    assert.equal(rule(css, '.language-content'), 'flex: 1; padding: 10px 12px 0px 12px; gap: 8px;');
    assert.equal(rule(css, 'select'), 'width: 255px; height: 22px;');
    assert.equal(rule(css, 'progress'), 'height: 12px;');
  });

  it('when Hello.css is read, then the numbers of the screen are there: a 1 px translucent divider, 25 px above the buttons, 14 px from the right and bottom, and Back and Close at the two ends of the footer (space between)', () => {
    const css = read('screens/Hello.css');
    assert.equal(rule(css, '.hello-divider'), 'height: 1px; background: #80808066;');
    assert.equal(rule(css, '.hello-footer'), 'flex-direction: row; justify-content: space-between; padding: 25px 14px 14px 14px;');
    assert.match(rule(css, '.hello-content'), /^flex: 1;/);
  });

  it('when the two screen stylesheets are read, then they share no class name (CSS is global)', () => {
    const classes = (file: string) => [...read(file).matchAll(/\.([a-z][\w-]*)/g)].map((m) => m[1]);
    const shared = classes('screens/Language.css').filter((name) => classes('screens/Hello.css').includes(name));
    assert.deepEqual(shared, []);
  });
});

describe('given the translated buttons', () => {
  // A fixed button width is a hard limit on macOS: "Cumprimentar" (pt-BR for Greet) is clipped in an 85 px button.
  it('when the Greet button is read, then it is wider than the 85 px default so the longest translation fits', () => {
    const tsx = readFileSync('screens/Hello.tsx', 'utf8');
    assert.match(tsx, /<button[^>]*class="hello-greet"[^>]*>\{__\('Greet'\)\}<\/button>/);
    const css = readFileSync('screens/Hello.css', 'utf8');
    const width = /\.hello-greet\s*\{[^}]*width:\s*(\d+)px/.exec(css);
    assert.ok(width, '.hello-greet needs its own width');
    assert.ok(Number(width[1]) >= 120, `${width[1]} px is too narrow for "Cumprimentar"`);
  });
});

describe('given the macOS look of the footer', () => {
  // Reference: a macOS save panel has ~20 pt side margins, ~21 pt above the buttons, ~8 pt between buttons; the Windows 7 metrics (7-14 px, 12-16 px) look cramped there.
  it('when the screen CSS files are read, then @only macos gives the footers system-style metrics (20 px sides, 8 px between buttons) and the other targets keep the installer metrics', () => {
    const language = readFileSync('screens/Language.css', 'utf8');
    const hello = readFileSync('screens/Hello.css', 'utf8');
    assert.match(language, /@only macos\s*\{[\s\S]*?\.language-footer\s*\{[^}]*gap:\s*8px;[^}]*padding:\s*16px 20px 20px 20px;/);
    assert.match(hello, /@only macos\s*\{[\s\S]*?\.hello-footer\s*\{[^}]*padding:\s*21px 20px 22px 20px;/);
    assert.match(language, /\.language-footer\s*\{ flex-direction: row; justify-content: end; gap: 12px; padding: 7px; \}/);
  });
});
