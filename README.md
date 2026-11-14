<p align="center"><img src="icon.svg" alt="hello-forge icon" width="128"></p>

# forge-hello-world

The app is called **hello-forge** (`hello` is too generic and may clash with other programs). The window title "Hello, forge" and this repository's name stay.

The smallest [forge](https://github.com/camaleaun/forge) app: a label, a button and a command, written as a tiny web app.

- `package.json`: app name and version.
- `App.tsx`: the markup (`<window>`, `<text>`, `<button>`) and the behavior (`state`, handlers, CLI commands).
- `App.css`: the look (flex layout, sizes, colors).
- `icon.svg`: the app icon (forge turns it into `AppIcon.icns`).

```tsx
const message = state('Press the button');
function greet() { message.set('Hello, world!'); }
```

The same app written by hand in Swift + AppKit is in [`native/macos`](native/macos) so you can compare the code, the size and what forge adds.

## Try it
With a forge checkout next to this repository (`../forge`, or set `FORGE_HOME`):

```sh
../forge/bin/forge start                      # live preview in the browser (open the URL it prints on your phone; add --local to keep it on this Mac)
../forge/bin/forge build --out build/src      # generate the native sources
cmake -S build/src -B build/out && cmake --build build/out
build/out/hello-forge.app/Contents/MacOS/hello-forge --greet   # Hello, world!
open build/out/hello-forge.app                       # the window
```

The binary is about 73 KB. Add `-DFORGE_UNIVERSAL=ON` to the configure step for an arm64 + x86_64 build.
`.forge-ref` pins the forge commit that CI and releases use.

## Migrating from `hello` (0.2.0-rc.1)
Version 0.2.0-rc.2 renames the app. `hello-forge.app` is a different app from `hello.app`: it has another bundle id (`local.forge.hello-forge`), so the remembered language and the language-pack cache start empty. Delete the old `hello.app` when you no longer need it. The release `v0.2.0-rc.1` keeps its `hello-*` files.

## Languages

The app is written in English and has one translation, `languages/pt-BR.lang` (one `English<TAB>translation` per line). The window has a language dropdown; the choice is remembered. The app itself carries only English: each release also publishes the language pack (`hello-forge-<version>-pt-BR.lang`) and the app downloads the one it needs on first use, then keeps it in its cache. Offline, it stays in English.

To turn downloads off, set `"forge": { "i18n": { "download": false } }` in `package.json`. The command line takes `--lang pt-BR` (cache only, no network).

## macOS signing and notarization
Without secrets, releases are signed ad-hoc and not notarized: on first launch macOS may refuse to open the app
(System Settings > Privacy & Security > "Open Anyway", or `xattr -dr com.apple.quarantine /Applications/hello-forge.app`).

To ship signed and notarized builds, add these repository secrets (Settings > Secrets and variables > Actions).
The release workflow uses them automatically through `forge/scripts/macos-sign.sh`; nothing else changes.

| Secret | What it is |
|---|---|
| `MACOS_CERTIFICATE_P12` | base64 of your "Developer ID Application" certificate exported as `.p12` (`base64 -i cert.p12 \| pbcopy`) |
| `MACOS_CERTIFICATE_PASSWORD` | the password you set when exporting the `.p12` |
| `MACOS_SIGNING_IDENTITY` | e.g. `Developer ID Application: Your Name (TEAMID)` |
| `NOTARY_KEY_P8` | base64 of the App Store Connect API key (`AuthKey_XXXX.p8`) |
| `NOTARY_KEY_ID` | the API key id |
| `NOTARY_ISSUER_ID` | the API issuer id |

It needs a paid Apple Developer account. The app and the `.dmg` are signed with the hardened runtime, submitted to `notarytool` and stapled.

## Tests
`npm test` runs the acceptance test (needs macOS, cmake and a forge checkout) and lints the workflows.

## License
MIT
