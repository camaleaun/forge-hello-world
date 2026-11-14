#!/usr/bin/env bash
# Starts a hello-forge binary under a (virtual) X11 display, looks at its window and clicks the Greet button.
#
# Usage: linux-window.sh <binary> <label> [pack-cache-dir]
#   binary          the hello-forge executable to start
#   label           "forge" (generated from App.tsx) or "native" (hand-written, native/linux); names the screenshots
#   pack-cache-dir  forge build only: a language pack cache; when given, the app is started again in Portuguese,
#                   and once more with an empty cache and a slow local server (FORGE_I18N_BASE_URL) so the
#                   progress bar can be looked at while the pack downloads
#
# Environment:
#   SHOTS_DIR       where the screenshots go (default ./shots)
#   BUTTON_Y_OFFSET extra pixels between the top of the window and the label (default 46 for "forge", 0 otherwise)
#
# Run it under a display and a session bus, for example:
#   xvfb-run -a -s '-screen 0 1280x800x24' dbus-run-session -- bash test/gui/linux-window.sh build/hello-forge forge
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <binary> <label> [pack-cache-dir]" >&2
  exit 2
fi

binary="$1"
label="$2"
pack_cache="${3:-}"
SHOTS_DIR="${SHOTS_DIR:-./shots}"
mkdir -p "$SHOTS_DIR"

export GDK_BACKEND=x11
export LC_ALL=C.UTF-8

# Where the Greet button is, from the layout in App.css (window: padding 20px; gap 12px):
#
#   +----------------------------+  y = 0
#   | padding 20                 |
#   |   [ language dropdown ]    |  forge only: its height + gap 12 is BUTTON_Y_OFFSET (34 + 12 = 46)
#   |   (progress bar)           |  forge only: hidden, so it takes no space and no gap, until a pack downloads
#   |   Press the button         |  label, 15px font: LABEL_HEIGHT 20
#   |   gap 12                   |
#   |   [      Greet      ]      |  button, width 120: BUTTON_WIDTH, BUTTON_HEIGHT 34
#   |   gap 12                   |
#   |   Quit with Ctrl+Q         |  forge only: the hint, 12px font; below the button, so it moves nothing above it
#   +----------------------------+
#
#   click_x = padding + half the button width            = 20 + 120 / 2 = 80
#   click_y = padding + label + gap + half the button height (+ the dropdown on the forge version)
#           = 20 + 20 + 12 + 34 / 2 (+ 46)               = 69 (115 on the forge version)
PADDING=20
GAP=12
LABEL_HEIGHT=20
BUTTON_WIDTH=120
BUTTON_HEIGHT=34
if [ "$label" = forge ]; then default_offset=46; else default_offset=0; fi
BUTTON_Y_OFFSET="${BUTTON_Y_OFFSET:-$default_offset}"
click_x=$(( PADDING + BUTTON_WIDTH / 2 ))
click_y=$(( PADDING + LABEL_HEIGHT + GAP + BUTTON_HEIGHT / 2 + BUTTON_Y_OFFSET ))

app=""
stop_app() {
  if [ -n "$app" ] && kill -0 "$app" 2>/dev/null; then
    kill "$app" 2>/dev/null || true
    wait "$app" 2>/dev/null || true
  fi
  app=""
}
trap stop_app EXIT

fail() { echo "FAIL ($label): $*" >&2; exit 1; }

# Prints the id of the window with this exact title; fails if it does not appear within 20 seconds.
wait_for_window() {
  local title="$1" id
  id="$(timeout 20 xdotool search --sync --name "$title" | head -n 1)" || true
  [ -n "$id" ] || fail "no window titled '$title' within 20 s"
  echo "$id"
}

# The pixels that differ between two screenshots (compare exits 1 when there are some, so its status is ignored).
pixel_difference() { compare -metric AE "$1" "$2" null: 2>&1 || true; }

start_app() { "$binary" >/dev/null 2>&1 & app=$!; }

# --- English: window, geometry, click ------------------------------------------------------------
start_app
window="$(wait_for_window '^Hello, forge$')"
sleep 1

eval "$(xdotool getwindowgeometry --shell "$window")"
echo "$label window $window: ${WIDTH}x${HEIGHT}"
[ "$WIDTH" -ge 320 ] || fail "width $WIDTH < 320"
if [ "$label" = forge ]; then min_height=170; else min_height=120; fi
[ "$HEIGHT" -ge "$min_height" ] || fail "height $HEIGHT < $min_height"

