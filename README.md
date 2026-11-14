# forge-hello-world

The smallest [forge](https://github.com/camaleaun/forge) app: one label, one button, one action.

- `forge.json`: window, widgets and CLI commands.
- `actions.ts`: what the button (and `--greet`) does.

Build it with a forge checkout (`.forge-ref` pins the commit CI uses):

```sh
FORGE_HOME=../forge ../forge/bin/forge build --out build/src
cmake -S build/src -B build/out && cmake --build build/out
build/out/hello.app/Contents/MacOS/hello --greet    # Hello, world!
open build/out/hello.app                            # the window
```

The binary is about 70 KB. Add `-DFORGE_UNIVERSAL=ON` to the configure step for an arm64 + x86_64 build.

## macOS and unsigned apps
Releases are not notarized yet. On first launch macOS may refuse to open the app: use System Settings > Privacy & Security > "Open Anyway".

## Tests
`npm test` runs the acceptance test (needs macOS, cmake and a forge checkout: `FORGE_HOME`, default `../forge`).

## License
MIT
