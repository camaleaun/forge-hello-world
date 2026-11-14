# The same hello, written by hand for macOS

`main.swift` is the whole app: Swift + AppKit, no Xcode project, no dependencies. It does what `../../App.tsx` + `App.css` do:
a window (320x120 at first, resizable) titled "Hello, forge", a label ("Press the button") and a "Greet" button that changes the label, a Quit menu (Cmd+Q),
and the same command line (`--greet`, `--version`, `--help`, exit code 2 for unknown options) in the same binary.

```sh
native/macos/build.sh              # builds native/macos/build/hello-forge.app (needs macOS and swiftc)
native/macos/build/hello-forge.app/Contents/MacOS/hello-forge --greet
open native/macos/build/hello-forge.app
```

## Side by side

| | forge version | hand-written Swift |
|---|---|---|
| What you write | `../../App.tsx` (19 lines) + `../../App.css` (7 lines) + `../../screens/Language.tsx` (23 lines) + `../../screens/Language.css` (5 lines) + `../../screens/Hello.tsx` (29 lines) + `../../screens/Hello.css` (7 lines) + `../../languages/pt-BR.lang` (12 lines) | `main.swift` (76 lines) + `build.sh` (31 lines) that makes the `.app` |
| What gets compiled | about 2,000 lines of generated Objective-C++/C++/CMake (not written by you) | the 76 lines above |
| Binary size (arm64, CI) | 131,224 bytes (with the language support) | 100,688 bytes (links the system Swift runtime) |
| Same source also runs | in the browser preview (`forge start`), on Linux, later Windows/web/mobile | macOS only |
| Languages | a dropdown, the choice is remembered, language packs are downloaded | English only |
| Full AppKit access | no (window, view, text, button, language dropdown, progress) | yes |

The hand-written version stays at the 0.2 feature set (no language-download progress bar, no shortcut hint, no `@media` rule), so the forge column of this table does more than the native one.

The same comparison for Linux (C++ + GTK 4) is in [`../linux/README.md`](../linux/README.md).

## Is a fixed size or a fixed position required? No.
- **Size:** it is decided by the window's *style mask*. This hello passes `[.titled, .closable, .miniaturizable, .resizable]`, so it can be
  resized and maximized (`.resizable` is what enables the green button), and `window.contentMinSize` stops it from shrinking below 320x120.
  Leave `.resizable` out and the window is a fixed size. A window created from Xcode's template is resizable by default.
  forge does the same: the width and height in `App.css` are the initial and minimum size of the window.
- **Position:** nothing is required either. The window opens where its `contentRect` origin says, which is the bottom-left corner of the screen
  when you pass `(0, 0)`. That is why the code calls `window.center()`. Real apps usually call `window.setFrameAutosaveName("main")`
  instead, and AppKit remembers where the user left the window.
- The **DMG window** (the one with the app icon and the Applications shortcut) is a different thing: it is a Finder window of the disk image,
  and its fixed size and icon positions come from the setup script that forge generates.
