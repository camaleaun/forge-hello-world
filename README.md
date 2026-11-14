# forge-hello-world

The smallest [forge](https://github.com/camaleaun/forge) app: a label, a button and a command, written as a tiny web app.

- `package.json`: app name and version.
- `App.tsx`: the markup (`<window>`, `<text>`, `<button>`) and the behavior (`state`, handlers, CLI commands).
- `App.css`: the look (flex layout, sizes, colors).

```tsx
const message = state('Press the button');
function greet() { message.set('Hello, world!'); }
```

## Try it
With a forge checkout next to this repository (`../forge`, or set `FORGE_HOME`):

```sh
../forge/bin/forge start                      # live preview in the browser (add --lan for your phone)
../forge/bin/forge build --out build/src      # generate the native sources
cmake -S build/src -B build/out && cmake --build build/out
build/out/hello.app/Contents/MacOS/hello --greet   # Hello, world!
open build/out/hello.app                           # the window
```

The binary is about 73 KB. Add `-DFORGE_UNIVERSAL=ON` to the configure step for an arm64 + x86_64 build.
`.forge-ref` pins the forge commit that CI and releases use.

## macOS and unsigned apps
Releases are not notarized yet. On first launch macOS may refuse to open the app: use System Settings > Privacy & Security > "Open Anyway".

## Tests
`npm test` runs the acceptance test (needs macOS, cmake and a forge checkout) and lints the workflows.

## License
MIT
