# The same hello, written by hand for Linux

`main.cpp` is the whole app: C++17 + GTK 4, no build system, no dependencies besides GTK. It is the twin of [`../macos/main.swift`](../macos/README.md) and does what `../../App.tsx` + `App.css` do
(without forge): a window (320x120 at first, resizable, 320x120 minimum) titled "Hello, forge", a label ("Press the button") and a "Greet" button that changes the label,
Ctrl+Q to quit, and the same command line (`--greet`, `--version`, `--help`, exit code 2 for unknown options) in the same binary.
The command line is handled before GTK starts, and the text colour is left to the theme, so dark mode works.

```sh
native/linux/build.sh              # builds native/linux/build/hello-forge
native/linux/build/hello-forge --greet
native/linux/build/hello-forge     # the window
```

`build.sh [out]` writes `<out>/hello-forge`; a relative `out` is relative to where you run the script.

## Dependencies (Debian and Ubuntu)
```sh
sudo apt install g++ pkg-config libgtk-4-dev
```
`build.sh` checks that `pkg-config` finds `gtk4` and says what to install when it does not. The program needs GTK 4 at run time.

## Side by side

| | forge version | hand-written C++ |
|---|---|---|
| What you write | `../../App.tsx` (25 lines) + `../../App.css` (10 lines) + `../../languages/pt-BR.lang` (7 lines) | `main.cpp` (88 lines) + `build.sh` (17 lines) |
| What gets compiled | about 1,700 lines of generated C++/CMake (not written by you) | the 88 lines above |
| Binary size (x86_64, `-Os`, stripped) | 96,872 bytes (CI, with the language support) | 14,544 bytes (CI) |
| Same source also runs | on macOS, in the browser preview (`forge start`), later Windows/web/mobile | Linux only |
| Languages | a dropdown, the choice is remembered, language packs are downloaded | English only |
| Packages | deb, rpm, tar.gz, snap, AppImage, desktop entry, AppStream data, icon | none: you get one binary |

The hand-written version stays at the 0.2 feature set (no language-download progress bar, no shortcut hint, no `@media` rule), so the forge column of this table does more than the native one.

The forge size is for the x86_64 build on `ubuntu-24.04`; the arm64 build is 88,440 bytes (hand-written: 14,544 bytes on x86_64, 10,224 bytes on arm64, as measured in CI).

### Why the arm64 build used to be larger: 4 KB alignment
An aarch64 linker aligns segments to 64 KB pages by default and pads the file to match, so the same program came out several times larger than on x86_64 (67,568 bytes against 14,544 for this one). Both builds now pass `-Wl,-z,max-page-size=4096 -Wl,-z,common-page-size=4096` (4 KB pages, what x86_64 already used), which dropped the hand-written arm64 binary to 10,224 bytes and the forge one from 133,472 to 88,440 bytes. Both link GTK 4 (and libsoup 3 for downloads) dynamically, like the hand-written one.
The macOS twin is compared in [`../macos/README.md`](../macos/README.md).

## What forge gives you that the manual version does not
- **A language dropdown** in the window (`<select language />`), remembered between runs, and the command line takes `--lang pt-BR`.
- **Downloadable language packs**: the app carries only English; each release publishes `hello-forge-<version>-pt-BR.lang` and the app downloads the pack it needs on first use (libsoup 3) and keeps it in its cache. Translating the manual versions means writing gettext or your own loader.
- **Packaging and updates**: deb, rpm, tar.gz, snap and AppImage from the same sources, plus the `latest.json` manifest for the updater.
- **One source for macOS and Linux**, and a live preview in the browser.

What the manual version gives you: full GTK 4 (any widget, any API), and the code you read is the code that runs.
