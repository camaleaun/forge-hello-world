#!/usr/bin/env bash
# Builds the hand-written native hello-forge into <out>/hello-forge (default: native/linux/build). Needs g++ and GTK 4 (libgtk-4-dev).
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Resolve the output folder before changing directory, so a relative path means "relative to where you ran this".
mkdir -p "${1:-$here/build}"
out="$(cd "${1:-$here/build}" && pwd)"
cd "$here"

if ! pkg-config --exists gtk4 2>/dev/null; then
  echo "error: pkg-config cannot find gtk4. On Debian/Ubuntu: sudo apt install g++ pkg-config libgtk-4-dev" >&2
  exit 1
fi

g++ -std=c++17 -Os -ffunction-sections -fdata-sections main.cpp $(pkg-config --cflags --libs gtk4) \
  -Wl,--gc-sections,--as-needed -s -o "$out/hello-forge"
echo "built $out/hello-forge"
