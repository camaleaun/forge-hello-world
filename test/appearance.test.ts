import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

describe('given the hello app in dark mode', () => {
  // A fixed text color (like #222) is unreadable on the dark window background; the system text color adapts.
  it('when App.css is read, then it does not hardcode a text color', () => {
    const css = readFileSync('App.css', 'utf8');
    assert.ok(!/(^|[\s;{])color\s*:/m.test(css), 'remove the color declaration and let the system pick the text color');
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

describe('given the UI v2 additions of the forge app', () => {
  const tsx = () => readFileSync('App.tsx', 'utf8');
  const css = () => readFileSync('App.css', 'utf8');

  it('when App.tsx is read, then the progress bar sits right below the language dropdown and is bound to the language download', () => {
    assert.match(tsx(), /<select language \/>\s*<progress source="language-download" \/>/);
  });

  it('when App.tsx is read, then the shortcut hint is a <text class="hint"> per target, after the Greet button', () => {
    const text = tsx();
    assert.match(text, /<only macos><text class="hint">\{__\('Quit with Cmd\+Q'\)\}<\/text><\/only>/);
    assert.match(text, /<only linux><text class="hint">\{__\('Quit with Ctrl\+Q'\)\}<\/text><\/only>/);
    assert.ok(text.indexOf('</button>') < text.indexOf('Quit with Cmd+Q'));
  });

  it('when App.css is read, then it sizes the progress bar and the hint and widens the message from 480 px', () => {
    const text = css();
    assert.match(text, /progress\s*\{\s*width: 160px;\s*\}/);
    assert.match(text, /\.hint\s*\{\s*font-size: 12px;\s*\}/);
    assert.match(text, /@media \(min-width: 480px\)\s*\{\s*\.message\s*\{\s*font-size: 18px;\s*\}\s*\}/);
  });

  it('when the window rule is read, then the height has room for the hint (at least 180 px)', () => {
    const height = Number(/window\s*\{[^}]*height: (\d+)px/.exec(css())?.[1]);
    assert.ok(height >= 180, `window height ${height}`);
  });
});
