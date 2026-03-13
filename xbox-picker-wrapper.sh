#!/usr/bin/env bash
# xbox-picker-wrapper — Drop-in replacement for file picker dialogs in xemu
#
# This script launches the Xbox ROM Picker and captures the selected
# file path from stdout, then echoes it back (so xemu can read it).
#
# ── Integration Methods ────────────────────────────────────────────────────
#
# METHOD 1 — Zenity override (recommended for most setups):
#   Create a fake 'zenity' that calls this script and place it earlier in PATH.
#   xemu uses zenity for its file dialog on Linux.
#
#   sudo install -m755 xbox-picker-wrapper /usr/local/bin/zenity
#   (backup your real zenity first: sudo cp /usr/bin/zenity /usr/bin/zenity.real)
#
# METHOD 2 — Flatpak portal override:
#   If running xemu via Flatpak, see README.md for portal-based integration.
#
# METHOD 3 — Direct launch:
#   Launch this picker independently and pipe output to xemu.
#
# ──────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ELECTRON_APP="$SCRIPT_DIR"

# If called as zenity, check if it's a file chooser dialog call
# Zenity file chooser args typically include --file-selection
IS_FILE_CHOOSER=false
for arg in "$@"; do
  if [[ "$arg" == "--file-selection" || "$arg" == "--file-chooser" ]]; then
    IS_FILE_CHOOSER=true
    break
  fi
done

# If not a file chooser call (e.g., zenity --info), pass through to real zenity
if [[ "$IS_FILE_CHOOSER" == "false" && -x "/usr/bin/zenity.real" ]]; then
  exec /usr/bin/zenity.real "$@"
fi

# Launch the Xbox picker and capture the selected path
SELECTED="$(cd "$ELECTRON_APP" && npx electron . 2>/dev/null)"
EXIT_CODE=$?

if [[ $EXIT_CODE -eq 0 && -n "$SELECTED" ]]; then
  echo "$SELECTED"
  exit 0
else
  exit 1
fi
