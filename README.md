# Xbox ROM Picker

A custom game launcher styled after the original Xbox 2001 dashboard, designed as a drop-in file picker replacement for [xemu](https://xemu.app/).

---

## Screenshots

The picker features animated rotating rings in the Xbox aesthetic, game cover art, full metadata display, and keyboard + mouse navigation.

---

## Project Structure

```
xbox-picker/
├── main.js                    # Electron main process
├── preload.js                 # Secure IPC bridge
├── renderer.html              # Full UI
├── config.json                # Developer configuration
├── package.json
├── xbox-picker-wrapper.sh     # xemu integration script
├── game-info.example.json     # Info file schema reference
└── themes/
    ├── xbox-original.json     # Default Xbox green theme
    └── neon-underground.json  # Example custom theme
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Test the picker

```bash
npm start
```

The picker looks for ROMs at `/home/xemu/games` by default. If the directory doesn't exist, it shows an error state. Selected game path is printed to stdout.

### 3. Build (optional)

```bash
npm run build:linux     # AppImage + .deb
npm run build:deb       # .deb only
```

---

## Developer Configuration (`config.json`)

| Key | Default | Description |
|-----|---------|-------------|
| `romsDirectory` | `/home/xemu/games` | Where to scan for ROM files |
| `infoFileSuffix` | `.xiso.info.json` | Suffix appended to ROM filename to find metadata |
| `supportedExtensions` | `[".iso", ".xiso", ".img", ".xbe"]` | ROM file types to list |
| `defaultTheme` | `xbox-original` | Theme filename (without `.json`) to load on startup |
| `window.width/height` | `1280 x 720` | Window dimensions |
| `window.fullscreen` | `false` | Launch fullscreen |
| `window.alwaysOnTop` | `true` | Keep above other windows |
| `window.frame` | `false` | Show/hide OS window chrome |
| `ui.gameColumns` | `4` | Number of columns in the game grid |
| `ui.animateBackground` | `true` | Animated ring background |
| `ui.showBootAnimation` | `true` | Xbox boot animation on launch |

---

## Game Metadata (`.json`)

When the picker scans your ROMs directory it automatically creates a `.json` file next to each ROM if one doesn't exist yet. For a ROM named `halo.iso` it will create `halo.iso.json`:

```json
{
  "_note": "Fill in any fields you want. All are optional.",
  "title":       "Halo: Combat Evolved",
  "description": "",
  "genre":       "",
  "year":        null,
  "publisher":   "",
  "developer":   "",
  "players":     "",
  "rating":      "",
  "region":      "",
  "coverArt":    ""
}
```

The `title` field is pre-filled from the filename. Edit any fields you want — empty strings and `null` values are ignored in the UI.

**Cover art** paths can be:
- Relative to `romsDirectory` (e.g., `"coverArt": "halo.png"`)
- Absolute paths (e.g., `"coverArt": "/home/xemu/games/art/halo.png"`)

Supported formats: PNG, JPEG, GIF, WebP.

---

## Theming

Themes live in the `themes/` directory as `.json` files. Users can switch themes at runtime via the dropdown in the top bar.

### Theme file format

```json
{
  "name": "My Custom Theme",
  "author": "Your Name",
  "description": "A short description",

  "colors": {
    "background":          "#07000f",
    "backgroundSecondary": "#0e0018",
    "panelBg":             "#120020",
    "panelBorder":         "#3d0060",
    "panelBorderGlow":     "#bf00ff",

    "accent":              "#bf00ff",
    "accentBright":        "#df44ff",
    "accentDim":           "#5c007a",
    "accentGlow":          "rgba(191, 0, 255, 0.4)",

    "textPrimary":         "#FFFFFF",
    "textSecondary":       "#cc66ff",
    "textMuted":           "#6a2080",
    "textOnAccent":        "#ffffff",

    "selectionBg":         "rgba(191, 0, 255, 0.2)",
    "selectionBorder":     "#bf00ff",

    "scrollbar":           "#bf00ff",
    "scrollbarTrack":      "#120020",

    "ringOuter":           "rgba(191, 0, 255, 0.06)",
    "ringMiddle":          "rgba(191, 0, 255, 0.10)",
    "ringInner":           "rgba(191, 0, 255, 0.05)",

    "buttonA":             "#00cc66",
    "buttonB":             "#ff3344",
    "buttonX":             "#0088ff",
    "buttonY":             "#ffcc00",

    "noArt":               "#120020",
    "noArtText":           "#5c007a"
  },

  "fonts": {
    "display": "'Orbitron', sans-serif",
    "body":    "'Exo 2', sans-serif",
    "mono":    "'Share Tech Mono', monospace"
  },

  "effects": {
    "scanlines":        true,
    "glowIntensity":    "1.2",
    "vignetteStrength": "0.7",
    "backgroundRings":  true
  }
}
```

Drop your theme `.json` into the `themes/` folder and it appears in the in-app dropdown immediately.

---

## xemu Integration

### Method 1 — Zenity wrapper (simplest)

xemu uses `zenity` on Linux for its native file dialog. Back up and replace it:

```bash
# Backup real zenity
sudo cp /usr/bin/zenity /usr/bin/zenity.real

# Make wrapper executable
chmod +x xbox-picker-wrapper.sh

# Install as zenity replacement
sudo cp xbox-picker-wrapper.sh /usr/local/bin/zenity
```

The wrapper script detects when xemu is requesting a file chooser, launches this picker, captures the selected path, and returns it to xemu.

### Method 2 — Flatpak xemu

If you're running xemu via Flatpak, use Flatseal to override the file chooser portal, or run xemu outside Flatpak.

### Method 3 — Direct / custom integration

The picker outputs the selected ROM path to stdout and exits with code `0`.
Cancelled selections exit with code `1`.

```bash
SELECTED=$(node_modules/.bin/electron .)
if [ $? -eq 0 ]; then
  echo "User selected: $SELECTED"
fi
```

---

## Keyboard Controls

| Key | Action |
|-----|--------|
| `←↑↓→` | Navigate game grid |
| `Enter` | Launch selected game |
| `Escape` | Cancel / close |
| `Ctrl+F` | Focus search box |

---

## License

MIT
