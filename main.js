const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// ─── Load developer config ────────────────────────────────────────────────────
const configPath = path.join(__dirname, 'config.json');
let config = {};
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.error('[xbox-picker] Failed to load config.json:', e.message);
  process.exit(1);
}

const ROMS_DIR        = config.romsDirectory    || '/home/xemu/games';
const INFO_SUFFIX     = config.infoFileSuffix   || '.xiso.info.json';
const SUPPORTED_EXTS  = config.supportedExtensions || ['.iso', '.xiso', '.img'];
const THEMES_DIR      = path.join(__dirname, 'themes');
const DEFAULT_THEME   = config.defaultTheme     || 'xbox-original';

// ─── Window ───────────────────────────────────────────────────────────────────
let mainWindow;

function createWindow() {
  const winCfg = config.window || {};
  mainWindow = new BrowserWindow({
    width:           winCfg.width      || 1280,
    height:          winCfg.height     || 720,
    fullscreen:      winCfg.fullscreen || false,
    alwaysOnTop:     winCfg.alwaysOnTop !== undefined ? winCfg.alwaysOnTop : true,
    frame:           winCfg.frame      !== undefined ? winCfg.frame : false,
    resizable:       true,
    backgroundColor: '#000000',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });

  mainWindow.loadFile('renderer.html');

  // Uncomment for debugging:
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('get-config', () => ({
  ...config,
  romsDirectory: ROMS_DIR,
  infoFileSuffix: INFO_SUFFIX,
}));

ipcMain.handle('get-theme', (_event, themeName) => {
  const name = themeName || DEFAULT_THEME;
  const themePath = path.join(THEMES_DIR, `${name}.json`);
  try {
    return JSON.parse(fs.readFileSync(themePath, 'utf8'));
  } catch {
    // Fall back to xbox-original
    try {
      return JSON.parse(fs.readFileSync(path.join(THEMES_DIR, 'xbox-original.json'), 'utf8'));
    } catch {
      return null;
    }
  }
});

ipcMain.handle('get-available-themes', () => {
  try {
    return fs.readdirSync(THEMES_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          const t = JSON.parse(fs.readFileSync(path.join(THEMES_DIR, f), 'utf8'));
          return { id: f.replace('.json', ''), name: t.name || f.replace('.json', ''), description: t.description || '' };
        } catch {
          return { id: f.replace('.json', ''), name: f.replace('.json', ''), description: '' };
        }
      });
  } catch {
    return [];
  }
});

ipcMain.handle('scan-games', () => {
  const games = [];
  try {
    if (!fs.existsSync(ROMS_DIR)) {
      console.warn('[xbox-picker] ROMs directory not found:', ROMS_DIR);
      return { games: [], error: `ROMs directory not found: ${ROMS_DIR}` };
    }

    const files = fs.readdirSync(ROMS_DIR, { withFileTypes: true });

    for (const entry of files) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!SUPPORTED_EXTS.includes(ext)) continue;

      const fullPath = path.join(ROMS_DIR, entry.name);
      const infoPath = fullPath + INFO_SUFFIX;

      // Base game object from filename
      const game = {
        id:       entry.name,
        filePath: fullPath,
        fileName: entry.name,
        title:    titleFromFilename(entry.name),
        hasInfo:  false,
      };

      // Enrich with info JSON if available — create stub if missing
      if (fs.existsSync(infoPath)) {
        try {
          const info = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
          Object.assign(game, info, {
            hasInfo:  true,
            filePath: fullPath,
            id:       entry.name,
          });
          if (game.coverArt && !path.isAbsolute(game.coverArt)) {
            game.coverArt = path.join(ROMS_DIR, game.coverArt);
          }
        } catch (e) {
          console.warn('[xbox-picker] Failed to parse info file:', infoPath, e.message);
        }
      } else {
        // Create a minimal stub so the user can fill it in
        const stub = {
          _note: "Fill in any fields you want. All are optional.",
          title:       game.title,
          description: "",
          genre:       "",
          year:        null,
          publisher:   "",
          developer:   "",
          players:     "",
          rating:      "",
          region:      "",
          coverArt:    ""
        };
        try {
          fs.writeFileSync(infoPath, JSON.stringify(stub, null, 2), 'utf8');
          console.log('[xbox-picker] Created info stub:', infoPath);
        } catch (e) {
          console.warn('[xbox-picker] Could not write info stub:', infoPath, e.message);
        }
      }

      games.push(game);
    }

    // Sort alphabetically by title
    games.sort((a, b) => a.title.localeCompare(b.title));
    return { games, error: null };
  } catch (e) {
    console.error('[xbox-picker] Scan error:', e.message);
    return { games: [], error: e.message };
  }
});

ipcMain.handle('load-cover-art', (_event, artPath) => {
  try {
    if (!artPath || !fs.existsSync(artPath)) return null;
    const ext  = path.extname(artPath).toLowerCase();
    const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' };
    const data = fs.readFileSync(artPath).toString('base64');
    return `data:${mime[ext] || 'image/png'};base64,${data}`;
  } catch {
    return null;
  }
});

ipcMain.handle('select-game', (_event, filePath) => {
  // Output selected ROM path to stdout for xemu / wrapper script integration
  process.stdout.write(filePath + '\n');
  setTimeout(() => app.quit(), 50);
  return true;
});

ipcMain.handle('cancel', () => {
  process.exit(1);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function titleFromFilename(filename) {
  return path.basename(filename, path.extname(filename))
    .replace(/[_\-\.]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}
