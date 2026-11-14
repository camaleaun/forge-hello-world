<p align="center"><img src="icon.svg" alt="hello icon" width="128"></p>

# forge-hello-world

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
build/out/hello.app/Contents/MacOS/hello --greet   # Hello, world!
open build/out/hello.app                           # the window
```

The binary is about 73 KB. Add `-DFORGE_UNIVERSAL=ON` to the configure step for an arm64 + x86_64 build.
`.forge-ref` pins the forge commit that CI and releases use.

## macOS signing and notarization
Without secrets, releases are signed ad-hoc and not notarized: on first launch macOS may refuse to open the app
(System Settings > Privacy & Security > "Open Anyway", or `xattr -dr com.apple.quarantine /Applications/hello.app`).

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
