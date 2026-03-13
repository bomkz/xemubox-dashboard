#!/usr/bin/env bash
# install-portal.sh — Install the Xbox ROM Picker as an xdg-desktop-portal backend
#
# Run with --uninstall to remove.
# Safe: only touches files under ~/.local and ~/.config (no sudo needed).

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PICKER_SCRIPT="$SCRIPT_DIR/xbox-picker-portal"

PORTAL_DIR="$HOME/.local/share/xdg-desktop-portal/portals"
DBUS_SERVICE_DIR="$HOME/.local/share/dbus-1/services"
PORTAL_CONF_DIR="$HOME/.config/xdg-desktop-portal"
PORTAL_CONF="$PORTAL_CONF_DIR/portals.conf"
BACKUP_SUFFIX=".xbox-picker-backup"

# ── Uninstall ──────────────────────────────────────────────────────────────
if [[ "${1}" == "--uninstall" ]]; then
  echo "Uninstalling Xbox ROM Picker portal backend..."

  rm -f "$PORTAL_DIR/xbox-picker.portal"
  rm -f "$DBUS_SERVICE_DIR/org.freedesktop.impl.portal.desktop.xbox-picker.service"

  # Restore portals.conf backup if we made one
  if [[ -f "$PORTAL_CONF$BACKUP_SUFFIX" ]]; then
    mv "$PORTAL_CONF$BACKUP_SUFFIX" "$PORTAL_CONF"
    echo "Restored portals.conf from backup."
  else
    # Remove only the line we added
    if [[ -f "$PORTAL_CONF" ]]; then
      sed -i '/org.freedesktop.impl.portal.FileChooser=xbox-picker/d' "$PORTAL_CONF"
    fi
  fi

  # Restart portal
  systemctl --user restart xdg-desktop-portal 2>/dev/null || \
    pkill -x xdg-desktop-portal 2>/dev/null || true

  echo "Done. xdg-desktop-portal restarted."
  exit 0
fi

# ── Checks ─────────────────────────────────────────────────────────────────
echo "Checking dependencies..."

if ! python3 -c "import dbus" 2>/dev/null; then
  echo "ERROR: python3-dbus not found. Install with:"
  echo "  sudo apt install python3-dbus python3-gi"
  exit 1
fi
if ! python3 -c "from gi.repository import GLib" 2>/dev/null; then
  echo "ERROR: python3-gi not found. Install with:"
  echo "  sudo apt install python3-gi"
  exit 1
fi

echo "Dependencies OK."

# ── Make portal script executable ─────────────────────────────────────────
chmod +x "$PICKER_SCRIPT"

# ── Install portal config ──────────────────────────────────────────────────
mkdir -p "$PORTAL_DIR"
cp "$SCRIPT_DIR/xbox-picker.portal" "$PORTAL_DIR/xbox-picker.portal"
echo "Installed: $PORTAL_DIR/xbox-picker.portal"

# ── Install D-Bus service file ─────────────────────────────────────────────
mkdir -p "$DBUS_SERVICE_DIR"
sed "s|PLACEHOLDER_EXEC|$PICKER_SCRIPT|g" \
  "$SCRIPT_DIR/org.freedesktop.impl.portal.desktop.xbox-picker.service" \
  > "$DBUS_SERVICE_DIR/org.freedesktop.impl.portal.desktop.xbox-picker.service"
echo "Installed: $DBUS_SERVICE_DIR/org.freedesktop.impl.portal.desktop.xbox-picker.service"

# ── Configure portals.conf ─────────────────────────────────────────────────
mkdir -p "$PORTAL_CONF_DIR"

if [[ -f "$PORTAL_CONF" ]]; then
  # Backup existing config
  cp "$PORTAL_CONF" "$PORTAL_CONF$BACKUP_SUFFIX"
  echo "Backed up existing portals.conf to $PORTAL_CONF$BACKUP_SUFFIX"

  # Remove any existing FileChooser override line, then add ours
  sed -i '/org.freedesktop.impl.portal.FileChooser=/d' "$PORTAL_CONF"

  # Add under [preferred] section if it exists, else append
  if grep -q '^\[preferred\]' "$PORTAL_CONF"; then
    sed -i '/^\[preferred\]/a org.freedesktop.impl.portal.FileChooser=xbox-picker' "$PORTAL_CONF"
  else
    echo "" >> "$PORTAL_CONF"
    echo "[preferred]" >> "$PORTAL_CONF"
    echo "org.freedesktop.impl.portal.FileChooser=xbox-picker" >> "$PORTAL_CONF"
  fi
else
  cp "$SCRIPT_DIR/portals.conf" "$PORTAL_CONF"
fi
echo "Configured: $PORTAL_CONF"

# ── Restart xdg-desktop-portal ─────────────────────────────────────────────
echo "Restarting xdg-desktop-portal..."
systemctl --user restart xdg-desktop-portal 2>/dev/null || \
  pkill -x xdg-desktop-portal 2>/dev/null || true
sleep 1

echo ""
echo "✓ Xbox ROM Picker portal backend installed."
echo ""
echo "  The picker will now open instead of GNOME's file browser"
echo "  whenever any app requests a file dialog."
echo ""
echo "  To remove:  bash install-portal.sh --uninstall"
echo ""
echo "  To test now without rebooting, run xemu from this terminal:"
echo "    xemu"
