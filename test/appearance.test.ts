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
});

describe('given the hello window', () => {
  it('when the native Swift version is read, then the window can be resized, maximized and minimized, with a minimum size', () => {
    const swift = readFileSync('native/macos/main.swift', 'utf8');
    assert.match(swift, /styleMask: \[[^\]]*\.resizable[^\]]*\]/);
    assert.match(swift, /styleMask: \[[^\]]*\.miniaturizable[^\]]*\]/);
    assert.match(swift, /window\.contentMinSize = NSSize\(width: 320, height: 120\)/);
  });
});
