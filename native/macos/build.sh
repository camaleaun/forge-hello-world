#!/usr/bin/env bash
# Builds the hand-written native hello into <out>/hello.app (default: native/macos/build). Needs macOS and swiftc.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Resolve the output folder before changing directory, so a relative path means "relative to where you ran this".
mkdir -p "${1:-$here/build}"
out="$(cd "${1:-$here/build}" && pwd)"
cd "$here"
app="$out/hello.app"

rm -rf "$app"
mkdir -p "$app/Contents/MacOS"
swiftc -O -o "$app/Contents/MacOS/hello" main.swift
cat > "$app/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key><string>hello</string>
  <key>CFBundleIdentifier</key><string>local.native.hello</string>
  <key>CFBundleName</key><string>hello</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>0.1.0</string>
  <key>CFBundleVersion</key><string>0.1.0</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>NSPrincipalClass</key><string>NSApplication</string>
</dict>
</plist>
PLIST
codesign --force --deep -s - "$app"
echo "built $app"