before="$SHOTS_DIR/$label-before.png"
after="$SHOTS_DIR/$label-after.png"
import -window "$window" "$before"

click() { xdotool mousemove --window "$window" "$1" "$2" click 1; sleep 1; import -window "$window" "$after"; }
click "$click_x" "$click_y"
changed="$(pixel_difference "$before" "$after")"
if [ "$changed" = 0 ]; then
  # The computed spot missed (a title bar or a different font size moves everything): scan down the button column
  # so the run says where the button really is, and report it; the computed spot above stays the documented one.
  for y in $(seq 20 8 $(( HEIGHT - 8 ))); do
    click "$click_x" "$y"
    changed="$(pixel_difference "$before" "$after")"
    if [ "$changed" != 0 ]; then echo "$label: the click at y=$click_y missed, y=$y worked"; break; fi
  done
fi
echo "$label: $changed pixels changed after the click at ($click_x, $click_y)"
[ "$changed" -gt 0 ] || fail "the label did not change after clicking Greet (0 pixels differ)"
stop_app

# --- Portuguese (forge build with a language pack cache) -------------------------------------------
if [ "$label" = forge ] && [ -n "$pack_cache" ]; then
  FORGE_LANG_PREFERENCE=pt-BR FORGE_I18N_CACHE_DIR="$pack_cache" "$binary" >/dev/null 2>&1 &
  app=$!
  window="$(wait_for_window '^Olá, forge$')"
  [ "$(xdotool getwindowname "$window")" = 'Olá, forge' ] || fail "the window is not titled 'Olá, forge'"
  sleep 1
  import -window "$window" "$SHOTS_DIR/pt-BR.png"
  echo "forge: translated title 'Olá, forge' found"
  stop_app
fi

# --- Download in progress: the progress bar is visible only while a language pack downloads ---------
if [ "$label" = forge ] && [ -n "$pack_cache" ]; then
  pack="$(ls "$pack_cache"/*.lang | head -n 1)"
  port_file="$(mktemp)"
  empty_cache="$(mktemp -d)"
  python3 "$(dirname "$0")/slow-pack-server.py" "$pack" "$port_file" 12 &
  server=$!
  for _ in $(seq 1 50); do [ -s "$port_file" ] && break; sleep 0.1; done
  [ -s "$port_file" ] || { kill "$server" 2>/dev/null || true; fail "the slow pack server did not start"; }
  FORGE_I18N_TIMEOUT_MS=60000 FORGE_LANG_PREFERENCE=pt-BR FORGE_I18N_CACHE_DIR="$empty_cache" FORGE_I18N_BASE_URL="http://127.0.0.1:$(cat "$port_file")/" "$binary" >/dev/null 2>&1 &
  app=$!
  window="$(wait_for_window '^Hello, forge$')"
  sleep 4
  import -window "$window" "$SHOTS_DIR/downloading.png"
  shown="$(pixel_difference "$before" "$SHOTS_DIR/downloading.png")"
  echo "forge: $shown pixels differ while the pack downloads (the progress bar is visible)"
  [ "$shown" -gt 0 ] || { kill "$server" 2>/dev/null || true; fail "the progress bar did not appear while the pack downloaded"; }
  window="$(wait_for_window '^Olá, forge$')"
  echo "forge: the downloaded pack was applied (title 'Olá, forge')"
  sleep 1
  import -window "$window" "$SHOTS_DIR/downloaded.png"
  idle="$(pixel_difference "$SHOTS_DIR/pt-BR.png" "$SHOTS_DIR/downloaded.png")"
  echo "forge: $idle pixels differ between the cached pt-BR window and the downloaded one (0 = the bar is hidden again)"
  stop_app
  kill "$server" 2>/dev/null || true
  wait "$server" 2>/dev/null || true
fi

# --- Side by side, when both builds have been looked at ---------------------------------------------
if [ -f "$SHOTS_DIR/forge-after.png" ] && [ -f "$SHOTS_DIR/native-after.png" ]; then
  # No labels: they need a default font the runners do not have. Native is on the left, forge on the right.
  montage "$SHOTS_DIR/native-after.png" "$SHOTS_DIR/forge-after.png" \
    -tile 2x1 -geometry +10+10 -background white "$SHOTS_DIR/compare.png" || echo "montage failed; the checks above are what matter"
fi
echo "OK ($label): screenshots in $SHOTS_DIR"
